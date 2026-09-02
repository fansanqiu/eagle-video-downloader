/**
 * Eagle 视频下载插件
 * 主入口 - 处理插件初始化和下载队列管理
 */

const i18next = require("i18next");
const {
  isYtDlpInstalled,
  downloadYtDlp,
  uninstallYtDlp,
  getYtDlpUpdateInfo,
  getInstalledYtDlpVersion,
  getLatestYtDlpVersion,
  getFfmpegSource,
} = require("./binary");
const { isNetworkError } = require("./net-guard");
const downloader = require("./downloader");
const ui = require("./ui");

// 状态管理
let isInitialized = false;

async function importToEagle(videoPath, metadata, sourceUrl) {
  if (typeof eagle === "undefined") {
    throw new Error(i18next.t("error.eagleApiNotAvailable"));
  }
  const importOptions = {
    name: metadata.title || i18next.t("error.downloadedVideo"),
    website: sourceUrl || undefined,
    tags: [metadata.extractor || "video"],
    annotation: metadata.description ? metadata.description.slice(0, 500) : "",
  };
  try {
    return await eagle.item.addFromPath(videoPath, importOptions);
  } catch (error) {
    throw new Error(`${i18next.t("error.eagleImportFailed")}: ${error.message}`);
  }
}

// Cookie 显式授权存储 key
const COOKIE_CONSENT_KEY = "eagle-video-downloader.cookieConsent";
// 自动设置 Eagle 数据来源 key
const AUTO_ADD_SOURCE_KEY = "eagle-video-downloader.autoAddSource";
// 清晰度与帧率偏好存储 key
const MAX_RESOLUTION_KEY = "eagle-video-downloader.maxResolution";
const MAX_FRAMERATE_KEY = "eagle-video-downloader.maxFramerate";

/**
 * 获取用户是否授权使用浏览器 Cookie (默认 false)
 */
function getCookieConsentPref() {
  const val = localStorage.getItem(COOKIE_CONSENT_KEY);
  return val === "true";
}

/**
 * 保存用户是否授权使用浏览器 Cookie
 */
function setCookieConsentPref(value) {
  localStorage.setItem(COOKIE_CONSENT_KEY, String(value));
  downloader.setCookieConsent(Boolean(value));
}

/**
 * 获取用户是否自动设置 Eagle 数据来源 (默认 true)
 */
function getAutoAddSourcePref() {
  const val = localStorage.getItem(AUTO_ADD_SOURCE_KEY);
  return val === null ? true : val === "true";
}

/**
 * 保存用户是否自动设置 Eagle 数据来源
 */
function setAutoAddSourcePref(value) {
  localStorage.setItem(AUTO_ADD_SOURCE_KEY, String(value));
}

/**
 * 获取清晰度上限偏好 (默认 'auto')
 */
function getMaxResolutionPref() {
  return localStorage.getItem(MAX_RESOLUTION_KEY) || "auto";
}

/**
 * 保存清晰度上限偏好
 */
function setMaxResolutionPref(value) {
  const val = value || "auto";
  localStorage.setItem(MAX_RESOLUTION_KEY, val);
  downloader.setQualityPrefs({
    resolution: val,
    framerate: getMaxFrameratePref(),
  });
}

/**
 * 获取帧率上限偏好 (默认 'auto')
 */
function getMaxFrameratePref() {
  return localStorage.getItem(MAX_FRAMERATE_KEY) || "auto";
}

/**
 * 保存帧率上限偏好
 */
function setMaxFrameratePref(value) {
  const val = value || "auto";
  localStorage.setItem(MAX_FRAMERATE_KEY, val);
  downloader.setQualityPrefs({
    resolution: getMaxResolutionPref(),
    framerate: val,
  });
}

// 下载队列
const downloadQueue = [];
const MAX_CONCURRENT = 3;
let activeCount = 0;
let queueIdCounter = 0;

/**
 * 初始化 i18next
 */
async function initI18n() {
  const enTranslation = require("../Plugin/_locales/en.json");
  const zhCNTranslation = require("../Plugin/_locales/zh_CN.json");

  await i18next.init({
    lng: eagle.app.locale || "en",
    fallbackLng: "en",
    resources: {
      en: { translation: enTranslation },
      zh_CN: { translation: zhCNTranslation },
    },
  });
  
  // 将 i18next 设置为全局变量，供其他模块使用
  global.i18next = i18next;
}

/**
 * 应用翻译到 UI 元素
 */
function applyTranslations() {
  const appName = document.getElementById("appName");
  if (appName) appName.textContent = i18next.t("ui.appTitle");

  const urlInput = document.getElementById("urlInput");
  if (urlInput) urlInput.placeholder = i18next.t("ui.inputPlaceholder");
}

/**
 * 初始化插件
 */
eagle.onPluginCreate(async (plugin) => {
  await initI18n();
  applyTranslations();
  ui.updateTheme();
  setupEventListeners();
  downloader.setCookieConsent(getCookieConsentPref());
  // 注入派生域名 Cookie 弹窗确认函数（保持 downloader 不直接依赖 ui）
  downloader.setCookieConsentPrompt(ui.requestCookieConsentDialog);
  downloader.setQualityPrefs({
    resolution: getMaxResolutionPref(),
    framerate: getMaxFrameratePref(),
  });
  await initializeBinaries();
});

/**
 * 处理主题变更
 */
eagle.onThemeChanged(() => {
  ui.updateTheme();
});

/**
 * 设置 UI 事件监听器
 */
function setupEventListeners() {
  document.getElementById("closeButton").addEventListener("click", () => {
    window.close();
  });

  document.getElementById("depsEntryBtn").addEventListener("click", openDepsPage);
  document.getElementById("depsBackBtn").addEventListener("click", closeDepsPage);

  document.getElementById("tabBtnSettings")?.addEventListener("click", () => {
    ui.switchSubpageTab("settings");
  });
  document.getElementById("tabBtnDeps")?.addEventListener("click", () => {
    ui.switchSubpageTab("dependencies");
  });

  // 自动设置 Eagle 数据来源切换
  const autoAddToggle = document.getElementById("autoAddSourceToggle");
  if (autoAddToggle) {
    autoAddToggle.addEventListener("change", (e) => {
      setAutoAddSourcePref(e.target.checked);
    });
  }

  // Cookie 授权切换
  const cookieToggle = document.getElementById("cookieConsentToggle");
  if (cookieToggle) {
    cookieToggle.addEventListener("change", (e) => {
      setCookieConsentPref(e.target.checked);
    });
  }

  // 清晰度上限选择切换
  const maxResSelect = document.getElementById("maxResolutionSelect");
  if (maxResSelect) {
    maxResSelect.addEventListener("change", (e) => {
      setMaxResolutionPref(e.target.value);
    });
  }

  // 帧率上限选择切换
  const maxFpsSelect = document.getElementById("maxFramerateSelect");
  if (maxFpsSelect) {
    maxFpsSelect.addEventListener("change", (e) => {
      setMaxFrameratePref(e.target.value);
    });
  }

  // yt-dlp 操作按钮事件委托
  document.getElementById("ytdlpActions").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-ytdlp-action]");
    if (btn) handleYtdlpAction(btn.dataset.ytdlpAction);
  });

  // ffmpeg 操作按钮事件委托（触发 Eagle 官方 FFmpeg 依赖安装弹窗或跳转商店）
  const ffmpegActions = document.getElementById("ffmpegActions");
  if (ffmpegActions) {
    ffmpegActions.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-ffmpeg-action]");
      if (btn && btn.dataset.ffmpegAction === "open-store") {
        openEagleFfmpegStore();
      }
    });
  }

  document.addEventListener("startDownload", (e) => {
    addToQueue(e.detail.url);
  });

  // 下载列表事件委托（重试、复制链接）
  document.querySelector(".download-list").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    const id = parseInt(btn.dataset.id);
    if (action === "retry") retryDownload(id);
    if (action === "copyError") copyError(id);
    if (action === "copy") copyUrl(id);
  });
}

/**
 * 打开 Eagle 官方 FFmpeg 依赖安装弹窗或应用商店页面
 */
async function openEagleFfmpegStore() {
  if (typeof eagle !== "undefined" && eagle.extraModule && eagle.extraModule.ffmpeg && typeof eagle.extraModule.ffmpeg.install === "function") {
    try {
      await eagle.extraModule.ffmpeg.install();
      return;
    } catch (e) {}
  }
  const isZh = eagle.app.locale && eagle.app.locale.startsWith("zh");
  const url = isZh
    ? "https://community-cn.eagle.cool/plugin/detail/eagle-plugin-ffmpeg"
    : "https://community.eagle.cool/plugin/detail/eagle-plugin-ffmpeg";
  try {
    const { shell } = require("electron");
    shell.openExternal(url);
  } catch (e) {
    window.open(url, "_blank");
  }
}

/**
 * 初始化二进制文件
 * yt-dlp 和 ffmpeg 均为必需依赖，缺失时进入依赖管理页（门槛模式）
 */
async function initializeBinaries() {
  if (depsReady()) {
    isInitialized = true;
    initializeMainUI();
    // 后台检查 yt-dlp 是否有新版本，有则提示用户（齿轮红点）
    checkForUpdateAndNotify();
    return;
  }

  // 缺少必要依赖：进入依赖管理页门槛模式，装齐后自动进入主界面
  ui.showDepsPage({
    tab: "dependencies",
    gating: true,
    cookieConsentPref: getCookieConsentPref(),
    autoAddSourcePref: getAutoAddSourcePref(),
    maxResolutionPref: getMaxResolutionPref(),
    maxFrameratePref: getMaxFrameratePref(),
  });
  ui.updateDepsBadge(true);
  loadDepsInfo();
}

/**
 * 是否已具备使用插件所需的全部依赖（yt-dlp + ffmpeg）
 */
function depsReady() {
  return isYtDlpInstalled() && !!getFfmpegSource();
}

/**
 * 依赖状态变化后调用：
 * - 已就绪且尚未初始化 → 退出门槛模式，进入主界面
 * - 未就绪 → 锁定依赖页（门槛模式）
 */
function refreshDepsGatingState() {
  if (depsReady()) {
    if (!isInitialized) {
      isInitialized = true;
      ui.hideDepsPage();
      initializeMainUI();
      checkForUpdateAndNotify();
    } else {
      getYtDlpUpdateInfo().then(({ hasUpdate }) => {
        ui.updateDepsBadge(hasUpdate);
      }).catch(() => {
        ui.updateDepsBadge(false);
      });
    }
  } else {
    isInitialized = false;
    ui.setDepsGating(true);
    ui.updateDepsBadge(true);
  }
}

/**
 * 初始化主 UI
 */
function initializeMainUI() {
  ui.showMainUI();
  ui.setupInputBar();
  const urlInput = document.getElementById("urlInput");
  if (urlInput) urlInput.focus();
}

/**
 * 添加下载任务到队列
 */
function addToQueue(url) {
  if (!isInitialized) return;

  const item = {
    id: ++queueIdCounter,
    url,
    title: url,
    state: "waiting",
    progress: 0,
    speed: "",
    error: null,
  };

  downloadQueue.push(item);
  ui.appendQueueItem(item);
  processQueue();
}

/**
 * 处理队列，启动等待中的任务（最多 MAX_CONCURRENT 个并发）
 */
function processQueue() {
  while (activeCount < MAX_CONCURRENT) {
    const nextItem = downloadQueue.find((item) => item.state === "waiting");
    if (!nextItem) break;
    activeCount++;
    executeDownload(nextItem);
  }
}

/**
 * 执行单个下载任务
 */
async function executeDownload(item) {
  try {
    item.state = "preparing";
    ui.updateQueueItem(item.id, item);

    const videoInfo = await downloader.getVideoInfo(item.url);
    item.title = videoInfo.title || i18next.t("error.untitledVideo");
    item.state = "downloading";
    ui.updateQueueItem(item.id, item);

    const results = await downloader.downloadVideo(
      item.url,
      (progress) => {
        item.progress = progress.percent || 0;
        item.speed = progress.currentSpeed || "";
        ui.updateQueueItem(item.id, item);
      },
      null,
      videoInfo
    );

    item.state = "completed";
    item.progress = 100;
    item.speed = "";
    ui.updateQueueItem(item.id, item);

    for (const result of results) {
      const sourceUrl = getAutoAddSourcePref() ? item.url : undefined;
      await importToEagle(result.path, result.metadata, sourceUrl);
      downloader.cleanup(result.path);
    }
  } catch (error) {
    item.state = "error";
    if (error?.code === 'ENETBOUNDARY') {
      item.error = i18next.t("error.blockedAddress");
    } else if (isNetworkError(error)) {
      item.error = i18next.t("error.networkUnavailable");
    } else {
      item.error = error.message || i18next.t("download.failed");
    }
    ui.updateQueueItem(item.id, item);
  } finally {
    activeCount--;
    processQueue();
  }
}

/**
 * 重试失败的下载任务
 */
function retryDownload(id) {
  const item = downloadQueue.find((item) => item.id === id);
  if (!item || item.state !== "error") return;

  item.state = "waiting";
  item.progress = 0;
  item.error = null;
  item.speed = "";
  ui.updateQueueItem(item.id, item);
  processQueue();
}

/**
 * 复制下载任务的错误信息
 */
async function copyError(id) {
  const item = downloadQueue.find((item) => item.id === id);
  if (!item || !item.error) return;
  try {
    await navigator.clipboard.writeText(item.error);
    ui.showCopiedErrorFeedback(id);
  } catch (error) {
    console.error("Failed to copy error:", error);
  }
}

/**
 * 后台检查 yt-dlp 版本，有新版本时更新齿轮红点提示
 */
async function checkForUpdateAndNotify() {
  try {
    const { hasUpdate } = await getYtDlpUpdateInfo();
    ui.updateDepsBadge(hasUpdate || !depsReady());
  } catch (e) {
    ui.updateDepsBadge(!depsReady());
  }
}

/**
 * 打开设置与依赖管理页面并加载信息
 */
function openDepsPage() {
  ui.showDepsPage({
    tab: "settings",
    cookieConsentPref: getCookieConsentPref(),
    autoAddSourcePref: getAutoAddSourcePref(),
    maxResolutionPref: getMaxResolutionPref(),
    maxFrameratePref: getMaxFrameratePref(),
  });
  loadDepsInfo();
}

/**
 * 关闭依赖管理页面，回到主界面
 */
function closeDepsPage() {
  ui.hideDepsPage();
}

/**
 * 加载并展示各依赖的当前状态
 */
function loadDepsInfo(options = {}) {
  const ffmpegSource = getFfmpegSource();
  const ytdlpInstalled = isYtDlpInstalled();

  if (ffmpegSource === "eagle") {
    ui.updateFfmpegCard("eagle", {});
  } else {
    ui.updateFfmpegCard("missing", {});
  }

  if (!ytdlpInstalled) {
    ui.updateYtdlpCard("missing");
    return;
  }

  if (options.ytdlpKnownLatest) {
    ui.updateYtdlpCard("latest", { version: options.ytdlpKnownLatest });
  } else {
    loadYtdlpUpdateStatus();
  }
}

/**
 * 检查 yt-dlp 是否有更新并渲染对应卡片状态
 */
function loadYtdlpUpdateStatus() {
  ui.updateYtdlpCard("installed", { checkingUpdate: true });
  const latestVersion = getLatestYtDlpVersion();

  getInstalledYtDlpVersion().then((installedVersion) => {
    if (!installedVersion) { ui.updateYtdlpCard("missing"); return; }
    if (installedVersion !== latestVersion) {
      ui.updateYtdlpCard("outdated", { installedVersion, latestVersion });
    } else {
      ui.updateYtdlpCard("latest", { version: installedVersion });
    }
  }).catch(() => {});
}

/**
 * 执行 yt-dlp 操作：install / update / reinstall / uninstall
 */
async function handleYtdlpAction(action) {
  if (action === "uninstall") {
    uninstallYtDlp();
    ui.updateYtdlpCard("missing");
    refreshDepsGatingState();
    return;
  }

  const statusKey = {
    install: "deps.installing",
    update: "deps.updating",
    reinstall: "deps.reinstalling",
  }[action] || "deps.updating";

  const doneKey = {
    install: "deps.doneInstalled",
    update: "deps.doneUpdated",
    reinstall: "deps.doneReinstalled",
  }[action] || "deps.doneInstalled";

  const statusText = i18next.t(statusKey);
  ui.updateYtdlpCard("busy", { statusText, percent: 0 });

  try {
    await downloadYtDlp((progress) => {
      ui.updateYtdlpCard("busy", { statusText, percent: progress });
    });

    const version = await getInstalledYtDlpVersion();
    ui.updateYtdlpCard("done", { statusText: i18next.t(doneKey), version });

    setTimeout(() => {
      loadDepsInfo({ ytdlpKnownLatest: version });
      refreshDepsGatingState();
    }, 1500);
  } catch (e) {
    const message = isNetworkError(e) ? i18next.t("error.networkUnavailable") : e.message;
    ui.updateYtdlpCard("error", { message, retryAction: action });
  }
}

/**
 * 复制下载任务的 URL
 */
async function copyUrl(id) {
  const item = downloadQueue.find((item) => item.id === id);
  if (!item) return;

  try {
    await navigator.clipboard.writeText(item.url);
    ui.showCopiedFeedback(id);
  } catch (error) {
    console.error("Failed to copy URL:", error);
  }
}

module.exports = {};
