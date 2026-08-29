/**
 * Pinterest 适配器
 * 支持 Pinterest SSR Pin 数据解析、图片 Pin 识别与嵌入第三方视频源提取
 */

const { validateUrl, secureHttpsGet } = require("../net-guard");

function match(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    return host === 'pinterest.com' || host.endsWith('.pinterest.com') || host === 'pin.it';
  } catch {
    return false;
  }
}

function getSiteArgs() {
  return [
    '--referer', 'https://www.pinterest.com/',
    '--add-header', 'User-Agent:Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ];
}

function fetchWithRedirect(url, maxRedirects = 5) {
  return new Promise(async (resolve) => {
    if (maxRedirects <= 0) return resolve(null);
    try {
      const u = new URL(url);
      const req = await secureHttpsGet(
        url,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        },
        async (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            let redirectUrl = res.headers.location;
            if (redirectUrl.startsWith("/")) {
              redirectUrl = `${u.protocol}//${u.host}${redirectUrl}`;
            }
            try {
              await validateUrl(redirectUrl);
              return fetchWithRedirect(redirectUrl, maxRedirects - 1).then(resolve);
            } catch (err) {
              return resolve(null);
            }
          }
          let html = "";
          res.on("data", (chunk) => (html += chunk));
          res.on("end", () => resolve(html));
        }
      );
      req.on("error", () => resolve(null));
      req.setTimeout(8000, () => {
        req.destroy();
        resolve(null);
      });
    } catch (e) {
      resolve(null);
    }
  });
}

/**
 * 抓取网页 HTML 内容
 */
async function fetchPageHtml(url) {
  await validateUrl(url);
  return await fetchWithRedirect(url);
}

/**
 * 从 Pinterest 页面 SSR 数据中提取 pin 完整元数据
 */
async function extractPinterestPinData(pinterestUrl) {
  try {
    const html = await fetchPageHtml(pinterestUrl);
    if (!html) return null;

    const pinIdMatch = pinterestUrl.match(/pin\/([\d]+)/);
    const pinId = pinIdMatch ? pinIdMatch[1] : null;

    const result = {
      isVideo: false,
      videos: null,
      imageUrl: null,
      title: '',
      description: '',
      link: null,
      sourceUrl: null,
    };

    if (pinId) {
      const entityIdx = html.indexOf(`"entityId":"${pinId}"`);
      if (entityIdx !== -1) {
        const start = Math.max(0, entityIdx - 3000);
        const end = Math.min(html.length, entityIdx + 3000);
        const context = html.substring(start, end);

        const isVideoMatch = context.match(/"isVideo"\s*:\s*(true|false)/);
        if (isVideoMatch) result.isVideo = isVideoMatch[1] === 'true';

        const videosMatch = context.match(/"videos"\s*:\s*(null|\{)/);
        if (videosMatch && videosMatch[1] !== 'null') result.videos = true;

        const descMatch = context.match(/"description"\s*:\s*"([^"]{0,500})"/);
        if (descMatch) result.description = descMatch[1];

        const titleMatch = context.match(/"seoTitle"\s*:\s*"([^"]{0,200})"/);
        if (titleMatch && titleMatch[1]) result.title = titleMatch[1];

        const linkMatch = context.match(/"link"\s*:\s*"([^"]+)"/);
        if (linkMatch) result.link = linkMatch[1];
      }
    }

    if (pinId) {
      const entityIdx = html.indexOf(`"entityId":"${pinId}"`);
      if (entityIdx !== -1) {
        const imgSearchStart = Math.max(0, entityIdx - 8000);
        const imgSearchEnd = Math.min(html.length, entityIdx + 8000);
        const imgContext = html.substring(imgSearchStart, imgSearchEnd);
        
        const origMatch = imgContext.match(/https:\/\/i\.pinimg\.com\/originals\/([a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]+\.(?:jpg|png|gif|webp))/i);
        if (origMatch) {
          result.imageUrl = `https://i.pinimg.com/originals/${origMatch[1]}`;
        } else {
          const anyMatch = imgContext.match(/https:\/\/i\.pinimg\.com\/(?:1200x|736x|564x|474x|236x|136x136|60x60|600x315)\/([a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]+\.(?:jpg|png|gif|webp))/i);
          if (anyMatch) {
            result.imageUrl = `https://i.pinimg.com/originals/${anyMatch[1]}`;
          }
        }
      }
    }

    if (!result.imageUrl) {
      const originalsMatch = html.match(/https:\/\/i\.pinimg\.com\/originals\/[a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]+\.(?:jpg|png|gif|webp)/i);
      if (originalsMatch) {
        result.imageUrl = originalsMatch[0];
      } else {
        const anyImgMatch = html.match(/https:\/\/i\.pinimg\.com\/(?:1200x|736x|564x|474x)\/([a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]+\.(?:jpg|png|gif|webp))/i);
        if (anyImgMatch) {
          result.imageUrl = `https://i.pinimg.com/originals/${anyImgMatch[1]}`;
        }
      }
    }

    const sourceMatches = html.match(
      /https:\/\/[^\s"'<>\\]*?(?:instagram\.com|youtube\.com|vimeo\.com|tiktok\.com)[^\s"'<>\\]*/gi
    );
    if (sourceMatches && sourceMatches.length > 0) {
      let cleanUrl = sourceMatches[0].replace(/\\\/|\\/g, "/");
      cleanUrl = cleanUrl.replace(/\\u0026/g, "&");
      result.sourceUrl = cleanUrl;
    }

    if (!result.title && result.description) {
      result.title = result.description.split('\n')[0].substring(0, 100);
    }
    if (!result.title) result.title = 'Pinterest Pin';

    return result;
  } catch (e) {
    return null;
  }
}

/**
 * 自定义获取 Pinterest 信息（处理纯图片与第三方源嵌入）
 */
async function customGetInfo(url, { execYtDlp, parseYtDlpOutput, getSiteArgsForUrl }) {
  const pinData = await extractPinterestPinData(url);
  if (!pinData) return null;

  const hasVideoContent = pinData.isVideo || pinData.videos;
  const hasVideoSource = !!pinData.sourceUrl;

  // 纯图片 Pin
  if (!hasVideoContent && !hasVideoSource && pinData.imageUrl) {
    return {
      type: 'image',
      imageUrl: pinData.imageUrl,
      title: pinData.title || 'Pinterest Pin',
      description: pinData.description || '',
      duration: 0,
      thumbnail: pinData.imageUrl,
      uploader: 'Pinterest',
      extractor: 'pinterest',
      webpage_url: url,
      id: null,
    };
  }

  // 带有第三方视频源（例如 Instagram/YouTube/TikTok 等）
  if (hasVideoSource && !hasVideoContent) {
    const targetUrl = pinData.sourceUrl.replace(/\?img_index=\d+/, "");
    await validateUrl(targetUrl);
    const args = ["--dump-json", "--no-warnings", ...getSiteArgsForUrl(targetUrl), targetUrl];
    try {
      const output = await execYtDlp(args);
      return parseYtDlpOutput(output, targetUrl);
    } catch (e) {
      if (pinData.imageUrl) {
        return {
          type: 'image',
          imageUrl: pinData.imageUrl,
          title: pinData.title || 'Pinterest Pin',
          description: pinData.description || '',
          duration: 0,
          thumbnail: pinData.imageUrl,
          uploader: 'Pinterest',
          extractor: 'pinterest',
          webpage_url: url,
          id: null,
        };
      }
      throw e;
    }
  }

  return null;
}

/**
 * 处理 Pinterest "No video formats found" 降级
 */
async function handleExecFailure({ stderr, args, onProgress, onOutput, execYtDlp, hasCookieConsent, getSiteArgsForUrl, url }) {
  const isNoFormats = stderr.includes("No video formats found") || stderr.includes("[Pinterest]") || stderr.includes("login") || stderr.includes("redirect");
  if (!isNoFormats) return null;

  const alreadyTriedSource = args.some(a => typeof a === 'string' && (a.includes('instagram.com') || a.includes('youtube.com') || a.includes('vimeo.com') || a.includes('tiktok.com')));
  let extractedSourceUrl = null;

  if (!alreadyTriedSource) {
    let sourceUrl = await extractPinterestPinData(url).then(d => d?.sourceUrl ?? null);
    if (sourceUrl) {
      sourceUrl = sourceUrl.replace(/\?img_index=\d+/, "");
      extractedSourceUrl = sourceUrl;

      const oldSiteArgs = getSiteArgs();
      let cleanedArgs = args.filter(a => !oldSiteArgs.includes(a) && a !== "--cookies-from-browser" && a !== "chrome");
      const newSiteArgs = getSiteArgsForUrl(sourceUrl);

      const newArgs = cleanedArgs.map(a => a === url ? sourceUrl : a);
      newArgs.push(...newSiteArgs);

      try {
        return await execYtDlp(newArgs, onProgress, onOutput, false);
      } catch (e) {
        if (hasCookieConsent()) {
          try {
            return await execYtDlp([...newArgs, "--cookies-from-browser", "chrome"], onProgress, onOutput, false);
          } catch (e2) {}
        }
      }
    }
  }

  if (!extractedSourceUrl && hasCookieConsent()) {
    const alreadyTriedCookies = args.includes("--cookies-from-browser");
    if (!alreadyTriedCookies) {
      try {
        return await execYtDlp([...args, "--cookies-from-browser", "chrome"], onProgress, onOutput, false);
      } catch (e) {}
    }
  }

  return null;
}

module.exports = {
  match,
  getSiteArgs,
  customGetInfo,
  handleExecFailure,
};
