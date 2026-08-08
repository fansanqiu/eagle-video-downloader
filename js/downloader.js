/**
 * 视频下载模块
 * 处理视频下载核心逻辑
 */

const path = require("path");
const fs = require("fs");
const os = require("os");
const https = require("https");
const { spawn } = require("child_process");
const i18next = require("i18next");

const { getYtDlpPath, getFfmpegPath, BIN_DIR, downloadYtDlp } = require("./binary");
const { isPrivateIp, validateUrl } = require("./net-guard");

// Cookie 显式授权状态
let cookieConsentGranted = false;

function setCookieConsent(granted) {
  cookieConsentGranted = Boolean(granted);
}

function hasCookieConsent() {
  return cookieConsentGranted;
}

/**
 * 校验 URL 目标域名（精确与子域名匹配）
 */
function matchDomain(url, domains) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return domains.some(d => host === d || host.endsWith('.' + d));
  } catch {
    return false;
  }
}

function isPinterestDomain(url) {
  return matchDomain(url, ['pinterest.com', 'pin.it']);
}

function isInstagramDomain(url) {
  return matchDomain(url, ['instagram.com']);
}

/**
 * 判断 spawn 错误是否表示二进制文件本身已损坏
 */
function isCorruptedBinaryError(error) {
  return error.code === "EBADMACHO" || error.code === "ENOEXEC" || error.errno === -88;
}

/**
 * 执行 yt-dlp 命令
 */
function execYtDlp(args, onProgress, onOutput, allowRecovery = true) {
  return new Promise((resolve, reject) => {
    const ytdlp = getYtDlpPath();

    if (!fs.existsSync(ytdlp)) {
      reject(new Error(i18next.t("error.ytdlpNotInstalled")));
      return;
    }

    if (os.platform() !== 'win32') {
      try { fs.chmodSync(ytdlp, '755'); } catch (e) {}
    }

    const recoverFromCorruptBinary = (error) => {
      try { fs.unlinkSync(ytdlp); } catch (e) {}
      downloadYtDlp()
        .then(() => execYtDlp(args, onProgress, onOutput, false))
        .then(resolve)
        .catch(() => reject(new Error(`${i18next.t("error.failedToExecuteYtdlp")}: ${error.message}`)));
    };

    let proc;
    try {
      proc = spawn(ytdlp, args, { cwd: BIN_DIR });
    } catch (error) {
      if (allowRecovery && isCorruptedBinaryError(error)) {
        recoverFromCorruptBinary(error);
        return;
      }
      reject(new Error(`${i18next.t("error.failedToExecuteYtdlp")}: ${error.message}`));
      return;
    }

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      const output = data.toString();
      stdout += output;

      if (onOutput) onOutput(output);

      const progressMatch = output.match(/\[download\]\s+(\d+\.?\d*)%/);

      if (progressMatch && onProgress) {
        const percent = parseFloat(progressMatch[1]);
        const sizeMatch = output.match(/of\s+~?\s*(\S+)/);
        const totalSize = sizeMatch ? sizeMatch[1] : "";
        const speedMatch = output.match(/at\s+(\S+)/);
        const currentSpeed = speedMatch ? speedMatch[1] : "";
        const etaMatch = output.match(/ETA\s+(\S+)/);
        const eta = etaMatch ? etaMatch[1] : "";

        onProgress({
          percent: percent,
          totalSize: totalSize,
          currentSpeed: currentSpeed,
          eta: eta,
        });
      }
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("error", (error) => {
      if (allowRecovery && isCorruptedBinaryError(error)) {
        recoverFromCorruptBinary(error);
        return;
      }

      let detail = error.message;
      if (error.code === "ENOENT") {
        detail = i18next.t("error.ytdlpNotFound") + " (ENOENT)";
      } else if (error.code === "EACCES") {
        detail = i18next.t("error.ytdlpPermissionDenied") + " (EACCES)";
      }
      reject(new Error(`${i18next.t("error.failedToExecuteYtdlp")}: ${detail}`));
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        // BiliBili 412 时自动补充站点参数重试一次
        const is412 = stderr.includes("HTTP Error 412");
        const alreadyHasReferer = args.includes("--referer");
        if (is412 && !alreadyHasReferer) {
          const urlArg = args.find(a => typeof a === 'string' && a.startsWith('https'));
          const extraArgs = urlArg ? getSiteArgs(urlArg) : [];
          if (extraArgs.length > 0) {
            execYtDlp([...args, ...extraArgs], onProgress, onOutput)
              .then(resolve)
              .catch(() =>
                reject(new Error(`${i18next.t("error.ytdlpExitedWithCode")} ${code}: ${stderr}`))
              );
            return;
          }
        }

        // Pinterest "No video formats found" 处理：降级链 (第三方来源 -> Cookie opt-in 重试)
        const isNoFormats = stderr.includes("No video formats found") || stderr.includes("[Pinterest]") || stderr.includes("login") || stderr.includes("redirect");
        const urlArg = args.find(a => typeof a === 'string' && a.startsWith('https'));
        const isPinterestUrl = urlArg && isPinterestDomain(urlArg);
        const isInstagramUrl = urlArg && isInstagramDomain(urlArg);

        if (isNoFormats && isPinterestUrl) {
          (async () => {
            const alreadyTriedSource = args.some(a => typeof a === 'string' && (isInstagramDomain(a) || matchDomain(a, ['youtube.com', 'vimeo.com', 'tiktok.com'])));
            let extractedSourceUrl = null;
            if (!alreadyTriedSource) {
              let sourceUrl = await extractPinterestSourceUrl(urlArg);
              if (sourceUrl) {
                sourceUrl = sourceUrl.replace(/\?img_index=\d+/, "");
                extractedSourceUrl = sourceUrl;

                const oldSiteArgs = getSiteArgs(urlArg);
                let cleanedArgs = args.filter(a => !oldSiteArgs.includes(a) && a !== "--cookies-from-browser" && a !== "chrome");
                const newSiteArgs = getSiteArgs(sourceUrl);

                const newArgs = cleanedArgs.map(a => a === urlArg ? sourceUrl : a);
                newArgs.push(...newSiteArgs);

                try {
                  const res = await execYtDlp(newArgs, onProgress, onOutput, false);
                  resolve(res);
                  return;
                } catch (e) {
                  if (hasCookieConsent()) {
                    try {
                      const res = await execYtDlp([...newArgs, "--cookies-from-browser", "chrome"], onProgress, onOutput, false);
                      resolve(res);
                      return;
                    } catch (e2) {}
                  }
                }
              }
            }

            if (!extractedSourceUrl && hasCookieConsent()) {
              const alreadyTriedCookies = args.includes("--cookies-from-browser");
              if (!alreadyTriedCookies) {
                try {
                  const res = await execYtDlp([...args, "--cookies-from-browser", "chrome"], onProgress, onOutput, false);
                  resolve(res);
                  return;
                } catch (e) {}
              }
            }

            reject(
              new Error(`${i18next.t("error.ytdlpExitedWithCode")} ${code}: ${stderr}`)
            );
          })();
          return;
        }

        // Instagram：仅在用户显式 Opt-in 时使用浏览器 Cookie 重试
        if (isInstagramUrl && !args.includes("--cookies-from-browser") && hasCookieConsent()) {
          execYtDlp([...args, "--cookies-from-browser", "chrome"], onProgress, onOutput, false)
            .then(resolve)
            .catch(() =>
              reject(new Error(`${i18next.t("error.ytdlpExitedWithCode")} ${code}: ${stderr}`))
            );
          return;
        }

        reject(
          new Error(`${i18next.t("error.ytdlpExitedWithCode")} ${code}: ${stderr}`)
        );
      }
    });
  });
}

function fetchWithRedirect(url, maxRedirects = 5) {
  return new Promise(async (resolve) => {
    if (maxRedirects <= 0) return resolve(null);
    try {
      await validateUrl(url);
      const u = new URL(url);
      const req = https.get(
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
 * 抓取网页 HTML 内容（统一使用安全重定向处理）
 */
async function fetchPageHtml(url) {
  await validateUrl(url);
  return await fetchWithRedirect(url);
}

/**
 * 从 Pinterest 页面抓取第三方来源链接
 */
async function extractPinterestSourceUrl(pinterestUrl) {
  try {
    const html = await fetchPageHtml(pinterestUrl);
    if (html) {
      const linkMatches = html.match(
        /https:\/\/[^\s"'<>\\]*?(?:instagram\.com|youtube\.com|vimeo\.com|tiktok\.com)[^\s"'<>\\]*/gi
      );
      if (linkMatches && linkMatches.length > 0) {
        let cleanUrl = linkMatches[0].replace(/\\\/|\\/g, "/");
        cleanUrl = cleanUrl.replace(/\\u0026/g, "&");
        await validateUrl(cleanUrl);
        return cleanUrl;
      }
    }
  } catch (e) {}
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
 * 通用 HTTPS 文件下载器
 */
async function downloadFile(url, outputPath, onProgress) {
  await validateUrl(url);

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  try {
    if (typeof fetch === 'function') {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        redirect: 'manual',
      });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        if (loc) {
          await validateUrl(loc);
          return downloadFile(loc, outputPath, onProgress);
        }
        throw new Error(`Redirect missing location header (HTTP ${res.status})`);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const contentLength = parseInt(res.headers.get('content-length') || '0', 10);
      const reader = res.body.getReader();
      const chunks = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (onProgress && contentLength > 0) {
          onProgress({ percent: Math.round((received / contentLength) * 100) });
        }
      }

      const buffer = Buffer.concat(chunks);
      fs.writeFileSync(outputPath, buffer);
      if (onProgress) onProgress({ percent: 100 });
      return outputPath;
    }
  } catch (e) {
    if (e.message && (e.message.includes('HTTP') || e.message.includes('Redirect') || e.message.includes('blocked') || e.message.includes('DNS'))) {
      throw e;
    }
  }

  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        validateUrl(redirectUrl)
          .then(() => downloadFile(redirectUrl, outputPath, onProgress))
          .then(resolve)
          .catch(reject);
        return;
      }
      if (res.statusCode < 200 || res.statusCode >= 400) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }

      const contentLength = parseInt(res.headers['content-length'] || '0', 10);
      const fileStream = fs.createWriteStream(outputPath);
      let received = 0;

      res.on('data', (chunk) => {
        received += chunk.length;
        if (onProgress && contentLength > 0) {
          onProgress({ percent: Math.round((received / contentLength) * 100) });
        }
      });

      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        if (onProgress) onProgress({ percent: 100 });
        resolve(outputPath);
      });
      fileStream.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Download timeout')); });
  });
}

/**
 * 返回特定站点需要的额外 yt-dlp 参数
 */
function getSiteArgs(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'bilibili.com' || host === 'b23.tv' || host.endsWith('.bilibili.com')) {
      return [
        '--referer', 'https://www.bilibili.com',
        '--add-header', 'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ];
    }
    if (host === 'twitter.com' || host === 'x.com' || host.endsWith('.twitter.com') || host.endsWith('.x.com')) {
      return [
        '--ignore-no-formats-error',
      ];
    }
    if (host === 'pinterest.com' || host.endsWith('.pinterest.com') || host === 'pin.it') {
      return [
        '--referer', 'https://www.pinterest.com/',
        '--add-header', 'User-Agent:Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ];
    }
    if (host === 'instagram.com' || host.endsWith('.instagram.com')) {
      return [
        '--referer', 'https://www.instagram.com/',
        '--add-header', 'User-Agent:Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ];
    }
  } catch (e) {}
  return [];
}

/**
 * 标准化 URL
 */
function normalizeUrl(url) {
  try {
    const urlObj = new URL(url);

    if (
      urlObj.hostname === "vimeo.com" ||
      urlObj.hostname === "www.vimeo.com"
    ) {
      const pathParts = urlObj.pathname.split("/").filter((p) => p);
      const videoId = pathParts.find((part) => /^\d+$/.test(part));

      if (videoId) {
        return `https://player.vimeo.com/video/${videoId}`;
      }
    }

    return url;
  } catch (error) {
    return url;
  }
}

/**
 * 获取视频信息
 */
async function getVideoInfo(url) {
  await validateUrl(url);
  url = normalizeUrl(url);

  const isPinterest = isPinterestDomain(url);

  if (isPinterest) {
    const pinData = await extractPinterestPinData(url);
    if (pinData) {
      const hasVideoContent = pinData.isVideo || pinData.videos;
      const hasVideoSource = !!pinData.sourceUrl;

      if (!hasVideoContent && !hasVideoSource) {
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
      }

      if (hasVideoSource && !hasVideoContent) {
        const targetUrl = pinData.sourceUrl.replace(/\?img_index=\d+/, "");
        await validateUrl(targetUrl);
        const args = ["--dump-json", "--no-warnings", "--force-ipv4", ...getSiteArgs(targetUrl), targetUrl];
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
    }
  }

  const args = ["--dump-json", "--no-warnings", "--force-ipv4", ...getSiteArgs(url), url];

  let output;
  try {
    output = await execYtDlp(args);
  } catch (err) {
    if (isPinterest && hasCookieConsent()) {
      const cookieArgs = [...args, "--cookies-from-browser", "chrome"];
      output = await execYtDlp(cookieArgs);
    } else {
      throw err;
    }
  }

  return parseYtDlpOutput(output, url);
}

/**
 * 解析 yt-dlp --dump-json 输出
 */
function parseYtDlpOutput(output, fallbackUrl) {
  const lines = output.trim().split("\n").filter(Boolean);
  let info = {};
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed._type === "video" || parsed.title || parsed.playlist_title) {
        info = parsed;
        if (parsed.title) break;
      } else if (!info.id) {
        info = parsed;
      }
    } catch (e) {}
  }

  return {
    title: info.title || info.playlist_title || i18next.t("error.untitledVideo"),
    description: info.description || "",
    duration: info.duration || 0,
    thumbnail: info.thumbnail || null,
    uploader: info.uploader || info.channel || info.playlist_uploader || i18next.t("error.unknown"),
    extractor: info.extractor || i18next.t("error.unknown"),
    webpage_url: info.webpage_url || fallbackUrl,
    id: info.id || null,
  };
}

/**
 * 净化文件名
 */
function sanitizeFilename(filename) {
  let str = (typeof filename === 'string' && filename.trim().length > 0) ? filename : "";
  if (!str) {
    try {
      if (typeof i18next !== "undefined" && typeof i18next.t === "function") {
        const res = i18next.t("error.untitledVideo");
        if (typeof res === 'string' && res.length > 0) str = res;
      }
    } catch (e) {}
  }
  if (!str || typeof str !== 'string') {
    str = "Untitled Video";
  }
  return str
    .replace(/[<>:"/\\|?*]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200) || "Untitled Video";
}

/**
 * 获取下载临时目录
 */
function getTempDir() {
  const tempDir = path.join(os.tmpdir(), "eagle-video-downloader");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  return tempDir;
}

/**
 * 下载视频
 */
async function downloadVideo(url, onProgress, onStatus, preloadedInfo = null) {
  await validateUrl(url);
  let videoInfo;

  if (preloadedInfo) {
    videoInfo = preloadedInfo;
  } else {
    if (onStatus) onStatus(i18next.t("download.fetchingInfo"));
    try {
      videoInfo = await getVideoInfo(url);
      if (onStatus && videoInfo && videoInfo.title) {
        const foundMsg = (typeof i18next !== "undefined" && i18next.t) ? i18next.t("download.foundVideo") : "Found Video";
        onStatus(`${foundMsg}: ${videoInfo.title}`);
      }
    } catch (error) {
      videoInfo = {
        title: (typeof i18next !== "undefined" && i18next.t) ? i18next.t("error.untitledVideo") : "Untitled Video",
        extractor: (typeof i18next !== "undefined" && i18next.t) ? i18next.t("error.unknown") : "Unknown",
      };
    }
  }

  if (videoInfo && videoInfo.type === 'image' && videoInfo.imageUrl) {
    await validateUrl(videoInfo.imageUrl);
    const outputDir = getTempDir();
    const sanitizedTitle = sanitizeFilename(videoInfo.title);
    const urlPath = new URL(videoInfo.imageUrl).pathname;
    const ext = path.extname(urlPath) || '.jpg';
    const filename = `${sanitizedTitle}${ext}`;
    const outputPath = path.join(outputDir, filename);

    if (onStatus) onStatus(i18next.t("ui.downloading"));

    await downloadFile(videoInfo.imageUrl, outputPath, onProgress);

    return [{
      path: outputPath,
      metadata: videoInfo,
      filename: filename,
    }];
  }

  const outputDir = getTempDir();
  const sanitizedTitle = sanitizeFilename(videoInfo.title);
  const outputTemplate = path.join(outputDir, `${sanitizedTitle}_%(autonumber)s.%(ext)s`);

  let targetUrl = (videoInfo && typeof videoInfo.webpage_url === 'string' && videoInfo.webpage_url.startsWith('https')) 
    ? videoInfo.webpage_url 
    : url;
  targetUrl = normalizeUrl(targetUrl);
  await validateUrl(targetUrl);

  const args = [
    targetUrl,
    "-o",
    outputTemplate,
    "-f",
    "bestvideo+bestaudio/best/b",
    "--merge-output-format",
    "mp4",
    "--no-warnings",
    "--force-ipv4",
    ...getSiteArgs(targetUrl),
  ];

  const ffmpeg = getFfmpegPath();
  if (ffmpeg && fs.existsSync(ffmpeg)) {
    args.push("--ffmpeg-location", path.dirname(ffmpeg));
  }

  if (onStatus) onStatus(i18next.t("ui.downloading"));

  const filesBefore = new Set(fs.existsSync(outputDir) ? fs.readdirSync(outputDir) : []);

  await execYtDlp(args, onProgress);

  const filesAfter = fs.readdirSync(outputDir);
  const newFiles = filesAfter.filter(f => !filesBefore.has(f) && f.startsWith(sanitizedTitle));

  if (newFiles.length === 0) {
    throw new Error(i18next.t("error.fileNotFound"));
  }

  return newFiles.map(filename => ({
    path: path.join(outputDir, filename),
    metadata: videoInfo,
    filename: filename,
  }));
}

/**
 * 清理临时文件
 */
function cleanup(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    // Ignore cleanup errors
  }
}

module.exports = {
  downloadVideo,
  getVideoInfo,
  cleanup,
  setCookieConsent,
  hasCookieConsent,
  validateUrl,
};
