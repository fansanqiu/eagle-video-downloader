# Changelog

## 3.0.1

- 修正双语商店介绍：补充 Jina Reader 作品 URL 传输、解析用途与服务依赖，功能说明同步至实际安装包
- Dribbble 下载前显示网址和第三方解析用途，确认后继续；取消时保留输入
- 同名下载使用独立临时目录，避免并发任务覆盖或误删彼此的文件
- yt-dlp 安装和更新先在暂存目录完成 SHA-256 校验，通过后替换组件；失败时保留已安装版本
- 使用 Eagle 提供的插件路径保存 yt-dlp，安装和卸载范围限定于本插件目录
- 更新 yt-dlp 至官方 2026.10.21，并同步核对各平台 SHA-256 摘要
- Dribbble 解析拒绝 Jina 的 HTTP 错误响应，媒体下载处理传输中断
- 修正分辨率、帧率及底部输入框说明，补充本地临时文件和导入行为

---

- Corrected both store introductions to disclose Dribbble shot URL transmission to Jina Reader, its purpose and service dependency, and align features with the package
- Dribbble downloads show the transmitted URL and purpose for confirmation; cancellation preserves the input
- Downloads use separate temporary directories to prevent same-title tasks from overwriting or deleting each other's files
- yt-dlp installation and updates verify SHA-256 in a staging directory before replacing the component; failures preserve the installed version
- yt-dlp uses the plugin path supplied by Eagle, keeping installation and removal within this plugin's directory
- Updated yt-dlp to official release 2026.10.21 with verified checksums for each platform
- Dribbble extraction rejects failed Jina HTTP responses, and media downloads handle interrupted transfers
- Corrected resolution, frame rate, and input location descriptions; documented temporary files and Eagle import behavior

## 3.0.0

全新 3.0.0 界面规范：
- 重构主面板、下载队列卡片与底部输入栏
- 新增「偏好设置」与「依赖管理」分栏
- 版本更新提示改由设置齿轮红点徽标接管（替代原顶部横幅）

新增偏好设置：
- 可配置分辨率（最高 / 4K / 1080P 等）与帧率（最高 / 60fps / 30fps 等）；后备格式可能使用不带这些限制的画质，实际下载值可能超过设置值
- 可选择是否将原始网页链接写入 Eagle 数据来源（默认开启）

新增 Pinterest 支持：
- 支持 Pinterest 图钉下载；转存内容自动提取第三方源（Instagram、YouTube、TikTok、Vimeo）并优先下载源视频
- 纯图片 Pin 自动获取高清原图

新增 Dribbble 支持：
- 支持 Dribbble 作品页面视频与设计图片解析下载，自动提取 CDN 高清 MP4 直链与原图
- 解析时将用户提供的作品 URL 发送至第三方 Jina Reader（https://r.jina.ai/），使用其返回的页面内容提取媒体链接；Dribbble 下载依赖该服务的可用性与返回结果

商店资料修正：
- 双语介绍同步说明外部服务依赖、实际偏好设置、画质后备选择与底部输入框位置
- 双语界面同步说明分辨率及帧率偏好的后备格式可能超过设置值

错误提示与体验优化：
- 针对不支持的网站或链接提供友好的本地化提示与下载指引，替代底层命令行报错

依赖管理调整：
- FFmpeg 改为依赖 Eagle 官方 FFmpeg 插件，未安装时可一键跳转应用商店（不再自行下载 FFmpeg）
- yt-dlp 锁定官方发布版本 2026.08.19 并强制 SHA-256 完整性校验
- 移除下载源选择（镜像加速 / GitHub 直连），统一走 GitHub 官方源

安全与隐私加强：
- 移除所有第三方镜像源与不安全的 SSL 校验跳过逻辑
- 插件自身发起的请求限定 HTTPS，阻断本地地址、私有 IP、非标准端口与含凭证（user:pass@host）的链接
- 传递给 yt-dlp 的派生目标 URL 严格限制在已批准平台域名范围内（该边界不覆盖 yt-dlp 子进程自身的 DNS 解析与请求）
- 网络异常与安全阻断分类提示，错误文案本地化

---

Redesigned UI & UX to 3.0.0 Specification:
- Rebuilt main view, download queue cards, and bottom input bar
- Added dedicated Preferences and Dependency Management tabs
- Update notifications replaced by badge indicator on the settings icon (previously a top banner)

New Preferences:
- Configurable resolution (Auto / 4K / 1080P, etc.) and frame rate (Auto / 60fps / 30fps, etc.); fallback formats may have unrestricted quality, so downloads may exceed these settings
- Option to save the original webpage URL as the Eagle item source (enabled by default)

New Pinterest Support:
- Download Pinterest pins (video & image); automatically extracts embedded third-party sources (Instagram, YouTube, TikTok, Vimeo) and downloads from the original source when available
- Automatically fetches full-resolution images for image-only Pins

New Dribbble Support:
- Extract and download videos and artwork images from Dribbble shot pages, automatically fetching direct high-res MP4 files and original images
- Parsing sends the user-provided shot URL to the third-party Jina Reader service (https://r.jina.ai/) and uses the returned page content to extract media links; Dribbble downloads depend on its availability and response content

Store Listing Corrections:
- Both introductions describe external service dependencies, available preferences, quality fallback behavior, and the bottom input field
- Both interfaces explain that fallback formats may exceed resolution and frame rate preferences

Error Handling & UX Improvements:
- Clear localized guidance and actionable tips for unsupported sites and error states instead of raw CLI errors

Dependency Management Changes:
- FFmpeg now requires the Eagle Official FFmpeg Plugin; a one-click link to the store is shown if it is not installed (no longer downloads FFmpeg automatically)
- yt-dlp is pinned to the official release 2026.08.19 with mandatory SHA-256 integrity verification
- Removed download source selection (mirror / GitHub direct); now always downloads from the official GitHub release

Security & Privacy Hardening:
- Removed all third-party mirror sources and insecure SSL bypass logic
- The plugin's own requests are limited to HTTPS and block local addresses, private IPs, non-standard ports, and URLs with embedded credentials
- Derived target URLs passed to yt-dlp are strictly limited to approved platform domains (this boundary does not cover yt-dlp's own DNS resolution or requests)
- Network errors and security blocks are reported separately with localized messages


## 2.3.0

- 新增依赖管理页面：可查看 yt-dlp 与 ffmpeg 的安装状态和版本，支持一键安装、更新、重装、卸载
- 首次使用时若 yt-dlp 或 ffmpeg 未就绪，自动锁定在依赖管理页（门槛模式），装齐后自动进入主界面
- 新增 ffmpeg 自动安装：macOS 从 eagle-plugin-ffmpeg 官方仓库下载，Windows 从 BtbN 静态构建下载，无需手动操作
- 新增下载源选择：自动（直连优先、失败切镜像）、镜像加速（国内网络推荐）、GitHub 直连（已配置代理/VPN）
- 新增 yt-dlp 启动版本检查，发现新版本时在主界面顶部显示更新横幅，一键更新
- 新增依赖安装/更新失败时的错误提示与重试按钮
- 修复 yt-dlp 因拷贝/恢复等操作丢失执行权限后无法运行的问题（EACCES）
- 修复 yt-dlp 二进制文件损坏（Mach-O 格式错误等）导致无法执行的问题，自动删除并重新下载
- 修复更新或重装 yt-dlp/ffmpeg 时，若下载失败会误删当前可用旧版本的问题
- 修复 Bilibili 视频下载失败的问题（HTTP 412），自动补充必要请求头并在失败时重试
- 优化依赖页加载体验：进入页面瞬间即显示安装状态与操作按钮，版本号和更新状态由后台异步补充
- 优化安装/更新完成后的状态显示，避免出现多余的"检查更新中"提示

---

- Added dependency management page: view installation status and version of yt-dlp and ffmpeg, with one-click install, update, reinstall, and uninstall
- On first use, if yt-dlp or ffmpeg is missing, the app locks onto the dependency page (gated mode) until both are installed, then opens the main view automatically
- Added ffmpeg auto-install: downloads from eagle-plugin-ffmpeg (macOS) or BtbN static builds (Windows) automatically
- Added download source selection: Automatic (direct first, falls back to mirrors), Mirror (recommended for Mainland China), or GitHub Direct (if using a proxy/VPN)
- Added yt-dlp version check on startup; shows an update banner in the main UI when a newer version is available
- Added error message and retry button when a dependency install/update fails
- Fixed yt-dlp losing execute permission after file copy or restore operations (EACCES)
- Fixed yt-dlp failing to run when its binary was corrupted (e.g. Mach-O format error); now automatically re-downloads it
- Fixed updating/reinstalling yt-dlp or ffmpeg deleting the existing working binary if the new download failed
- Fixed Bilibili download failures (HTTP 412) by adding required request headers and auto-retrying on failure
- Improved dependency page load experience: installation status and action buttons appear instantly; version number and update status are filled in asynchronously
- Improved post-install/update status display, removing a redundant "checking for updates" flash

## 2.2.0

- 修复 macOS 下 yt-dlp 因系统隔离属性（quarantine）导致无法执行的问题
- 新增 yt-dlp 自动版本检查，启动时后台静默更新至最新版
- 下载出错时新增"复制错误"按钮，方便用户复制完整错误信息反馈问题
- 优化错误提示，区分文件不存在（ENOENT）与权限不足（EACCES）两种情况
- 修复下载 Twitter / X 视频时因 SSL 握手异常（UNEXPECTED_EOF）导致的失败，遇到 SSL 错误时自动重试
- 修复 yt-dlp 下载与版本检查中的 SSL 兼容性问题，并补全 307 / 308 重定向支持

---

- Fixed yt-dlp execution failure on macOS caused by system quarantine attribute
- Added automatic yt-dlp version check; silently updates to the latest version on startup
- Added "Copy Error" button on failed download items for easier bug reporting
- Improved error messages to distinguish between missing binary (ENOENT) and permission denied (EACCES)
- Fixed SSL handshake failure (UNEXPECTED_EOF) when downloading Twitter / X videos; now automatically retries with SSL verification relaxed
- Fixed SSL compatibility in yt-dlp download and version check requests; added support for 307 / 308 redirects

## 2.1.0

- 移除运行时下载 ffmpeg 的逻辑，改为直接使用 Eagle 内置 ffmpeg
- 修复 Windows 平台因 ffmpeg 资源不存在导致初始化失败的问题
- 修复插件内容无法显示的问题（补全缺失的 i18next 依赖）
- 项目更名为 eagle-video-downloader，反映其全平台视频下载能力

---

- Removed runtime ffmpeg download; now uses Eagle's built-in ffmpeg directly
- Fixed initialization failure on Windows caused by missing ffmpeg asset
- Fixed blank plugin UI caused by missing i18next dependency
- Renamed project to eagle-video-downloader to reflect support for sites backed by yt-dlp

## 2.0.0

- 重构为通用视频下载器，底层由 yt-dlp 驱动，支持 yt-dlp 支持的视频网站
- 重构项目结构，源码迁移至 Plugin/ 目录，引入 esbuild 构建流程
- 重构下载逻辑，支持多视频批量下载（autonumber 模板）
- 重构 UI，引入下载队列模式，显示实时下载进度
- 重构国际化系统，引入 i18next，支持中英文切换
- 新增初始化流程，首次运行自动下载 yt-dlp

---

- Rebuilt as a universal video downloader powered by yt-dlp, supporting sites backed by yt-dlp
- Restructured project layout; source moved to Plugin/ with esbuild bundling
- Added multi-video batch download support
- Redesigned UI with download queue and real-time progress display
- Introduced i18next for Chinese/English internationalization
- Added first-run initialization flow to auto-download yt-dlp

## 1.0.0

- 初始版本，支持从 Twitter / X 下载视频并导入 Eagle

---

- Initial release with Twitter / X video download and Eagle import support
