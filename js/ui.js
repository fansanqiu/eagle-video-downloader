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
 * 显示初始化确认界面
 */
function showInitConfirm() {
  document.getElementById("initContainer")?.classList.remove("hidden");
  document.getElementById("initConfirm")?.classList.remove("hidden");
  document.getElementById("initProgress")?.classList.add("hidden");
  document.getElementById("mainContainer")?.classList.add("hidden");
}

/**
 * 切换到下载进度界面
 */
function showInitDownloading() {
  document.getElementById("initConfirm")?.classList.add("hidden");
  document.getElementById("initProgress")?.classList.remove("hidden");
}

/**
 * 显示主 UI
 */
function showMainUI() {
  document.getElementById("initContainer")?.classList.add("hidden");
  document.getElementById("mainContainer")?.classList.remove("hidden");
}

/**
 * 更新初始化进度显示
 */
function updateInitStatus(message, progress) {
  const initMessage = document.getElementById("initMessage");
  const initProgressFill = document.getElementById("initProgressFill");
  const initPercent = document.getElementById("initPercent");

  if (initMessage) initMessage.textContent = message;
  if (initProgressFill) initProgressFill.style.width = `${progress}%`;
  if (initPercent) initPercent.textContent = `${Math.round(progress)}%`;
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

module.exports = {
  updateTheme,
  showInitConfirm,
  showInitDownloading,
  showMainUI,
  updateInitStatus,
  isValidUrl,
  setupInputBar,
  setInputBarState,
  appendQueueItem,
  updateQueueItem,
  showCopiedFeedback,
  showCopiedErrorFeedback,
};
