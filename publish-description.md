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
Download videos from YouTube, Twitter, TikTok, Bilibili and 1000+ other sites directly into Eagle.

---

## 详细说明（中文）

支持从 YouTube、Twitter / X、TikTok、Bilibili、Instagram、Vimeo 等 1000+ 视频网站下载视频，并自动导入到 Eagle 中保存元数据（标题、作者、来源链接等）。

基于 yt-dlp 构建，使用 Eagle 内置 ffmpeg 处理音视频合并。首次启动时会自动下载 yt-dlp（约 30MB），之后即可直接使用。若 Eagle 内置 ffmpeg 不可用，也可在依赖管理页中一键自动安装。

使用方式：复制视频链接，粘贴到插件输入框，点击下载，完成后自动导入到 Eagle。

内置依赖管理页面，可随时查看 yt-dlp 与 ffmpeg 的版本状态，一键完成安装、更新或重装。启动时自动检查 yt-dlp 是否为最新版，有新版本时顶部横幅提示并支持一键更新。

支持中文和英文界面，下载过程中显示实时进度。

系统要求：Eagle 4.0 或更高版本，需要网络连接。

本项目基于 OlivierEstevez 开发的 eagle-twitter-video-downloader（https://github.com/OlivierEstevez/eagle-twitter-video-downloader）进行扩展，感谢原作者的开创性工作。

---

## 详细说明（英文）

Download videos from YouTube, Twitter / X, TikTok, Bilibili, Instagram, Vimeo, and 1000+ other websites directly into Eagle. Metadata including title, uploader, and source URL is saved automatically.

Built on yt-dlp and uses Eagle's built-in ffmpeg for audio/video merging. On first launch, yt-dlp is downloaded automatically (~30MB). If Eagle's built-in ffmpeg is unavailable, it can be installed with one click from the dependency management page.

How to use: copy a video link, paste it into the plugin input box, click download. The video is imported to Eagle automatically when done.

Includes a built-in dependency management page to check the status of yt-dlp and ffmpeg at any time, with one-click install, update, or reinstall. On startup, the plugin silently checks whether yt-dlp is up to date and shows a banner with a one-click update option when a new version is available.

Supports Chinese and English interfaces with real-time progress display.

System requirements: Eagle 4.0 or higher, internet connection required.

This project is based on eagle-twitter-video-downloader by OlivierEstevez (https://github.com/OlivierEstevez/eagle-twitter-video-downloader). Thanks to the original author for the foundational work.

---

## 标签 / Tags

中文建议标签：视频下载、YouTube、Twitter、TikTok、Bilibili、yt-dlp
英文建议标签：video downloader, YouTube, Twitter, TikTok, Bilibili, yt-dlp

---

## 版本日志（中文）

v2.3.0
- 新增依赖管理页面：查看 yt-dlp 与 ffmpeg 状态，支持一键安装、更新、重装、卸载
- 新增 ffmpeg 自动安装（macOS / Windows）
- 新增 yt-dlp 启动版本检查与一键更新横幅
- 修复 yt-dlp 执行权限丢失问题（EACCES）
- 修复 Bilibili 下载失败问题（HTTP 412）

v2.2.0
- 修复 macOS 下 yt-dlp 因隔离属性无法执行的问题
- 新增"复制错误"按钮方便反馈问题
- 修复下载 Twitter / X 视频时的 SSL 握手失败问题

v2.1.0
- 移除运行时下载 ffmpeg 的逻辑，改为直接使用 Eagle 内置 ffmpeg
- 修复 Windows 平台因 ffmpeg 资源不存在导致初始化失败的问题
- 修复插件内容无法显示的问题
- 项目更名为 eagle-video-downloader

v2.0.0
- 重构为通用视频下载器，底层由 yt-dlp 驱动，支持 1000+ 视频网站
- 支持多视频批量下载，显示实时下载进度
- 新增中英文界面切换
- 新增首次运行自动下载 yt-dlp 的初始化流程

v1.0.0
- 初始版本，支持从 Twitter / X 下载视频并导入 Eagle

---

## 版本日志（英文）

v2.3.0
- Added dependency management page: view yt-dlp and ffmpeg status with one-click install, update, reinstall, and uninstall
- Added ffmpeg auto-install (macOS / Windows)
- Added yt-dlp version check on startup with one-click update banner
- Fixed yt-dlp execute permission loss (EACCES)
- Fixed Bilibili download failures (HTTP 412)

v2.2.0
- Fixed yt-dlp execution failure on macOS caused by quarantine attribute
- Added "Copy Error" button for easier bug reporting
- Fixed SSL handshake failure when downloading Twitter / X videos

v2.1.0
- Removed runtime ffmpeg download; now uses Eagle's built-in ffmpeg directly
- Fixed initialization failure on Windows caused by missing ffmpeg asset
- Fixed blank plugin UI caused by missing i18next dependency
- Renamed project to eagle-video-downloader

v2.0.0
- Rebuilt as a universal video downloader powered by yt-dlp, supporting 1000+ sites
- Added multi-video batch download with real-time progress display
- Added Chinese/English interface switching
- Added first-run initialization flow to auto-download yt-dlp

v1.0.0
- Initial release with Twitter / X video download and Eagle import support
