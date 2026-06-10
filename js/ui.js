/**
 * UI 管理模块
 * 处理用户界面交互
 */

/**
 * 更新 UI 主题
 */
function updateTheme() {
  const THEME_SUPPORT = {
    AUTO: eagle.app.isDarkColors() ? "gray" : "light",
    LIGHT: "light",
    LIGHTGRAY: "lightgray",
    GRAY: "gray",
    DARK: "dark",
    BLUE: "blue",
    PURPLE: "purple",
  };

  const theme = eagle.app.theme.toUpperCase();
  const themeName = THEME_SUPPORT[theme] ?? "dark";
  const htmlEl = document.querySelector("html");

  htmlEl.classList.add("no-transition");
  htmlEl.setAttribute("theme", themeName);
  htmlEl.setAttribute("platform", eagle.app.platform);
  htmlEl.classList.remove("no-transition");
}

/**
 * 显示主 UI
 */
function showMainUI() {
  document.getElementById("mainContainer")?.classList.remove("hidden");
}

/**
 * 验证 URL 格式
 */
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
}

/**
 * 设置输入栏事件
 */
function setupInputBar() {
  const urlInput = document.getElementById("urlInput");
  const addButton = document.getElementById("addButton");

  if (!urlInput || !addButton) return;

  addButton.classList.add("disabled");

  urlInput.addEventListener("input", () => {
    setInputBarState("idle");
    addButton.classList.toggle("disabled", urlInput.value.trim().length === 0);
  });

  const handleSubmit = () => {
    const url = urlInput.value.trim();
    if (!url) return;

    if (!isValidUrl(url)) {
      setInputBarState("error", i18next.t("error.invalidUrl"));
      return;
    }

    document.dispatchEvent(new CustomEvent("startDownload", { detail: { url } }));
    urlInput.value = "";
    addButton.classList.add("disabled");
    setInputBarState("idle");
  };

  addButton.addEventListener("click", handleSubmit);

  urlInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleSubmit();
  });
}

/**
 * 设置输入栏状态（idle / error）
 */
function setInputBarState(state, errorMessage = "") {
  const addButton = document.getElementById("addButton");
  const buttonImg = addButton?.querySelector("img");
  const tooltip = addButton?.querySelector(".error-tooltip");

  addButton?.classList.remove("error");
  if (tooltip) tooltip.textContent = "";
  if (buttonImg) buttonImg.src = "assets/icon_download.svg";

  if (state === "error") {
    addButton?.classList.add("error");
    if (tooltip && errorMessage) tooltip.textContent = errorMessage;
    if (buttonImg) buttonImg.src = "assets/icon_error.svg";
  }
}

/**
 * 追加单个队列项到列表末尾
 */
function appendQueueItem(item) {
  const list = document.querySelector(".download-list");
  if (!list) return;
  list.appendChild(createQueueItemEl(item));
  // 自动滚动到底部
  list.scrollTop = list.scrollHeight;
}

/**
 * 创建队列项 DOM 元素
 */
function createQueueItemEl(item) {
  const el = document.createElement("div");
  el.className = `download-item ${item.state}`;
  el.dataset.id = item.id;

  el.innerHTML = `
    <div class="item-title">${escapeHtml(item.title)}</div>
    <div class="item-progress-bar">
      <div class="item-progress-fill" style="width: ${item.progress}%"></div>
    </div>
    <div class="item-footer">
      <span class="item-meta">${escapeHtml(getMetaText(item))}</span>
      <div class="item-actions ${item.state === "error" ? "" : "hidden"}">
        <button class="item-action-btn" data-action="retry" data-id="${item.id}">${i18next.t("queue.retry")}</button>
        <button class="item-action-btn" data-action="copyError" data-id="${item.id}" id="copy-error-btn-${item.id}">${i18next.t("queue.copyError")}</button>
        <button class="item-action-btn" data-action="copy" data-id="${item.id}" id="copy-btn-${item.id}">${i18next.t("queue.copyUrl")}</button>
      </div>
    </div>
  `;

  return el;
}

/**
 * 局部更新队列项（避免全量重渲染）
 */
function updateQueueItem(id, data) {
  const el = document.querySelector(`.download-item[data-id="${id}"]`);
  if (!el) return;

  el.className = `download-item ${data.state}`;

  const titleEl = el.querySelector(".item-title");
  if (titleEl) titleEl.textContent = data.title;

  const fill = el.querySelector(".item-progress-fill");
  if (fill) fill.style.width = `${data.progress}%`;

  const meta = el.querySelector(".item-meta");
  if (meta) meta.textContent = getMetaText(data);

  const actions = el.querySelector(".item-actions");
  if (actions) actions.classList.toggle("hidden", data.state !== "error");
}

/**
 * 显示"已复制"反馈（复制链接按钮）
 */
function showCopiedFeedback(id) {
  const btn = document.getElementById(`copy-btn-${id}`);
  if (!btn) return;
  const original = btn.textContent;
  btn.textContent = i18next.t("queue.copied");
  setTimeout(() => { btn.textContent = original; }, 1500);
}

/**
 * 显示"已复制"反馈（复制错误按钮）
 */
function showCopiedErrorFeedback(id) {
  const btn = document.getElementById(`copy-error-btn-${id}`);
  if (!btn) return;
  const original = btn.textContent;
  btn.textContent = i18next.t("queue.copied");
  setTimeout(() => { btn.textContent = original; }, 1500);
}

/**
 * 根据状态生成元信息文本
 */
function getMetaText(item) {
  switch (item.state) {
    case "waiting":
      return i18next.t("queue.waiting");
    case "preparing":
      return i18next.t("queue.preparing");
    case "downloading":
      return item.speed
        ? `${Math.round(item.progress)}% · ${item.speed}`
        : `${Math.round(item.progress)}%`;
    case "completed":
      return i18next.t("queue.completed");
    case "error":
      return item.error || i18next.t("queue.error");
    default:
      return "";
  }
}

/**
 * HTML 转义
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getDepCardEls(prefix) {
  return {
    statusEl:     document.getElementById(`${prefix}Status`),
    detailEl:     document.getElementById(`${prefix}Detail`),
    progressWrap: document.getElementById(`${prefix}ProgressWrap`),
    progressFill: document.getElementById(`${prefix}ProgressFill`),
    actionsEl:    document.getElementById(`${prefix}Actions`),
  };
}

function getUpdateBannerEls() {
  return {
    availableRow: document.getElementById("updateAvailableRow"),
    progressRow:  document.getElementById("updateProgressRow"),
    progressText: document.getElementById("updateProgressText"),
    progressFill: document.getElementById("updateProgressFill"),
  };
}

/**
 * 显示依赖管理页面
 * @param {Object} opts
 * @param {boolean} opts.gating - 是否为「门槛模式」（依赖未就绪，强制停留在此页，隐藏返回按钮）
 * @param {'auto'|'mirror'|'direct'} opts.sourcePref - 当前下载源偏好
 */
function showDepsPage({ gating = false, sourcePref = 'auto' } = {}) {
  // 填充静态文本
  const backBtn = document.getElementById("depsBackBtn");
  const subTitle = document.querySelector(".deps-subheader-title");
  const notice = document.getElementById("depsNotice");
  const ytdlpDesc = document.getElementById("ytdlpDesc");
  const ffmpegDesc = document.getElementById("ffmpegDesc");
  const sourceLabel = document.getElementById("depsSourceLabel");
  const sourceSelect = document.getElementById("depsSourceSelect");
  if (backBtn) backBtn.textContent = i18next.t("deps.back");
  if (subTitle) subTitle.textContent = i18next.t("deps.title");
  if (notice) notice.textContent = i18next.t("deps.setupRequired");
  if (ytdlpDesc) ytdlpDesc.textContent = i18next.t("deps.ytdlpDesc");
  if (ffmpegDesc) ffmpegDesc.textContent = i18next.t("deps.ffmpegDesc");
  if (sourceLabel) sourceLabel.textContent = i18next.t("deps.sourceLabel");
  if (sourceSelect) {
    sourceSelect.innerHTML = `
      <option value="auto">${i18next.t("deps.sourceAuto")}</option>
      <option value="mirror">${i18next.t("deps.sourceMirror")}</option>
      <option value="direct">${i18next.t("deps.sourceDirect")}</option>
    `;
    sourceSelect.value = sourcePref;
  }
  updateDownloadSourceHint(sourcePref);

  document.getElementById("depsContainer")?.classList.remove("hidden");
  document.getElementById("mainContainer")?.classList.add("hidden");
  document.getElementById("depsEntryBtn")?.classList.add("hidden");
  setDepsGating(gating);
}

/**
 * 更新下载源说明文案
 * @param {'auto'|'mirror'|'direct'} sourcePref
 */
function updateDownloadSourceHint(sourcePref) {
  const hintEl = document.getElementById("depsSourceHint");
  if (!hintEl) return;
  const key = {
    auto: "deps.sourceHintAuto",
    mirror: "deps.sourceHintMirror",
    direct: "deps.sourceHintDirect",
  }[sourcePref] || "deps.sourceHintAuto";
  hintEl.textContent = i18next.t(key);
}

/**
 * 切换依赖页的「门槛模式」：隐藏/显示返回按钮，显示/隐藏强制安装提示
 */
function setDepsGating(gating) {
  document.getElementById("depsBackBtn")?.classList.toggle("hidden", gating);
  document.getElementById("depsNotice")?.classList.toggle("hidden", !gating);
}

/**
 * 隐藏依赖管理页面，恢复主界面
 */
function hideDepsPage() {
  setDepsGating(false);
  document.getElementById("depsContainer")?.classList.add("hidden");
  document.getElementById("mainContainer")?.classList.remove("hidden");
  document.getElementById("depsEntryBtn")?.classList.remove("hidden");
}

/**
 * 更新 yt-dlp 卡片状态
 * state: 'checking' | 'latest' | 'outdated' | 'missing' | 'busy' | 'done'
 * data: { version, installedVersion, latestVersion, statusText, percent }
 */
function updateYtdlpCard(state, data = {}) {
  const { statusEl, detailEl, progressWrap, progressFill, actionsEl } = getDepCardEls('ytdlp');

  if (!statusEl) return;

  statusEl.className = "dep-status";
  progressWrap?.classList.add("hidden");

  switch (state) {
    case "checking":
      statusEl.classList.add("checking");
      statusEl.textContent = i18next.t("deps.checking");
      if (detailEl) detailEl.textContent = "";
      if (actionsEl) actionsEl.innerHTML = "";
      break;

    case "installed": {
      statusEl.classList.add("ok");
      statusEl.textContent = i18next.t("deps.installed");
      if (detailEl) {
        const versionPart = data.version
          ? i18next.t("deps.versionInstalled", { version: data.version })
          : "";
        const checkingPart = data.checkingUpdate
          ? i18next.t("deps.checkingUpdate")
          : "";
        detailEl.textContent = [versionPart, checkingPart].filter(Boolean).join("  ·  ");
      }
      if (actionsEl) actionsEl.innerHTML = `
        <button class="dep-btn" data-ytdlp-action="reinstall">${i18next.t("deps.reinstall")}</button>
        <button class="dep-btn danger" data-ytdlp-action="uninstall">${i18next.t("deps.uninstall")}</button>
      `;
      break;
    }

    case "latest":
      statusEl.classList.add("ok");
      statusEl.textContent = i18next.t("deps.latest");
      if (detailEl) detailEl.textContent = i18next.t("deps.versionInstalled", { version: data.version });
      if (actionsEl) actionsEl.innerHTML = `
        <button class="dep-btn" data-ytdlp-action="reinstall">${i18next.t("deps.reinstall")}</button>
        <button class="dep-btn danger" data-ytdlp-action="uninstall">${i18next.t("deps.uninstall")}</button>
      `;
      break;

    case "outdated":
      statusEl.classList.add("update");
      statusEl.textContent = i18next.t("deps.outdated");
      if (detailEl) detailEl.textContent = i18next.t("deps.versionUpdate", { from: data.installedVersion, to: data.latestVersion });
      if (actionsEl) actionsEl.innerHTML = `
        <button class="dep-btn primary" data-ytdlp-action="update">${i18next.t("deps.update")}</button>
        <button class="dep-btn" data-ytdlp-action="reinstall">${i18next.t("deps.reinstall")}</button>
        <button class="dep-btn danger" data-ytdlp-action="uninstall">${i18next.t("deps.uninstall")}</button>
      `;
      break;

    case "missing":
      statusEl.classList.add("missing");
      statusEl.textContent = i18next.t("deps.missing");
      if (detailEl) detailEl.textContent = "";
      if (actionsEl) actionsEl.innerHTML = `
        <button class="dep-btn primary" data-ytdlp-action="install">${i18next.t("deps.install")}</button>
      `;
      break;

    case "error":
      statusEl.classList.add("missing");
      statusEl.textContent = i18next.t("deps.downloadFailed");
      if (detailEl) detailEl.textContent = data.message || "";
      if (actionsEl) actionsEl.innerHTML = `
        <button class="dep-btn primary" data-ytdlp-action="${data.retryAction || 'install'}">${i18next.t("deps.retry")}</button>
      `;
      break;

    case "busy": {
      statusEl.classList.add("busy");
      statusEl.textContent = data.statusText || i18next.t("deps.updating");
      const pct = Math.round(data.percent || 0);
      if (detailEl) detailEl.textContent = i18next.t("deps.progressText", { percent: pct });
      progressWrap?.classList.remove("hidden");
      if (progressFill) progressFill.style.width = `${pct}%`;
      if (actionsEl) actionsEl.innerHTML = "";
      break;
    }

    case "done":
      statusEl.classList.add("ok");
      statusEl.textContent = data.statusText || i18next.t("deps.doneInstalled");
      if (detailEl) detailEl.textContent = data.version ? i18next.t("deps.versionInstalled", { version: data.version }) : "";
      if (actionsEl) actionsEl.innerHTML = `
        <button class="dep-btn" data-ytdlp-action="reinstall">${i18next.t("deps.reinstall")}</button>
        <button class="dep-btn danger" data-ytdlp-action="uninstall">${i18next.t("deps.uninstall")}</button>
      `;
      break;
  }
}

/**
 * 更新 ffmpeg 卡片状态
 * state: 'checking' | 'eagle' | 'installed' | 'missing' | 'busy' | 'done'
 * data: { version, statusText, percent, canInstall }
 */
function updateFfmpegCard(state, data = {}) {
  const { statusEl, detailEl, progressWrap, progressFill, actionsEl } = getDepCardEls('ffmpeg');

  if (!statusEl) return;

  statusEl.className = "dep-status";
  progressWrap?.classList.add("hidden");

  switch (state) {
    case "checking":
      statusEl.classList.add("checking");
      statusEl.textContent = i18next.t("deps.checking");
      if (detailEl) detailEl.textContent = "";
      if (actionsEl) actionsEl.innerHTML = "";
      break;

    // Eagle 内置版本：只读展示，不提供操作按钮
    case "eagle":
      statusEl.classList.add("ok");
      statusEl.textContent = i18next.t("deps.eagleBuiltin");
      if (detailEl) {
        detailEl.textContent = data.version
          ? i18next.t("deps.versionInstalled", { version: data.version })
          : i18next.t("deps.ffmpegManaged");
      }
      if (actionsEl) actionsEl.innerHTML = "";
      break;

    // 插件自管理版本：提供重装和卸载
    case "installed":
      statusEl.classList.add("ok");
      statusEl.textContent = i18next.t("deps.latest");
      if (detailEl) {
        detailEl.textContent = data.version
          ? i18next.t("deps.versionInstalled", { version: data.version })
          : "";
      }
      if (actionsEl) actionsEl.innerHTML = `
        <button class="dep-btn" data-ffmpeg-action="reinstall">${i18next.t("deps.reinstall")}</button>
        <button class="dep-btn danger" data-ffmpeg-action="uninstall">${i18next.t("deps.uninstall")}</button>
      `;
      break;

    // 未安装：根据平台决定是否显示安装按钮
    case "missing":
      statusEl.classList.add("missing");
      statusEl.textContent = i18next.t("deps.notFound");
      if (detailEl) {
        detailEl.textContent = data.canInstall
          ? i18next.t("deps.ffmpegNotFoundHint")
          : i18next.t("deps.ffmpegUnsupported");
      }
      if (actionsEl) {
        actionsEl.innerHTML = data.canInstall ? `
          <button class="dep-btn primary" data-ffmpeg-action="install">${i18next.t("deps.install")}</button>
        ` : "";
      }
      break;

    case "error":
      statusEl.classList.add("missing");
      statusEl.textContent = i18next.t("deps.downloadFailed");
      if (detailEl) detailEl.textContent = data.message || "";
      if (actionsEl) actionsEl.innerHTML = `
        <button class="dep-btn primary" data-ffmpeg-action="${data.retryAction || 'install'}">${i18next.t("deps.retry")}</button>
      `;
      break;

    // 操作进行中：显示进度条
    case "busy": {
      statusEl.classList.add("busy");
      statusEl.textContent = data.statusText || i18next.t("deps.installing");
      const pct = Math.round(data.percent || 0);
      if (detailEl) detailEl.textContent = i18next.t("deps.progressText", { percent: pct });
      progressWrap?.classList.remove("hidden");
      if (progressFill) progressFill.style.width = `${pct}%`;
      if (actionsEl) actionsEl.innerHTML = "";
      break;
    }

    // 操作完成：短暂展示后恢复真实状态
    case "done":
      statusEl.classList.add("ok");
      statusEl.textContent = data.statusText || i18next.t("deps.doneInstalled");
      if (detailEl) {
        detailEl.textContent = data.version
          ? i18next.t("deps.versionInstalled", { version: data.version })
          : "";
      }
      if (actionsEl) actionsEl.innerHTML = `
        <button class="dep-btn" data-ffmpeg-action="reinstall">${i18next.t("deps.reinstall")}</button>
        <button class="dep-btn danger" data-ffmpeg-action="uninstall">${i18next.t("deps.uninstall")}</button>
      `;
      break;
  }
}

/**
 * 显示更新横幅（可更新状态）
 */
function showUpdateAvailable(latestVersion) {
  const banner = document.getElementById("updateBanner");
  const text = document.getElementById("updateBannerText");
  const btn = document.getElementById("updateBannerBtn");
  const availableRow = document.getElementById("updateAvailableRow");
  const progressRow = document.getElementById("updateProgressRow");

  if (!banner) return;
  if (text) text.textContent = i18next.t("update.available", { version: latestVersion });
  if (btn) btn.textContent = i18next.t("update.clickToUpdate");
  availableRow?.classList.remove("hidden");
  progressRow?.classList.add("hidden");
  banner.classList.remove("hidden");
}

/**
 * 切换横幅为更新进度状态
 */
function setUpdateBannerUpdating(percent) {
  const { availableRow, progressRow, progressText, progressFill } = getUpdateBannerEls();
  availableRow?.classList.add("hidden");
  progressRow?.classList.remove("hidden");
  if (progressText) progressText.textContent = i18next.t("update.updating", { percent: Math.round(percent) });
  if (progressFill) progressFill.style.width = `${Math.round(percent)}%`;
}

/**
 * 切换横幅为完成状态
 */
function setUpdateBannerDone() {
  const { availableRow, progressRow, progressText, progressFill } = getUpdateBannerEls();
  availableRow?.classList.add("hidden");
  progressRow?.classList.remove("hidden");
  if (progressText) progressText.textContent = i18next.t("update.done");
  if (progressFill) progressFill.style.width = "100%";
}

/**
 * 隐藏更新横幅
 */
function hideUpdateBanner() {
  document.getElementById("updateBanner")?.classList.add("hidden");
}

module.exports = {
  updateTheme,
  showMainUI,
  isValidUrl,
  setupInputBar,
  setInputBarState,
  appendQueueItem,
  updateQueueItem,
  showCopiedFeedback,
  showCopiedErrorFeedback,
  showUpdateAvailable,
  setUpdateBannerUpdating,
  setUpdateBannerDone,
  hideUpdateBanner,
  showDepsPage,
  hideDepsPage,
  setDepsGating,
  updateDownloadSourceHint,
  updateYtdlpCard,
  updateFfmpegCard,
};
