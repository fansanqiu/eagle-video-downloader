# Eagle Video Downloader 发布说明

发布时按需复制以下内容填写到 Eagle 社区对应字段。

---

## 插件名称

中文：视频下载器
英文：Video Downloader

---

## 简短描述（一句话）

中文：
使用 yt-dlp 下载支持网站的视频，及 Pinterest、Dribbble 的视频与图片，完成后自动将媒体与标题、平台标签和简介摘要导入 Eagle。

英文：
Download videos from yt-dlp-supported sites and videos or images from Pinterest and Dribbble, then import the media into Eagle with titles, platform tags, and description excerpts.

---

## 详细说明（中文）

视频下载器使用 yt-dlp 下载受支持网站的视频，并提供 Pinterest 图钉与 Dribbble 作品的视频、图片解析。下载完成后，媒体文件会自动导入 Eagle，附带标题、平台标签及最多 500 字符的简介摘要。

开始使用：

1. 使用 macOS 或 Windows 上的 Eagle 4.0 或更高版本。打开「依赖管理」，手动点击安装 yt-dlp。插件会下载固定版本的官方发行文件，并执行 SHA-256 完整性校验。macOS 上会为通过校验的 yt-dlp 文件设置执行权限，并清除该文件的隔离标记。
2. 安装 Eagle 官方 FFmpeg 插件；依赖管理页提供前往插件商店的入口。
3. 依赖就绪后，将受支持的 HTTPS 视频页面、Pinterest 图钉或 Dribbble 作品链接粘贴到主界面底部的输入框。
4. 点击「下载」，Dribbble 作品会先显示传往 Jina Reader 的网址及用途，确认后加入队列；取消后网址保留在输入框中。队列最多同时运行 3 个下载任务。完成的媒体会自动导入 Eagle。

下载与偏好设置：

Pinterest 图钉会尝试提取嵌入的第三方视频来源，如 Instagram、YouTube、TikTok 或 Vimeo；图片图钉则提取图片。Dribbble 作品会尝试提取视频或设计图片。实际可下载内容取决于网站与解析结果。

下载适用于无需浏览器登录即可访问的受支持内容。媒体先保存到系统临时目录，成功导入 Eagle 后清理对应临时文件。导入会创建新的 Eagle 项目；已有项目及原始网站内容保持原样。中断或失败的下载可能留下临时文件，可在系统临时目录中的 eagle-video-downloader 文件夹清理。

偏好设置提供分辨率、帧率及自动记录网页来源的选项。原始网页链接默认写入 Eagle 的数据来源字段，可在偏好设置中关闭。画质选择会尝试匹配设置；如果没有匹配格式，后备选择可能使用不带分辨率或帧率限制的格式，实际下载值可能超过设置值。

网络与外部服务：

使用插件及安装依赖需要网络连接。解析 Dribbble 作品页面时，插件会将用户提供的作品网址（URL）发送至第三方 Jina Reader 服务（https://r.jina.ai/），并使用其返回的页面内容提取媒体链接。Dribbble 解析依赖该服务；服务的可用性和返回结果会影响 Dribbble 下载。

插件自身的网络请求使用 HTTPS，并检查本地及私有 IP 地址；传递给 yt-dlp 的 Pinterest 派生目标链接也有平台域名限制。这些检查适用于插件自身发起的请求和传入的目标链接。yt-dlp 后续的 DNS 解析、重定向及媒体分片请求由该进程独立处理。

致谢与开源协议：
- 本项目基于 OlivierEstevez 开发的 eagle-twitter-video-downloader（https://github.com/OlivierEstevez/eagle-twitter-video-downloader）进行扩展，感谢原作者的开创性工作。视频解析与提取由 yt-dlp（https://github.com/yt-dlp/yt-dlp）提供支持，音视频合并与转码由 FFmpeg（https://ffmpeg.org）提供支持。

---

## 详细说明（英文）

Video Downloader uses yt-dlp to download videos from supported sites and provides video and image extraction for Pinterest Pins and Dribbble shots. Completed media is automatically imported into Eagle with a title, a platform tag, and up to 500 characters of the description.

Getting started:

1. Use Eagle 4.0 or later on macOS or Windows. Open Dependencies and click Install for yt-dlp. The plugin downloads a pinned official release and verifies its SHA-256 checksum. On macOS, it sets executable permissions and clears the quarantine attribute only for the verified yt-dlp file.
2. Install Eagle's official FFmpeg plugin. The Dependencies page provides a link to the plugin store.
3. Once the dependencies are ready, paste a supported HTTPS video page, Pinterest Pin, or Dribbble shot URL into the input field at the bottom of the main view.
4. Click Download. For Dribbble shots, the plugin first shows the URL to be sent to Jina Reader and its purpose. Confirm to add the task to the queue, or cancel to keep the URL in the input field. Up to 3 downloads run concurrently, and completed media is automatically imported into Eagle.

Downloads and preferences:

Pinterest Pins are checked for embedded third-party video sources, such as Instagram, YouTube, TikTok, or Vimeo; image Pins are checked for images. Dribbble shots are checked for videos or artwork images. Available downloads depend on the website and extraction results.

Downloads support accessible content that can be retrieved without browser login. Media is saved to a system temporary directory, and the corresponding temporary files are cleaned up after successful Eagle import. Imports create new Eagle items; existing items and the original website content remain unchanged. Interrupted or failed downloads may leave temporary files, which can be cleaned up from the eagle-video-downloader folder in the system temporary directory.

Preferences include resolution, frame rate, and automatic webpage source recording. Saving the original webpage URL to Eagle's data source field is enabled by default and can be turned off in Preferences. Quality selection attempts to match your settings. If a matching format is unavailable, fallback formats may have unrestricted resolution or frame rate, so the downloaded media may exceed your settings.

Network and external services:

Using the plugin and installing dependencies require an internet connection. When parsing a Dribbble shot page, the plugin sends the user-provided shot URL to the third-party Jina Reader service (https://r.jina.ai/) and uses the returned page content to extract media links. Dribbble extraction depends on this service; its availability and response content affect Dribbble downloads.

The plugin's own network requests use HTTPS and check for local and private IP addresses. Pinterest-derived target URLs passed to yt-dlp are also restricted to approved platform domains. These checks apply to requests initiated by the plugin and the target URLs it passes to yt-dlp. Subsequent DNS resolution, redirects, and media segment requests are handled independently by yt-dlp.

Acknowledgements:
- This project is based on eagle-twitter-video-downloader by OlivierEstevez (https://github.com/OlivierEstevez/eagle-twitter-video-downloader). Thanks to the original author for the foundational work. Video extraction is powered by yt-dlp (https://github.com/yt-dlp/yt-dlp), and audio/video merging and transcoding are powered by FFmpeg (https://ffmpeg.org).
