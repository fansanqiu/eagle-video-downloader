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
    return url.protocol === "https:";
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

  const isError = item.state === "error";
  el.innerHTML = `
    <div class="item-title">${escapeHtml(item.title)}</div>
    <div class="item-progress-bar">
      <div class="item-progress-fill" style="width: ${item.progress}%"></div>
    </div>
    <div class="item-footer ${isError ? "" : "hidden"}">
      <span class="item-meta">${escapeHtml(getMetaText(item))}</span>
      <div class="item-actions">
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

  const footer = el.querySelector(".item-footer");
  const isError = data.state === "error";
  if (footer) {
    footer.classList.toggle("hidden", !isError);
    if (isError) {
      const meta = footer.querySelector(".item-meta");
      if (meta) meta.textContent = getMetaText(data);
    }
  }
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
 * 根据状态生成元信息文本（仅 error 时使用）
 */
function getMetaText(item) {
  if (item.state === "error") {
    return item.error || i18next.t("queue.error");
  }
  return "";
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
    statusEl:     document.getElementById(`${prefix}Badge`),
    detailEl:     document.getElementById(`${prefix}Detail`),
    progressWrap: document.getElementById(`${prefix}ProgressWrap`),
    progressFill: document.getElementById(`${prefix}ProgressFill`),
    actionsEl:    document.getElementById(`${prefix}Actions`),
  };
}

/**
 * 更新设置按钮指示红点状态
 * @param {boolean} hasNotice
 */
function updateDepsBadge(hasNotice) {
  const badge = document.getElementById("depsBadge");
  if (!badge) return;
  badge.classList.toggle("hidden", !hasNotice);
}

/**
 * 切换子页面分栏（Settings / Dependencies）
 * @param {'settings' | 'dependencies'} tabName
 */
function switchSubpageTab(tabName) {
  const tabBtnSettings = document.getElementById("tabBtnSettings");
  const tabBtnDeps = document.getElementById("tabBtnDeps");
  const settingsPanel = document.getElementById("settingsPanel");
  const depsPanel = document.getElementById("depsPanel");

  if (tabName === "settings") {
    tabBtnSettings?.classList.add("active");
    tabBtnDeps?.classList.remove("active");
    settingsPanel?.classList.remove("hidden");
    depsPanel?.classList.add("hidden");
  } else {
    tabBtnSettings?.classList.remove("active");
    tabBtnDeps?.classList.add("active");
    settingsPanel?.classList.add("hidden");
    depsPanel?.classList.remove("hidden");
  }
}

/**
 * 显示偏好设置与依赖管理页面
 * @param {Object} opts
 * @param {'settings' | 'dependencies'} opts.tab - 初始标签页
 * @param {boolean} opts.gating - 是否为「门槛模式」（依赖未就绪，强制停留在此页，隐藏返回按钮）
 * @param {boolean} opts.cookieConsentPref - Cookie 授权状态
 * @param {boolean} opts.autoAddSourcePref - 是否自动设置 Eagle 数据来源
 */
function showDepsPage({ tab = "settings", gating = false, cookieConsentPref = false, autoAddSourcePref = true, maxResolutionPref = "auto", maxFrameratePref = "auto" } = {}) {
  // 填充静态文本
  const tabBtnSettings = document.getElementById("tabBtnSettings");
  const tabBtnDeps = document.getElementById("tabBtnDeps");
  const autoAddLabel = document.getElementById("autoAddSourceLabel");
  const autoAddHint = document.getElementById("autoAddSourceHint");
  const autoAddToggle = document.getElementById("autoAddSourceToggle");
  const cookieLabel = document.getElementById("cookieConsentLabel");
  const cookieHint = document.getElementById("cookieConsentHint");
  const cookieToggle = document.getElementById("cookieConsentToggle");
  const maxResLabel = document.getElementById("maxResolutionLabel");
  const maxResHint = document.getElementById("maxResolutionHint");
  const maxResSelect = document.getElementById("maxResolutionSelect");
  const maxFpsLabel = document.getElementById("maxFramerateLabel");
  const maxFpsHint = document.getElementById("maxFramerateHint");
  const maxFpsSelect = document.getElementById("maxFramerateSelect");
  const notice = document.getElementById("depsNotice");
  const ytdlpDesc = document.getElementById("ytdlpDesc");
  const ffmpegDesc = document.getElementById("ffmpegDesc");

  if (tabBtnSettings) tabBtnSettings.textContent = i18next.t("deps.tabSettings");
  if (tabBtnDeps) tabBtnDeps.textContent = i18next.t("deps.tabDependencies");
  if (autoAddLabel) autoAddLabel.textContent = i18next.t("deps.autoAddSourceLabel");
  if (autoAddHint) autoAddHint.textContent = i18next.t("deps.autoAddSourceHint");
  if (autoAddToggle) autoAddToggle.checked = autoAddSourcePref;
  if (cookieLabel) cookieLabel.textContent = i18next.t("deps.cookieConsentLabel");
  if (cookieHint) cookieHint.textContent = i18next.t("deps.cookieConsentHint");
  if (cookieToggle) cookieToggle.checked = cookieConsentPref;

  if (maxResLabel) maxResLabel.textContent = i18next.t("deps.maxResolutionLabel");
  if (maxResHint) maxResHint.textContent = i18next.t("deps.maxResolutionHint");
  if (maxResSelect) {
    if (maxResSelect.options[0]) maxResSelect.options[0].textContent = i18next.t("deps.resAuto");
    maxResSelect.value = maxResolutionPref || "auto";
  }

  if (maxFpsLabel) maxFpsLabel.textContent = i18next.t("deps.maxFramerateLabel");
  if (maxFpsHint) maxFpsHint.textContent = i18next.t("deps.maxFramerateHint");
  if (maxFpsSelect) {
    if (maxFpsSelect.options[0]) maxFpsSelect.options[0].textContent = i18next.t("deps.fpsAuto");
    maxFpsSelect.value = maxFrameratePref || "auto";
  }

  if (notice) notice.textContent = i18next.t("deps.setupRequired");
  if (ytdlpDesc) ytdlpDesc.textContent = i18next.t("deps.ytdlpDesc");
  if (ffmpegDesc) ffmpegDesc.textContent = i18next.t("deps.ffmpegDesc");

  switchSubpageTab(gating ? "dependencies" : tab);

  document.getElementById("depsContainer")?.classList.remove("hidden");
  document.getElementById("mainContainer")?.classList.add("hidden");
  setDepsGating(gating);
}

/**
 * 切换依赖页的「门槛模式」：隐藏/显示返回按钮，显示/隐藏强制安装提示
 */
function setDepsGating(gating) {
  document.querySelector(".subpage-header")?.classList.toggle("hidden", gating);
  document.getElementById("depsNotice")?.classList.toggle("hidden", !gating);
  if (gating) {
    switchSubpageTab("dependencies");
  }
}

/**
 * 隐藏依赖管理页面，恢复主界面
 */
function hideDepsPage() {
  setDepsGating(false);
  document.getElementById("depsContainer")?.classList.add("hidden");
  document.getElementById("mainContainer")?.classList.remove("hidden");
}

/**
 * 更新 yt-dlp 卡片状态
 * state: 'checking' | 'latest' | 'outdated' | 'missing' | 'busy' | 'done' | 'installed' | 'error'
 * data: { version, installedVersion, latestVersion, statusText, percent, message, retryAction }
 */
function updateYtdlpCard(state, data = {}) {
  const { statusEl, detailEl, progressWrap, progressFill, actionsEl } = getDepCardEls("ytdlp");

  if (!statusEl) return;

  statusEl.className = "dep-badge";
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
      if (actionsEl) {
        actionsEl.innerHTML = `
          <button class="dep-btn" data-ytdlp-action="reinstall">${i18next.t("deps.reinstall")}</button>
          <button class="dep-btn danger" data-ytdlp-action="uninstall">${i18next.t("deps.uninstall")}</button>
        `;
      }
      break;
    }

    case "latest":
      statusEl.classList.add("ok");
      statusEl.textContent = i18next.t("deps.latest");
      if (detailEl) detailEl.textContent = i18next.t("deps.versionInstalled", { version: data.version });
      if (actionsEl) {
        actionsEl.innerHTML = `
          <button class="dep-btn" data-ytdlp-action="reinstall">${i18next.t("deps.reinstall")}</button>
          <button class="dep-btn danger" data-ytdlp-action="uninstall">${i18next.t("deps.uninstall")}</button>
        `;
      }
      break;

    case "outdated":
      statusEl.classList.add("update");
      statusEl.textContent = i18next.t("deps.outdated");
      if (detailEl) detailEl.textContent = i18next.t("deps.versionUpdate", { from: data.installedVersion, to: data.latestVersion });
      if (actionsEl) {
        actionsEl.innerHTML = `
          <button class="dep-btn primary" data-ytdlp-action="update">${i18next.t("deps.update")}</button>
          <button class="dep-btn" data-ytdlp-action="reinstall">${i18next.t("deps.reinstall")}</button>
          <button class="dep-btn danger" data-ytdlp-action="uninstall">${i18next.t("deps.uninstall")}</button>
        `;
      }
      break;

    case "missing":
      statusEl.classList.add("missing");
      statusEl.textContent = i18next.t("deps.missing");
      if (detailEl) detailEl.textContent = "";
      if (actionsEl) {
        actionsEl.innerHTML = `
          <button class="dep-btn primary" data-ytdlp-action="install">${i18next.t("deps.install")}</button>
        `;
      }
      break;

    case "error":
      statusEl.classList.add("missing");
      statusEl.textContent = i18next.t("deps.downloadFailed");
      if (detailEl) detailEl.textContent = data.message || "";
      if (actionsEl) {
        actionsEl.innerHTML = `
          <button class="dep-btn primary" data-ytdlp-action="${data.retryAction || 'install'}">${i18next.t("deps.retry")}</button>
        `;
      }
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
      if (actionsEl) {
        actionsEl.innerHTML = `
          <button class="dep-btn" data-ytdlp-action="reinstall">${i18next.t("deps.reinstall")}</button>
          <button class="dep-btn danger" data-ytdlp-action="uninstall">${i18next.t("deps.uninstall")}</button>
        `;
      }
      break;
  }
}

/**
 * 更新 ffmpeg 卡片状态
 * state: 'checking' | 'eagle' | 'missing'
 * data: { version }
 */
function updateFfmpegCard(state, data = {}) {
  const { statusEl, detailEl, progressWrap, actionsEl } = getDepCardEls("ffmpeg");

  if (!statusEl) return;

  statusEl.className = "dep-badge";
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
        detailEl.textContent = i18next.t("deps.ffmpegManaged");
      }
      if (actionsEl) actionsEl.innerHTML = "";
      break;

    // 未找到 Eagle 内置 ffmpeg：提供「安装 FFmpeg 依赖」按钮
    case "missing":
    default:
      statusEl.classList.add("missing");
      statusEl.textContent = i18next.t("deps.notFound");
      if (detailEl) {
        detailEl.textContent = i18next.t("deps.ffmpegNotFoundHint");
      }
      if (actionsEl) {
        actionsEl.innerHTML = `<button class="dep-btn primary" data-ffmpeg-action="open-store">${i18next.t("deps.installFfmpegDep")}</button>`;
      }
      break;
  }
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
  showDepsPage,
  hideDepsPage,
  setDepsGating,
  switchSubpageTab,
  updateDepsBadge,
  updateYtdlpCard,
  updateFfmpegCard,
};
