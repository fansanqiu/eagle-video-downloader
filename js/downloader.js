/**
 * 视频下载模块
 * 处理视频下载核心逻辑
 */

const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawn } = require("child_process");
const i18next = require("i18next");

const { getYtDlpPath, getFfmpegPath, BIN_DIR, downloadYtDlp } = require("./binary");

/**
 * 判断 spawn 错误是否表示二进制文件本身已损坏（而非权限/路径问题）
 * - EBADMACHO (macOS, errno 88)：Mach-O 文件损坏，常见于下载中断
 * - ENOEXEC：可执行文件格式错误
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

    // 确保二进制文件有执行权限（文件可能因拷贝/恢复等操作丢失权限）
    if (os.platform() !== 'win32') {
      try { fs.chmodSync(ytdlp, '755'); } catch (e) {}
    }

    // 二进制文件损坏时：删除并重新下载，再重试一次（仅一次，避免死循环）
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

      // 解析 yt-dlp 输出进度 - 支持多种格式
      // 格式1: [download]  45.2% of 123.45MiB at 1.23MiB/s ETA 00:30
      // 格式2: [download]  45.2% of ~ 123.45MiB at 1.23MiB/s ETA 00:30
      // 格式3: [download]  45.2% of 123.45MB at 1.23MB/s ETA 00:30
      const progressMatch = output.match(/\[download\]\s+(\d+\.?\d*)%/);

      if (progressMatch && onProgress) {
        const percent = parseFloat(progressMatch[1]);

        // 提取文件大小
        const sizeMatch = output.match(/of\s+~?\s*(\S+)/);
        const totalSize = sizeMatch ? sizeMatch[1] : "";

        // 提取速度
        const speedMatch = output.match(/at\s+(\S+)/);
        const currentSpeed = speedMatch ? speedMatch[1] : "";

        // 提取 ETA
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
        // SSL 错误时自动重试，添加 --no-check-certificate
        const isSSLError = stderr.includes("SSL") || stderr.includes("ssl");
        const alreadySkipping = args.includes("--no-check-certificate");
        if (isSSLError && !alreadySkipping) {
          execYtDlp([...args, "--no-check-certificate"], onProgress, onOutput)
            .then(resolve)
            .catch(() =>
              reject(new Error(`${i18next.t("error.ytdlpExitedWithCode")} ${code}: ${stderr}`))
            );
          return;
        }

        // BiliBili 412 时自动补充站点参数重试一次
        const is412 = stderr.includes("HTTP Error 412");
        const alreadyHasReferer = args.includes("--referer");
        if (is412 && !alreadyHasReferer) {
          const urlArg = args.find(a => a.startsWith('http'));
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

        // Pinterest "No video formats found" 处理：降级链 (优先第三方来源链接提取重试 -> Cookie 重试)
        const isNoFormats = stderr.includes("No video formats found") || stderr.includes("[Pinterest]") || stderr.includes("login") || stderr.includes("redirect");
        const urlArg = args.find(a => typeof a === 'string' && a.startsWith('http'));
        const isPinterestUrl = urlArg && (urlArg.includes('pinterest.com') || urlArg.includes('pin.it'));
        const isInstagramUrl = urlArg && urlArg.includes('instagram.com');

        if (isNoFormats && isPinterestUrl) {
          (async () => {
            const alreadyTriedSource = args.some(a => typeof a === 'string' && (a.includes('instagram.com') || a.includes('youtube.com') || a.includes('vimeo.com') || a.includes('tiktok.com')));
            let extractedSourceUrl = null;
            if (!alreadyTriedSource) {
              let sourceUrl = await extractPinterestSourceUrl(urlArg);
              if (sourceUrl) {
                // 清理多图索引参数，恢复为帖子根地址
                sourceUrl = sourceUrl.replace(/\?img_index=\d+/, "");
                extractedSourceUrl = sourceUrl;

                // 清除原 Pinterest 的站点参数与 Cookie 参数
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
                  // 第三方来源首次尝试失败，对该来源 URL 做 Cookie 重试
                  try {
                    const res = await execYtDlp([...newArgs, "--cookies-from-browser", "chrome"], onProgress, onOutput, false);
                    resolve(res);
                    return;
                  } catch (e2) {
                    // 来源 URL Cookie 重试也失败
                  }
                }
              }
            }

            // 兜底：对原始 Pinterest URL 做 Cookie 重试（仅在未提取到第三方来源时有意义）
            if (!extractedSourceUrl) {
              const alreadyTriedCookies = args.includes("--cookies-from-browser");
              if (!alreadyTriedCookies) {
                try {
                  const res = await execYtDlp([...args, "--cookies-from-browser", "chrome"], onProgress, onOutput, false);
                  resolve(res);
                  return;
                } catch (e) {
                  // Cookie 重试受限
                }
              }
            }

            reject(
              new Error(`${i18next.t("error.ytdlpExitedWithCode")} ${code}: ${stderr}`),
            );
          })();
          return;
        }

        // Instagram 自动使用浏览器 Cookie 重试
        if (isInstagramUrl && !args.includes("--cookies-from-browser")) {
          execYtDlp([...args, "--cookies-from-browser", "chrome"], onProgress, onOutput, false)
            .then(resolve)
            .catch(() =>
              reject(new Error(`${i18next.t("error.ytdlpExitedWithCode")} ${code}: ${stderr}`))
            );
          return;
        }

        reject(
          new Error(`${i18next.t("error.ytdlpExitedWithCode")} ${code}: ${stderr}`),
        );
      }
    });
  });
}

function fetchWithRedirect(url, maxRedirects = 5) {
  return new Promise((resolve) => {
    if (maxRedirects <= 0) return resolve(null);
    try {
      const u = new URL(url);
      const client = u.protocol === "https:" ? https : http;
      const req = client.get(
        url,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            let redirectUrl = res.headers.location;
            if (redirectUrl.startsWith("/")) {
              redirectUrl = `${u.protocol}//${u.host}${redirectUrl}`;
            }
            return fetchWithRedirect(redirectUrl, maxRedirects - 1).then(resolve);
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
 * 优先使用全局 fetch (走 Chromium 代理网络栈，支持系统代理/VPN，自动跟随重定向)
 * 降级使用 Node.js https.get
 */
async function fetchPageHtml(url) {
  try {
    if (typeof fetch === "function") {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        redirect: "follow",
      });
      if (res.status >= 200 && res.status < 400) {
        const text = await res.text();
        if (text && text.length > 0) return text;
      }
    }
  } catch (e) {}

  return await fetchWithRedirect(url);
}

/**
 * 从 Pinterest 页面抓取第三方来源链接 (如 Instagram 帖子)
 */
async function extractPinterestSourceUrl(pinterestUrl) {
  try {
    const html = await fetchPageHtml(pinterestUrl);
    if (html) {
      const linkMatches = html.match(
        /https?:(?:\/|\\\/)+[^\s"'<>\\]*?(?:instagram\.com|youtube\.com|vimeo\.com|tiktok\.com)[^\s"'<>\\]*/gi
      );
      if (linkMatches && linkMatches.length > 0) {
        let cleanUrl = linkMatches[0].replace(/\\\/|\\/g, "/");
        cleanUrl = cleanUrl.replace(/\\u0026/g, "&");
        return cleanUrl;
      }
    }
  } catch (e) {}
  return null;
}

/**
 * 从 Pinterest 页面 SSR 数据中提取 pin 完整元数据（类型、图片 URL、标题等）
 * 用于在 yt-dlp 之前判断 pin 类型，对图片 pin 走直接下载路径
 */
async function extractPinterestPinData(pinterestUrl) {
  try {
    const html = await fetchPageHtml(pinterestUrl);
    if (!html) return null;

    // 从 URL 中提取 pin ID
    const pinIdMatch = pinterestUrl.match(/pin\/([\d]+)/);
    const pinId = pinIdMatch ? pinIdMatch[1] : null;

    const result = {
      isVideo: false,
      videos: null,
      imageUrl: null,
      title: '',
      description: '',
      link: null,
      sourceUrl: null, // 第三方视频来源
    };

    // 从 SSR 数据中查找 pin 的 isVideo 和 videos 字段
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

    // 提取图片 URL：优先从 pin 实体数据附近查找，避免匹配到页面中无关的推荐 pin 图片
    // Pinterest 图片 URL 格式: i.pinimg.com/{resolution}/{hash}.{ext}
    // 策略：先在 entityId 附近上下文中查找，再全局兜底

    // 优先从 pin 实体附近（±8000 字符范围）提取图片
    if (pinId) {
      const entityIdx = html.indexOf(`"entityId":"${pinId}"`);
      if (entityIdx !== -1) {
        const imgSearchStart = Math.max(0, entityIdx - 8000);
        const imgSearchEnd = Math.min(html.length, entityIdx + 8000);
        const imgContext = html.substring(imgSearchStart, imgSearchEnd);
        
        // 先找 originals 路径
        const origMatch = imgContext.match(/https?:\/\/i\.pinimg\.com\/originals\/([a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]+\.(?:jpg|png|gif|webp))/i);
        if (origMatch) {
          result.imageUrl = `https://i.pinimg.com/originals/${origMatch[1]}`;
        } else {
          // 否则找任意分辨率路径推导 originals
          const anyMatch = imgContext.match(/https?:\/\/i\.pinimg\.com\/(?:1200x|736x|564x|474x|236x|136x136|60x60|600x315)\/([a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]+\.(?:jpg|png|gif|webp))/i);
          if (anyMatch) {
            result.imageUrl = `https://i.pinimg.com/originals/${anyMatch[1]}`;
          }
        }
      }
    }

    // 全局兜底
    if (!result.imageUrl) {
      const originalsMatch = html.match(/https?:\/\/i\.pinimg\.com\/originals\/[a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]+\.(?:jpg|png|gif|webp)/i);
      if (originalsMatch) {
        result.imageUrl = originalsMatch[0];
      } else {
        const anyImgMatch = html.match(/https?:\/\/i\.pinimg\.com\/(?:1200x|736x|564x|474x)\/([a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]+\.(?:jpg|png|gif|webp))/i);
        if (anyImgMatch) {
          result.imageUrl = `https://i.pinimg.com/originals/${anyImgMatch[1]}`;
        }
      }
    }

    // 提取第三方视频来源链接
    const sourceMatches = html.match(
      /https?:(?:\/|\\\/)+[^\s"'<>\\]*?(?:instagram\.com|youtube\.com|vimeo\.com|tiktok\.com)[^\s"'<>\\]*/gi
    );
    if (sourceMatches && sourceMatches.length > 0) {
      let cleanUrl = sourceMatches[0].replace(/\\\/|\\/g, "/");
      cleanUrl = cleanUrl.replace(/\\u0026/g, "&");
      result.sourceUrl = cleanUrl;
    }

    // 标题兜底：使用描述的第一行
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
 * 通用 HTTP 文件下载器
 * 优先使用 Chromium fetch（走系统代理），兜底 Node https
 */
async function downloadFile(url, outputPath, onProgress) {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // 优先使用 fetch（Electron/Chromium 环境支持代理）
  try {
    if (typeof fetch === 'function') {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        redirect: 'follow',
      });
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
    // fetch 失败，降级到 Node https
  }

  // Node https 兜底
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const client = u.protocol === 'https:' ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    }, (res) => {
      // 处理重定向
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, outputPath, onProgress).then(resolve).catch(reject);
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
 * BiliBili：补充 Referer 和 User-Agent，避免 HTTP 412
 * Pinterest：补充 Referer 和 User-Agent，帮助下发完整 SSR 结构
 * Instagram：补充 Referer 和 User-Agent，规避匿名拦截
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
 * 标准化 URL，处理特殊情况
 * - Vimeo: 将 vimeo.com/ID 转换为 player.vimeo.com/video/ID 以绕过登录限制
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
  url = normalizeUrl(url);

  const isPinterest = url.includes('pinterest.com') || url.includes('pin.it');

  // Pinterest 前置检测：解析 pin 类型，对图片 pin 直接返回图片信息
  if (isPinterest) {
    const pinData = await extractPinterestPinData(url);
    if (pinData) {
      // 视频 pin 或存在第三方视频来源 → 走 yt-dlp 流程
      const hasVideoContent = pinData.isVideo || pinData.videos;
      const hasVideoSource = !!pinData.sourceUrl;

      if (!hasVideoContent && !hasVideoSource) {
        // 纯图片 pin → 返回图片信息，跳过 yt-dlp
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

      // 有第三方视频来源 → 替换目标 URL
      if (hasVideoSource && !hasVideoContent) {
        const targetUrl = pinData.sourceUrl.replace(/\?img_index=\d+/, "");
        const args = ["--dump-json", "--no-warnings", ...getSiteArgs(targetUrl), targetUrl];
        try {
          const output = await execYtDlp(args);
          return parseYtDlpOutput(output, targetUrl);
        } catch (e) {
          // 第三方来源也无法解析 → 降级为图片下载
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

  // 通用路径：直接使用 yt-dlp
  const args = ["--dump-json", "--no-warnings", ...getSiteArgs(url), url];

  let output;
  try {
    output = await execYtDlp(args);
  } catch (err) {
    // Pinterest 视频 pin yt-dlp 失败时做 Cookie 重试兜底
    if (isPinterest) {
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
 * @param {string} url - 视频 URL
 * @param {Function} onProgress - 进度回调
 * @param {Function} onStatus - 状态回调
 * @param {Object} preloadedInfo - 可选，预先获取的视频信息，避免重复请求
 * @returns {Promise<Array>} - 返回下载的视频数组（支持多视频）
 */
async function downloadVideo(url, onProgress, onStatus, preloadedInfo = null) {
  let videoInfo;

  if (preloadedInfo) {
    // 使用预先获取的信息
    videoInfo = preloadedInfo;
  } else {
    // 需要获取信息
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

  // Pinterest 图片 pin 直接下载路径（跳过 yt-dlp）
  if (videoInfo && videoInfo.type === 'image' && videoInfo.imageUrl) {
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
  
  // 使用模板支持多视频下载：%(title)s_%(autonumber)s.%(ext)s
  const outputTemplate = path.join(outputDir, `${sanitizedTitle}_%(autonumber)s.%(ext)s`);

  let targetUrl = (videoInfo && typeof videoInfo.webpage_url === 'string' && videoInfo.webpage_url.startsWith('http')) 
    ? videoInfo.webpage_url 
    : url;
  targetUrl = normalizeUrl(targetUrl);

  const args = [
    targetUrl,
    "-o",
    outputTemplate,
    "-f",
    "bestvideo+bestaudio/best/b",
    "--merge-output-format",
    "mp4",
    "--no-warnings",
    ...getSiteArgs(targetUrl),
  ];

  const ffmpeg = getFfmpegPath();
  if (ffmpeg && fs.existsSync(ffmpeg)) {
    args.push("--ffmpeg-location", path.dirname(ffmpeg));
  }

  if (onStatus) onStatus(i18next.t("ui.downloading"));

  // 记录下载前的文件列表
  const filesBefore = new Set(fs.existsSync(outputDir) ? fs.readdirSync(outputDir) : []);

  await execYtDlp(args, onProgress);

  // 获取下载后新增的文件
  const filesAfter = fs.readdirSync(outputDir);
  const newFiles = filesAfter.filter(f => !filesBefore.has(f) && f.startsWith(sanitizedTitle));

  if (newFiles.length === 0) {
    throw new Error(i18next.t("error.fileNotFound"));
  }

  // 返回所有下载的视频
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
};
