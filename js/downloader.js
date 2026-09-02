/**
 * 视频下载模块
 * 处理视频下载核心调度逻辑，具体站点差异由 js/sites/ 适配器处理
 */

const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawn } = require("child_process");
const i18next = require("i18next");

const { getYtDlpPath, getFfmpegPath, BIN_DIR, downloadYtDlp } = require("./binary");
const { validateUrl, secureHttpsGet } = require("./net-guard");
const siteAdapters = require("./sites");

// Cookie 显式授权状态
let cookieConsentGranted = false;
// 派生域名 Cookie 弹窗确认函数（由 plugin.js 注入 ui.requestCookieConsentDialog）
let cookieConsentPrompt = null;
let maxResolution = "auto";
let maxFramerate = "auto";

function setCookieConsent(granted) {
  cookieConsentGranted = Boolean(granted);
}

function hasCookieConsent() {
  return cookieConsentGranted;
}

/**
 * 注入派生域名 Cookie 确认函数（异步，显示弹窗并等待用户操作）。
 * fn: (domain: string, kind: string) => Promise<boolean>
 */
function setCookieConsentPrompt(fn) {
  cookieConsentPrompt = fn;
}

/**
 * 检查是否可以为指定 URL 的目标域名使用 Chrome Cookie，
 * 并在需要时通过弹窗向用户请求该域名的显式授权。
 * 整合「开关是否开启」+「弹窗确认」+「会话缓存」三重判定，
 * 适配器统一调用此函数，不应再直接判断 hasCookieConsent()。
 * @param {string} url   目标 URL（用于提取 hostname）
 * @param {string} [kind='direct']  'direct'（用户输入的链接）| 'derived'（Pinterest 派生源）
 * @returns {Promise<boolean>}  true = 已授权可带 Cookie 重试
 */
async function authorizeCookies(url, kind = 'direct') {
  if (!hasCookieConsent()) return false;
  if (typeof cookieConsentPrompt !== 'function') return false;
  let hostname;
  try { hostname = new URL(url).hostname; } catch { return false; }
  return await cookieConsentPrompt(hostname, kind);
}

function setQualityPrefs({ resolution = "auto", framerate = "auto" } = {}) {
  maxResolution = resolution || "auto";
  maxFramerate = framerate || "auto";
}

/**
 * 根据分辨率和帧率设置构建 yt-dlp -f 格式选择器（支持自动向下兜底）
 */
function buildFormatSelector(resolution, framerate) {
  const heightFilter = resolution && resolution !== "auto" ? `[height<=${resolution}]` : "";
  const fpsFilter = framerate && framerate !== "auto" ? `[fps<=${framerate}]` : "";

  if (!heightFilter && !fpsFilter) {
    return "bestvideo+bestaudio/best/b";
  }

  const parts = [];
  if (heightFilter && fpsFilter) {
    parts.push(`bestvideo${heightFilter}${fpsFilter}+bestaudio/best${heightFilter}${fpsFilter}`);
  }
  if (heightFilter) {
    parts.push(`bestvideo${heightFilter}+bestaudio/best${heightFilter}`);
  }
  if (fpsFilter) {
    parts.push(`bestvideo${fpsFilter}+bestaudio/best${fpsFilter}`);
  }
  parts.push("bestvideo+bestaudio/best/b");

  return parts.join("/");
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
function execYtDlp(args, onProgress, onOutput, options = {}) {
  // 兼容旧签名：第 4 参数传 boolean 时视为 { allowRecovery: value }
  if (typeof options === 'boolean') {
    options = { allowRecovery: options };
  }
  const { allowRecovery = true, targetUrl = null } = options;

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
        .then(() => execYtDlp(args, onProgress, onOutput, { allowRecovery: false, targetUrl }))
        .then(resolve)
        .catch(() => reject(new Error(`${i18next.t("error.failedToExecuteYtdlp")}: ${error.message}`)));
    };

    const finalArgs = args.includes("--force-ipv4") ? args : ["--force-ipv4", ...args];

    let proc;
    try {
      proc = spawn(ytdlp, finalArgs, { cwd: BIN_DIR });
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

    proc.on("close", async (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        // 使用调用方显式传入的 targetUrl 而非从 args 猜测，
        // 避免 --referer https://www.pinterest.com/ 之类的 site args 被误选为目标 URL
        if (targetUrl) {
          try {
            const recoveryResult = await siteAdapters.handleExecFailure({
              code,
              stderr,
              args,
              onProgress,
              onOutput,
              execYtDlp,
              hasCookieConsent,
              authorizeCookies,
              getSiteArgsForUrl: siteAdapters.getSiteArgs,
              url: targetUrl,
            });
            if (recoveryResult !== null) {
              resolve(recoveryResult);
              return;
            }
          } catch (recoveryErr) {
            // 降级失败时继续抛出原始错误
          }
        }

        reject(
          new Error(`${i18next.t("error.ytdlpExitedWithCode")} ${code}: ${stderr}`)
        );
      }
    });
  });
}

/**
 * 通用 HTTPS 文件下载器（连接 pin 到已校验 IP，逐跳重定向重新校验）
 */
async function downloadFile(url, outputPath, onProgress, maxRedirects = 5) {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  return new Promise((resolve, reject) => {
    (async () => {
      let req;
      try {
        req = await secureHttpsGet(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            if (maxRedirects <= 0) return reject(new Error('Too many redirects'));
            let redirectUrl = res.headers.location;
            if (redirectUrl.startsWith('/')) {
              const u = new URL(url);
              redirectUrl = `${u.protocol}//${u.host}${redirectUrl}`;
            }
            res.resume();
            downloadFile(redirectUrl, outputPath, onProgress, maxRedirects - 1).then(resolve).catch(reject);
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
      } catch (e) {
        return reject(e);
      }
      req.on('error', reject);
      req.setTimeout(30000, () => { req.destroy(); reject(new Error('Download timeout')); });
    })();
  });
}

/**
 * 获取视频信息
 */
async function getVideoInfo(url) {
  await validateUrl(url);
  url = siteAdapters.normalizeUrl(url);
  // normalizeUrl 可能产生派生 URL（如 Vimeo ID 转正规地址），必须重新校验
  await validateUrl(url);

  const customInfo = await siteAdapters.customGetInfo(url, {
    execYtDlp,
    parseYtDlpOutput,
    getSiteArgsForUrl: siteAdapters.getSiteArgs,
  });
  if (customInfo) {
    return customInfo;
  }

  const args = ["--dump-json", "--no-warnings", ...siteAdapters.getSiteArgs(url), url];

  let output;
  try {
    output = await execYtDlp(args, null, null, { targetUrl: url });
  } catch (err) {
    if (await authorizeCookies(url, 'direct')) {
      const cookieArgs = [...args, "--cookies-from-browser", "chrome"];
      output = await execYtDlp(cookieArgs, null, null, { allowRecovery: false, targetUrl: url });
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
  targetUrl = siteAdapters.normalizeUrl(targetUrl);
  await validateUrl(targetUrl);
  // 若 videoInfo 来自 Pinterest 派生源，在 download 阶段复检白名单，
  // 确保「派生 URL 严格限制在已批准平台域名」的声明端到端成立
  if (videoInfo && videoInfo.derivedFrom === 'pinterest') {
    siteAdapters.assertDerivedHostAllowed(targetUrl);
  }

  const formatSelector = buildFormatSelector(maxResolution, maxFramerate);

  const args = [
    targetUrl,
    "-o",
    outputTemplate,
    "-f",
    formatSelector,
    "--merge-output-format",
    "mp4",
    "--no-warnings",
    ...siteAdapters.getSiteArgs(targetUrl),
  ];

  const ffmpeg = getFfmpegPath();
  if (ffmpeg && fs.existsSync(ffmpeg)) {
    args.push("--ffmpeg-location", path.dirname(ffmpeg));
  }

  if (onStatus) onStatus(i18next.t("ui.downloading"));

  const filesBefore = new Set(fs.existsSync(outputDir) ? fs.readdirSync(outputDir) : []);

  await execYtDlp(args, onProgress, null, { targetUrl });

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
  authorizeCookies,
  setCookieConsentPrompt,
  setQualityPrefs,
  buildFormatSelector,
};
