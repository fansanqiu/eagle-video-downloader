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
  getFfmpegVersion,
  canInstallFfmpeg,
  downloadFfmpeg,
  uninstallFfmpeg,
} = require("./binary");
const downloader = require("./downloader");
const eagleApi = require("./eagle");
const ui = require("./ui");

// 状态管理
let isInitialized = false;

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

  const initTitle = document.getElementById("initTitle");
  if (initTitle) initTitle.textContent = i18next.t("init.title");

  const initComponentYtdlp = document.getElementById("initComponentYtdlp");
  if (initComponentYtdlp) initComponentYtdlp.textContent = i18next.t("init.componentYtdlp");

  const initStartBtn = document.getElementById("initStartBtn");
  if (initStartBtn) initStartBtn.textContent = i18next.t("init.startDownload");
}

/**
 * 初始化插件
 */
eagle.onPluginCreate(async (plugin) => {
  await initI18n();
  applyTranslations();
  ui.updateTheme();
  setupEventListeners();
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

  document.getElementById("updateBannerBtn").addEventListener("click", handleUpdateClick);

  document.getElementById("depsEntryBtn").addEventListener("click", openDepsPage);
  document.getElementById("depsBackBtn").addEventListener("click", closeDepsPage);

  // yt-dlp 操作按钮事件委托
  document.getElementById("ytdlpActions").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-ytdlp-action]");
    if (btn) handleYtdlpAction(btn.dataset.ytdlpAction);
  });

  // ffmpeg 操作按钮事件委托
  document.getElementById("ffmpegActions").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-ffmpeg-action]");
    if (btn) handleFfmpegAction(btn.dataset.ffmpegAction);
  });

  document.getElementById("initStartBtn").addEventListener("click", () => {
    document.dispatchEvent(new CustomEvent("confirmInit"));
  });

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
 * 初始化二进制文件
 * ffmpeg 使用 Eagle 内置版本，仅需下载 yt-dlp
 */
async function initializeBinaries() {
  if (isYtDlpInstalled()) {
    isInitialized = true;
    initializeMainUI();
    // 后台检查 yt-dlp 是否有新版本，有则提示用户
    checkForUpdateAndNotify();
    return;
  }

  // 显示确认界面，等待用户点击
  ui.showInitConfirm();
  await new Promise((resolve) => {
    document.addEventListener("confirmInit", resolve, { once: true });
  });

  // 用户确认，开始下载 yt-dlp
  ui.showInitDownloading();

  try {
    ui.updateInitStatus(i18next.t("init.downloadingYtdlp"), 0);
    await downloadYtDlp((progress) => {
      ui.updateInitStatus(i18next.t("init.downloadingYtdlp"), progress);
    });

    ui.updateInitStatus(i18next.t("init.complete"), 100);
    await new Promise((resolve) => setTimeout(resolve, 500));

    isInitialized = true;
    initializeMainUI();
  } catch (error) {
    ui.updateInitStatus(`${i18next.t("init.failed")}: ${error.message}`, 0);
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
      await eagleApi.importToEagle(result.path, result.metadata, item.url);
      downloader.cleanup(result.path);
    }
  } catch (error) {
    item.state = "error";
    item.error = error.message || i18next.t("download.failed");
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
 * 后台检查 yt-dlp 版本，有新版本时显示更新横幅
 */
async function checkForUpdateAndNotify() {
  try {
    const { hasUpdate, latestVersion } = await getYtDlpUpdateInfo();
    if (hasUpdate) {
      ui.showUpdateAvailable(latestVersion);
    }
  } catch (e) {
    // 网络错误时静默忽略，不影响主功能
  }
}

/**
 * 打开依赖管理页面并加载信息
 */
function openDepsPage() {
  ui.showDepsPage();
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
 *
 * 三阶段渲染：
 *   阶段 0（同步，瞬间）：existsSync 判断是否安装 → 立即渲染状态 + 按钮
 *   阶段 1（后台，~200ms）：spawn 子进程取本地版本号 → 补充版本显示
 *   阶段 2（后台，~1-3s）：GitHub API 检查最新版 → 静默更新徽章
 */
function loadDepsInfo() {
  // 阶段 0：纯同步，立即渲染
  const ffmpegSource = getFfmpegSource();
  const ytdlpInstalled = isYtDlpInstalled();

  if (ffmpegSource === 'eagle') {
    ui.updateFfmpegCard('eagle', {});
  } else if (ffmpegSource === 'own') {
    ui.updateFfmpegCard('installed', {});
  } else {
    ui.updateFfmpegCard('missing', { canInstall: canInstallFfmpeg() });
  }

  if (!ytdlpInstalled) {
    ui.updateYtdlpCard("missing");
    return;
  }
  // 同步阶段即刻显示"检查更新中..."，版本号由后台 spawn 补充
  ui.updateYtdlpCard("installed", { checkingUpdate: true });

  // 两条异步线同时启动，互不等待
  const installedVersionP = getInstalledYtDlpVersion();
  const latestVersionP    = getLatestYtDlpVersion();

  // 线 1：本地版本（spawn，~200ms）到了立刻补充版本号
  installedVersionP.then((installedVersion) => {
    if (!installedVersion) { ui.updateYtdlpCard("missing"); return; }
    ui.updateYtdlpCard("installed", { version: installedVersion, checkingUpdate: true });

    // 等最新版本结果到达后更新徽章
    latestVersionP.then((latestVersion) => {
      if (installedVersion !== latestVersion) {
        ui.updateYtdlpCard("outdated", { installedVersion, latestVersion });
      } else {
        ui.updateYtdlpCard("latest", { version: installedVersion });
      }
    }).catch(() => {
      // 网络不通：移除"检查中"提示，保留已安装状态
      ui.updateYtdlpCard("installed", { version: installedVersion });
    });
  }).catch(() => {});

  // ffmpeg 版本独立获取
  if (ffmpegSource) {
    getFfmpegVersion().then((ffmpegVersion) => {
      if (ffmpegSource === 'eagle') ui.updateFfmpegCard('eagle', { version: ffmpegVersion });
      else if (ffmpegSource === 'own') ui.updateFfmpegCard('installed', { version: ffmpegVersion });
    }).catch(() => {});
  }
}

/**
 * 执行 ffmpeg 操作：install / reinstall / uninstall
 */
async function handleFfmpegAction(action) {
  if (action === 'uninstall') {
    uninstallFfmpeg();
    ui.updateFfmpegCard('missing', { canInstall: canInstallFfmpeg() });
    return;
  }

  const statusKey = action === 'reinstall' ? 'deps.reinstalling' : 'deps.installing';
  const doneKey   = action === 'reinstall' ? 'deps.doneReinstalled' : 'deps.doneInstalled';
  const statusText = i18next.t(statusKey);

  ui.updateFfmpegCard('busy', { statusText, percent: 0 });

  try {
    await downloadFfmpeg((progress) => {
      ui.updateFfmpegCard('busy', { statusText, percent: progress });
    });

    const version = await getFfmpegVersion();
    ui.updateFfmpegCard('done', { statusText: i18next.t(doneKey), version });
    setTimeout(() => loadDepsInfo(), 1500);
  } catch (e) {
    loadDepsInfo();
  }
}

/**
 * 执行 yt-dlp 操作：install / update / reinstall / uninstall
 */
async function handleYtdlpAction(action) {
  if (action === "uninstall") {
    uninstallYtDlp();
    ui.updateYtdlpCard("missing");
    ui.hideUpdateBanner();   // 同步隐藏主界面的更新横幅
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

    // 更新或安装成功后隐藏主界面的更新横幅
    if (action === "update") ui.hideUpdateBanner();

    // 1.5 秒后重新检查最终状态
    setTimeout(() => loadDepsInfo(), 1500);
  } catch (e) {
    loadDepsInfo();
  }
}

/**
 * 处理用户点击「更新」按钮
 */
async function handleUpdateClick() {
  ui.setUpdateBannerUpdating(0);
  try {
    await downloadYtDlp((progress) => {
      ui.setUpdateBannerUpdating(progress);
    });
    ui.setUpdateBannerDone();
    setTimeout(() => ui.hideUpdateBanner(), 2000);
  } catch (e) {
    ui.hideUpdateBanner();
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
