/**
 * Pinterest 适配器
 * 支持 Pinterest SSR Pin 数据解析、图片 Pin 识别与嵌入第三方视频源提取
 */

const { validateUrl, assertHostAllowed, secureHttpsGet } = require("../net-guard");

/**
 * Pinterest 派生源允许的平台域名白名单（精确主机/子域匹配）。
 * 审核要求：派生 URL 必须严格限制在已批准平台，不得使用全 URL 文本子串匹配。
 */
const DERIVED_SOURCE_DOMAINS = ['instagram.com', 'youtube.com', 'youtu.be', 'vimeo.com', 'tiktok.com'];

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
              // 重定向目标严格限制在 Pinterest 域名（防 open-redirect 跳到任意公网主机）
              assertHostAllowed(redirectUrl, ['pinterest.com', 'pin.it', 'pinimg.com']);
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
 * 从 HTML 上下文中安全提取派生源 URL。
 * 搜索窗口限定在 pin 实体周围 ±8000 字符（对齐 imageUrl 提取范围），
 * 不扫描全页 HTML，防止用户可控内容注入。
 *
 * 每个候选 URL 先清洗转义，再用 new URL() 精确解析 hostname，
 * 最后通过 assertHostAllowed 白名单校验。返回第一个通过校验的 URL，
 * 若无符合条件的候选则返回 null。
 *
 * @param {string} html  Pinterest 页面 HTML
 * @param {string|null} pinId  从 URL 中提取的 Pin ID（用于收缩搜索窗口）
 * @returns {string|null}
 */
function pickDerivedSourceUrl(html, pinId) {
  // 收缩搜索窗口到 pin 上下文，避免扫全页
  let searchArea = html;
  if (pinId) {
    const entityIdx = html.indexOf(`"entityId":"${pinId}"`);
    if (entityIdx !== -1) {
      const start = Math.max(0, entityIdx - 8000);
      const end = Math.min(html.length, entityIdx + 8000);
      searchArea = html.substring(start, end);
    }
  }

  // Pinterest SSR JSON 中的 \/ 先统一转换为 /，使标准 URL 正则可同时匹配转义与非转义两种形式
  // （正则字面量中 \\ 后接 / 会被解析器误认为闭合，所以改用预处理而非复杂正则）
  const normalizedArea = searchArea.replace(/\\\//g, '/');
  // 取出所有 https:// 开头的候选 URL（停在空白/引号/尖括号/反斜杠前）
  const candidates = normalizedArea.match(/https:\/\/[^\s"'<>\\]+/gi);
  if (!candidates) return null;

  for (const raw of candidates) {
    // 清洗残余转义字符（预处理后 \/ 已消除，此处仅处理 \\u0026 等其它转义）
    const cleaned = raw.replace(/\\\/|\\/g, '/').replace(/\\u0026/g, '&');
    try {
      // 精确 hostname 白名单校验（抛出则跳过）
      assertHostAllowed(cleaned, DERIVED_SOURCE_DOMAINS);
      return cleaned;
    } catch {
      // 不在白名单，继续尝试下一个候选
    }
  }
  return null;
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

    result.sourceUrl = pickDerivedSourceUrl(html, pinId);

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
    // 派生 URL 必须通过白名单校验（精确主机匹配）再经 validateUrl（SSRF 保护）
    assertHostAllowed(targetUrl, DERIVED_SOURCE_DOMAINS);
    await validateUrl(targetUrl);
    const args = ["--dump-json", "--no-warnings", ...getSiteArgsForUrl(targetUrl), targetUrl];
    try {
      const output = await execYtDlp(args, null, null, { targetUrl });
      const info = parseYtDlpOutput(output, targetUrl);
      // 标记此结果来自 Pinterest 派生源，便于下游 downloadVideo 复检白名单
      info.derivedFrom = 'pinterest';
      return info;
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
 * 处理 Pinterest "No video formats found" 降级。
 * 收紧了触发条件（移除宽泛的 "login" / "redirect" 匹配），
 * 派生 sourceUrl 进入 yt-dlp 前必须通过白名单校验与 validateUrl，
 * 派生域名的 Cookie 使用需通过 requestCookieConsent 弹窗确认。
 */
async function handleExecFailure({ stderr, args, onProgress, onOutput, execYtDlp, hasCookieConsent, authorizeCookies, getSiteArgsForUrl, url }) {
  // 收紧触发条件：仅在明确的 Pinterest 格式问题时尝试降级
  const isNoFormats = stderr.includes("No video formats found") || stderr.includes("[Pinterest]");
  if (!isNoFormats) return null;

  // 判断本次 args 是否已包含白名单平台域名的目标 URL（已是派生请求，不再重复降级）
  const alreadyTriedSource = (() => {
    try {
      return args.some(a => {
        if (typeof a !== 'string' || !a.startsWith('https')) return false;
        const host = new URL(a).hostname.toLowerCase();
        return DERIVED_SOURCE_DOMAINS.some(d => host === d || host.endsWith('.' + d));
      });
    } catch {
      return false;
    }
  })();

  let extractedSourceUrl = null;

  if (!alreadyTriedSource) {
    let sourceUrl = await extractPinterestPinData(url).then(d => d?.sourceUrl ?? null);
    if (sourceUrl) {
      sourceUrl = sourceUrl.replace(/\?img_index=\d+/, "");

      // 派生 URL 必须通过白名单校验与 SSRF 保护，任一失败则放弃降级
      try {
        assertHostAllowed(sourceUrl, DERIVED_SOURCE_DOMAINS);
        await validateUrl(sourceUrl);
      } catch {
        return null;
      }

      extractedSourceUrl = sourceUrl;

      const oldSiteArgs = getSiteArgs();
      const cleanedArgs = args.filter(a => !oldSiteArgs.includes(a) && a !== "--cookies-from-browser" && a !== "chrome");
      const newSiteArgs = getSiteArgsForUrl(sourceUrl);

      // 将 args 中的原 url 替换为派生 sourceUrl
      const newArgs = cleanedArgs.map(a => a === url ? sourceUrl : a);
      newArgs.push(...newSiteArgs);

      try {
        return await execYtDlp(newArgs, onProgress, onOutput, { allowRecovery: false, targetUrl: sourceUrl });
      } catch (e) {
        // 派生域名 Cookie 重试：authorizeCookies 整合开关+弹窗+缓存，弹窗显示 'derived' 措辞
        if (await authorizeCookies(sourceUrl, 'derived')) {
          try {
            return await execYtDlp([...newArgs, "--cookies-from-browser", "chrome"], onProgress, onOutput, { allowRecovery: false, targetUrl: sourceUrl });
          } catch (e2) {}
        }
      }
    }
  }

  // 对 Pinterest 本身的 Cookie 重试（无派生源情况）：同样需要用户逐域名授权
  if (!extractedSourceUrl && !args.includes("--cookies-from-browser") && await authorizeCookies(url, 'direct')) {
    try {
      return await execYtDlp([...args, "--cookies-from-browser", "chrome"], onProgress, onOutput, { allowRecovery: false, targetUrl: url });
    } catch (e) {}
  }

  return null;
}

/**
 * 校验 URL 是否属于 Pinterest 允许的派生平台域名。
 * 在 downloadVideo 阶段对 yt-dlp 返回的 webpage_url 复检，
 * 确保「派生 URL 严格限制在已批准平台」的声明端到端成立。
 * @param {string} url  待检查的完整 URL
 * @throws {Error} code='ENETBOUNDARY' 当 hostname 不在 DERIVED_SOURCE_DOMAINS 列表时
 */
function assertDerivedHostAllowed(url) {
  assertHostAllowed(url, DERIVED_SOURCE_DOMAINS);
}

module.exports = {
  match,
  getSiteArgs,
  customGetInfo,
  handleExecFailure,
  pickDerivedSourceUrl,
  assertDerivedHostAllowed,
};
