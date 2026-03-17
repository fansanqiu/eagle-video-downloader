/**
 * Eagle 视频下载插件
 * 主入口 - 处理插件初始化和下载队列管理
 */

const { isYtDlpInstalled, isFfmpegInstalled, downloadYtDlp, downloadFfmpeg } = require("./binary");
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

  const initComponentFfmpeg = document.getElementById("initComponentFfmpeg");
  if (initComponentFfmpeg) initComponentFfmpeg.textContent = i18next.t("init.componentFfmpeg");

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
    if (action === "copy") copyUrl(id);
  });
}

/**
 * 初始化二进制文件
 */
async function initializeBinaries() {
  if (isYtDlpInstalled() && isFfmpegInstalled()) {
    isInitialized = true;
    initializeMainUI();
    return;
  }

  // 显示确认界面，等待用户点击
  ui.showInitConfirm();
  await new Promise((resolve) => {
    document.addEventListener("confirmInit", resolve, { once: true });
  });

  // 用户确认，开始下载
  ui.showInitDownloading();

  try {
    if (!isYtDlpInstalled()) {
      ui.updateInitStatus(i18next.t("init.downloadingYtdlp"), 0);
      await downloadYtDlp((progress) => {
        ui.updateInitStatus(i18next.t("init.downloadingYtdlp"), progress);
      });
    }

    if (!isFfmpegInstalled()) {
      ui.updateInitStatus(i18next.t("init.downloadingFfmpeg"), 0);
      await downloadFfmpeg((progress) => {
        ui.updateInitStatus(i18next.t("init.downloadingFfmpeg"), progress);
      });
    }

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
