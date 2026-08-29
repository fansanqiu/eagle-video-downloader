# Eagle Video Downloader 发布说明

发布时按需复制以下内容填写到 Eagle 社区对应字段。

---

## 插件名称

中文：视频下载器
英文：Video Downloader

---

## 简短描述（一句话）

中文：
从 YouTube、Twitter、TikTok、Bilibili 等 1000+ 网站直接下载视频到 Eagle。

英文：
Download video links supported by yt-dlp and import them into Eagle with title, platform tags, and description.

---

## 详细说明（中文）

支持从 YouTube、Twitter / X、TikTok、Bilibili、Instagram、Vimeo 等 1000+ 视频网站下载视频，并自动导入到 Eagle 中保存元数据（标题、平台标签、简介摘要），在开启对应选项时保存原始页面链接。

基于 yt-dlp 构建，使用 Eagle 官方 FFmpeg 插件处理音视频合并。首次启动时需要在依赖管理页中点击安装 yt-dlp（约 30MB）；若本地未检测到 FFmpeg 插件，插件依赖管理页提供了直达 Eagle 官方应用商店的跳转按钮，点击即可前往商店下载并安装官方 FFmpeg 插件。

部分 Pinterest 和 Instagram 视频需要登录状态才能获取。本功能为选用项目，必须由用户主动开启"允许使用浏览器 Cookie"选项。开启后，插件会在下载这些平台视频时读取 Chrome 浏览器的登录 Cookie，并由 yt-dlp 仅发送至对应平台网站的相关请求中。Pinterest 链接若包含第三方视频来源（如 YouTube、Vimeo、TikTok 或 Instagram），插件会尝试直接解析并下载原始来源视频。该选项默认关闭，可随时在偏好设置中撤销。

使用方式：复制视频链接，粘贴到插件输入框，点击下载，完成后自动导入到 Eagle。

内置依赖管理页面，可随时查看 yt-dlp 与 ffmpeg 的版本状态。支持 yt-dlp 一键完成安装、更新或重装，并执行 SHA-256 摘要完整性强制校验；当缺少 FFmpeg 时提供一键跳转 Eagle 商店下载的快捷按钮。

支持中文和英文界面，下载过程中显示实时进度。

系统要求：Eagle 4.0 或更高版本（需安装 Eagle 官方 FFmpeg 插件），需要网络连接。

本项目基于 OlivierEstevez 开发的 eagle-twitter-video-downloader（https://github.com/OlivierEstevez/eagle-twitter-video-downloader）进行扩展，感谢原作者的开创性工作。

---

## 详细说明（英文）

Download video links supported by yt-dlp and import them into Eagle with the title, platform tag, and shortened description; optionally save the original page URL when enabled.

Built on yt-dlp and uses Eagle's official FFmpeg plugin for audio/video merging. On first launch, you need to install yt-dlp (~30 MB) from the dependency management page. If Eagle's built-in FFmpeg is not detected, a button in the dependency page allows one-click navigation to download the official FFmpeg plugin from the Eagle Store.

Some Pinterest and Instagram videos require a logged-in session. Browser cookie access is strictly optional and must be explicitly enabled by the user via "Allow browser cookie access". When enabled, the plugin reads your Chrome login cookies, which are passed by yt-dlp only for requests sent to the respective platform sites. Pinterest links containing third-party video sources (such as YouTube, Vimeo, TikTok, or Instagram) will be parsed to download from the original origin. This option is disabled by default and can be revoked at any time in settings.

How to use: copy a video link, paste it into the plugin input box, click download. The video is imported to Eagle automatically when done.

Includes a built-in dependency management page to check the status of yt-dlp and ffmpeg at any time, with one-click install, update, or reinstall for yt-dlp with mandatory SHA-256 integrity verification, and a direct button to open Eagle Store to download FFmpeg when missing.

Supports Chinese and English interfaces with real-time progress display.

System requirements: Eagle 4.0 or higher (requires official Eagle FFmpeg plugin), internet connection required.

This project is based on eagle-twitter-video-downloader by OlivierEstevez (https://github.com/OlivierEstevez/eagle-twitter-video-downloader). Thanks to the original author for the foundational work.

---

## 标签 / Tags

中文建议标签：视频下载、YouTube、Twitter、TikTok、Bilibili、yt-dlp
英文建议标签：video downloader, YouTube, Twitter, TikTok, Bilibili, yt-dlp

---

## 版本日志（中文）

v2.4.0
- 全面加强二进制文件安全：锁定特定审查版本，强制 SHA-256 摘要完整性校验
- 完全使用 Eagle 官方 FFmpeg 插件，移除所有第三方备用下载逻辑，缺少时支持一键跳转 Eagle 商店下载
- 移除所有 TLS 证书校验跳过逻辑，强制遵循 HTTPS 安全传输
- 新增 Cookie 显式 Opt-in 授权机制，默认禁用浏览器 Cookie 读取
- 加强 URL 与网络边界校验：只允许 HTTPS、阻断 localhost、私有及保留 IPv4/IPv6 地址，DNS 失败直接拒绝
- yt-dlp 仅接受用户主动输入的 HTTPS 链接，并对插件自身的网络请求强制校验目标地址，阻断本机与私有网络

v2.3.0
- 新增依赖管理页面：查看 yt-dlp 与 ffmpeg 状态，支持一键安装、更新、重装、卸载
- 新增 yt-dlp 启动版本检查与一键更新横幅
- 修复 yt-dlp 执行权限丢失问题（EACCES）
- 修复 Bilibili 下载失败问题（HTTP 412）

---

## 版本日志（英文）

v2.4.0
- Comprehensive binary security hardening: pinned reviewed versions with mandatory SHA-256 integrity verification
- Exclusively uses Eagle's official FFmpeg plugin, fully removing fallback ffmpeg downloader logic, with one-click store link when missing
- Removed all TLS certificate verification bypass logic, enforcing secure HTTPS connections
- Added explicit consent flow for browser cookie access, disabled by default
- Enforced strict URL and network boundary validation: HTTPS-only, blocking localhost, private & reserved IPv4/IPv6 addresses, rejecting on DNS failure
- yt-dlp only accepts user-provided HTTPS links, and all plugin-initiated network requests validate the target address, blocking loopback and private networks

v2.3.0
- Added dependency management page: view yt-dlp and ffmpeg status with one-click install, update, reinstall, and uninstall
- Added yt-dlp version check on startup with one-click update banner
- Fixed yt-dlp execute permission loss (EACCES)
- Fixed Bilibili download failures (HTTP 412)
