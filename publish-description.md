# Eagle Video Downloader 发布说明

发布时按需复制以下内容填写到 Eagle 社区对应字段。

---

## 插件名称

中文：视频下载器
英文：Video Downloader

---

## 简短描述（一句话）

中文：
从 YouTube、Twitter / X、TikTok、Bilibili、Pinterest 等 1000+ 网站下载视频与图片并导入 Eagle。

英文：
Download videos and images from 1000+ sites supported by yt-dlp and import them into Eagle with title, platform tags, and description.

---

## 详细说明（中文）

支持从 YouTube、Twitter / X、TikTok、Bilibili、Instagram、Pinterest、Vimeo 等 1000+ 视频网站下载视频与图片，并自动导入到 Eagle。导入时自动保存视频标题、平台解析标签与简介摘要（截取前 500 字符）；当用户在偏好设置中开启“自动设置 Eagle 数据来源”选项时，将同步写入原始网页链接。

采用全新的 3.0.0 界面设计规范，提供独立的偏好设置与依赖管理分栏：

- **个性化偏好设置**：
  - 支持自定义清晰度上限（最高画质 / 4K / 1080P 等）与帧率上限（最高帧率 / 60fps / 30fps 等），未找到对应规格时自动向下匹配最高可用画质。
  - 支持配置是否自动在 Eagle 中记录原始网页来源链接（默认开启）。
- **智能平台解析**：
  - 新增 Pinterest 图钉（视频与图片）下载，针对转存内容自动前置提取第三方源地址（如 Instagram、YouTube、TikTok、Vimeo 等原始来源）并优先下载源视频；纯图片 Pin 自动获取高清原图。
  - 站点适配器模块化架构，全面提升各平台解析稳定性。
- **浏览器 Cookie 授权与隐私说明**：
  - **选用功能**：浏览器 Cookie 功能属于可选设置，默认保持禁用状态，必须由用户在偏好设置中主动开启授权。
  - **数据读取与使用范围**：开启授权后，插件在必要时通过 yt-dlp 的 `--cookies-from-browser chrome` 读取本机 Google Chrome 浏览器的登录 Cookie。匹配的 Cookie 仅由本地 yt-dlp 在向对应平台发送请求时使用（用于解析与下载受限或高清内容），适用范围包括用户输入的平台链接（如 Instagram、Pinterest、YouTube 等）以及从 Pinterest 等页面提取的第三方原始媒体来源（如 YouTube、Vimeo、TikTok、Instagram 等）。
  - **隐私安全保障**：插件本身不收集、不存储且不向任何第三方服务器上传任何 Cookie 数据，所有请求均在本地与平台官方服务器之间直接进行。严格遵循网络安全边界校验，阻断本地与私有 IP 地址访问。
- **依赖管理与安装流程**：
  - 插件由 **yt-dlp**（视频解析与提取）与 **FFmpeg**（音视频合并与转码）提供核心支持。
  - **首次使用或依赖缺失**：插件会打开依赖管理页（门槛模式），用户需在依赖管理页手动点击“安装”按钮以完成 yt-dlp 安装（锁定官方发布版本并强制执行 SHA-256 完整性校验）；FFmpeg 需配合 Eagle 官方 FFmpeg 插件使用，若未检测到可直接在依赖管理页点击一键跳转至 Eagle 应用商店快速安装。

### 使用方法

1. 首次使用时，在依赖管理页面点击安装 yt-dlp，并确保已安装 Eagle 官方 FFmpeg 插件。
2. 复制支持的视频或图片网页链接。
3. 粘贴到插件输入框，点击“下载”。
4. 下载完成后自动导入到 Eagle。

### 系统要求

- Eagle 4.0 或更高版本
- 需安装 Eagle 官方 FFmpeg 插件（用于音视频合并与转码）
- 需要网络连接

### 致谢与开源协议

本项目基于 OlivierEstevez 开发的 eagle-twitter-video-downloader（https://github.com/OlivierEstevez/eagle-twitter-video-downloader）进行扩展，感谢原作者的开创性工作。

---

## 详细说明（英文）

Download videos and images from YouTube, Twitter / X, TikTok, Bilibili, Instagram, Pinterest, Vimeo, and 1000+ other websites directly into Eagle. Imported items include the video title, platform tag, and description summary (truncated to 500 characters). The original webpage URL is recorded into Eagle items when the user enables the data source preference.

Built with the 3.0.0 design system featuring dedicated Preferences and Dependency Management tabs:

- **Customizable Preferences**:
  - Configure maximum resolution limits (Auto / 4K / 1080P, etc.) and framerate caps (Auto / 60fps / 30fps, etc.), automatically falling back to the highest available quality.
  - Option to automatically save the original webpage URL into Eagle's item source field (enabled by default).
- **Smart Platform Extraction**:
  - Added Pinterest pin (video & image) support with automatic extraction of embedded third-party source URLs (e.g., original Instagram, YouTube, TikTok, or Vimeo sources) to download the original video; automatically fetches full-resolution images for image pins.
  - Modularized site adapters for improved maintainability and extraction performance across platforms.
- **Browser Cookie Usage & Privacy Disclosure**:
  - **Optional Feature**: Browser cookie access is strictly optional, disabled by default, and requires explicit user opt-in in the Preferences tab.
  - **Data Access & Scope**: When enabled by the user, the plugin uses yt-dlp's `--cookies-from-browser chrome` to read login cookies from Google Chrome. Matching cookies are used by yt-dlp exclusively when sending requests to relevant target services to access login-restricted or high-quality content, including direct platform URLs (e.g. Instagram, Pinterest, YouTube) and third-party media sources extracted from Pinterest pins (such as YouTube, Vimeo, TikTok, or Instagram).
  - **Privacy & Security**: The plugin does not collect, store, or upload cookie data to any third-party servers. All operations occur strictly locally between yt-dlp and the respective platform's official servers. Strict network boundary validation prevents access to localhost and private IP addresses.
- **Dependency Management & Setup Flow**:
  - Powered by **yt-dlp** (video extraction engine) and **FFmpeg** (audio/video merging and transcoding).
  - **First-Time Setup**: If any component is missing, the plugin opens the Dependency Management tab. Users must click the "Install" button in the dependency panel to install yt-dlp (downloads the pinned official release with mandatory SHA-256 integrity verification). FFmpeg requires the official Eagle FFmpeg plugin; if not detected, users can click the one-click store button to install it from the Eagle Plugin Center.

### How to Use

1. On first run, open the Dependency Management tab to install yt-dlp, and ensure Eagle's official FFmpeg plugin is installed.
2. Copy a video or image link from a supported website.
3. Paste the URL into the input field and click "Download".
4. The media is automatically imported into Eagle once download finishes.

### System Requirements

- Eagle 4.0 or higher
- Eagle Official FFmpeg Plugin (required for audio/video merging)
- Internet connection

### Acknowledgements

This project is based on eagle-twitter-video-downloader by OlivierEstevez (https://github.com/OlivierEstevez/eagle-twitter-video-downloader). Thanks to the original author for the foundational work.

---

## 标签 / Tags

中文建议标签：视频下载、YouTube、Twitter、TikTok、Bilibili、Pinterest、yt-dlp
英文建议标签：video downloader, YouTube, Twitter, TikTok, Bilibili, Pinterest, yt-dlp
