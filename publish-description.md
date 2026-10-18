# Eagle Video Downloader 发布说明

发布时按需复制以下内容填写到 Eagle 社区对应字段。

---

## 插件名称

中文：视频下载器
英文：Video Downloader

---

## 简短描述（一句话）

中文：
使用 yt-dlp 下载支持网站的视频，及 Pinterest、Dribbble 等设计平台的视频与图片，完成后自动将媒体与标题、平台标签和简介摘要导入 Eagle。

英文：
Download videos from yt-dlp-supported sites, as well as Pinterest and Dribbble media, then import completed files into Eagle with titles, platform tags, and description excerpts.

---

## 详细说明（中文）

使用步骤：

1. 首次使用时，在插件的「依赖管理」页安装 yt-dlp，并安装 Eagle 官方 FFmpeg 插件。
2. 依赖安装完成后自动进入主界面。
3. 复制受支持网站的 HTTPS 媒体链接（视频页面、Pinterest 图钉或 Dribbble 作品链接）。
4. 将链接粘贴到主界面顶部的输入框。
5. 点击输入框右侧的「下载」按钮，任务会加入下载队列（最多 3 个并发）。
6. 下载完成后，媒体文件会自动导入 Eagle，并附带标题、平台标签与简介摘要。

支持从 YouTube、Twitter / X、TikTok、Bilibili、Instagram、Pinterest、Dribbble、Vimeo 等 yt-dlp 支持的网站下载视频，同时支持下载 Pinterest 纯图片 Pin 与 Dribbble 设计作品原图，并自动导入到 Eagle。导入时自动保存视频标题、平台解析标签与简介摘要（截取前 500 字符）；当用户在偏好设置中开启「自动设置 Eagle 数据来源」选项时，将同步写入原始网页链接。

采用全新的 3.0.0 界面设计规范，提供独立的偏好设置与依赖管理分栏：

个性化偏好设置：
- 支持自定义清晰度上限（最高画质 / 4K / 1080P 等）与帧率上限（最高帧率 / 60fps / 30fps 等），未找到对应规格时自动向下匹配最高可用画质。
- 支持配置是否自动在 Eagle 中记录原始网页来源链接（默认开启）。

智能平台解析：
- 新增 Pinterest 图钉（视频与图片）下载，针对转存内容自动前置提取第三方源地址（如 Instagram、YouTube、TikTok、Vimeo 等原始来源）并优先下载源视频；纯图片 Pin 自动获取高清原图。
- 新增 Dribbble 作品（视频与图片）解析与下载支持，自动提取 CDN 原始高清 MP4 视频与设计图片。
- 站点适配器模块化架构，全面提升各平台解析稳定性。

依赖管理与安装流程：
- 插件由 yt-dlp（视频解析与提取）与 FFmpeg（音视频合并与转码）提供核心支持。
- 首次使用或依赖缺失：插件会打开依赖管理页（门槛模式），用户需在依赖管理页手动点击”安装”按钮以完成 yt-dlp 安装（锁定官方发布版本并强制执行 SHA-256 完整性校验）；FFmpeg 需配合 Eagle 官方 FFmpeg 插件使用，若未检测到可直接在依赖管理页点击一键跳转至 Eagle 应用商店快速安装。

致谢与开源协议：
- 本项目基于 OlivierEstevez 开发的 eagle-twitter-video-downloader（https://github.com/OlivierEstevez/eagle-twitter-video-downloader）进行扩展，感谢原作者的开创性工作。视频解析与提取由 yt-dlp（https://github.com/yt-dlp/yt-dlp）提供支持，音视频合并与转码由 FFmpeg（https://ffmpeg.org）提供支持。

---

## 详细说明（英文）

How to use:

1. On first launch, install yt-dlp from the Dependencies tab and install Eagle's official FFmpeg plugin.
2. Once both dependencies are ready, the main view opens automatically.
3. Copy a supported HTTPS media URL (a video page URL, Pinterest Pin URL, or Dribbble shot URL).
4. Paste the URL into the input field at the top of the main view.
5. Click the Download button next to the input field; the task is added to the download queue (up to 3 concurrent downloads).
6. When a download completes, the media is imported into Eagle automatically, together with its title, a platform tag, and a description excerpt.

Video Downloader uses yt-dlp to download videos from supported sites, and also downloads image-only Pinterest Pins and Dribbble design media, importing completed files into Eagle. Imported items include the title, a platform tag, and up to 500 characters of the description. Saving the original page as the Eagle data source is enabled by default and can be turned off in Preferences. Key features include downloading supported videos, downloading Pinterest Pins and Dribbble shots, setting maximum resolution and frame rate, and automatically importing completed media into Eagle. First-time setup requires yt-dlp and Eagle's official FFmpeg plugin, plus an internet connection.

Built with the 3.0.0 design system featuring dedicated Preferences and Dependency Management tabs:

Customizable Preferences:
- Configure maximum resolution limits (Auto / 4K / 1080P, etc.) and framerate caps (Auto / 60fps / 30fps, etc.), automatically falling back to the highest available quality.
- Option to automatically save the original webpage URL into Eagle's item source field (enabled by default).

Smart Platform Extraction:
- Added Pinterest pin (video & image) support with automatic extraction of embedded third-party source URLs (e.g., original Instagram, YouTube, TikTok, or Vimeo sources) to download the original video; automatically fetches full-resolution images for image pins.
- Added Dribbble shot (video & image) extraction and download support, automatically extracting original high-res MP4 video and artwork from Dribbble CDN.
- Modularized site adapters for improved maintainability and extraction performance across platforms.

Dependency Management & Setup Flow:
- Powered by yt-dlp (video extraction engine) and FFmpeg (audio/video merging and transcoding).
- First-Time Setup: If any component is missing, the plugin opens the Dependency Management tab. Users must click the "Install" button in the dependency panel to install yt-dlp (downloads the pinned official release with mandatory SHA-256 integrity verification). FFmpeg requires the official Eagle FFmpeg plugin; if not detected, users can click the one-click store button to install it from the Eagle Plugin Center.

Acknowledgements:
- This project is based on eagle-twitter-video-downloader by OlivierEstevez (https://github.com/OlivierEstevez/eagle-twitter-video-downloader). Thanks to the original author for the foundational work. Video extraction is powered by yt-dlp (https://github.com/yt-dlp/yt-dlp), and audio/video merging and transcoding are powered by FFmpeg (https://ffmpeg.org).
