# Changelog

## 3.0.0

- 全新 UI 规范与交互重构：
  - 升级界面至 Figma 3.0.0 规范，重构主面板、下载队列卡片、底部输入栏与操作按钮
  - 新增偏好设置与依赖管理分栏：支持配置清晰度上限、帧率上限、数据来源记录及 Cookie 授权
  - 优化更新提示机制，由设置齿轮红点徽标统一接管版本更新提示
- 新增平台支持与智能解析：
  - 新增 Pinterest 图钉下载（视频与图片），自动提取第三方源链接（如 Instagram、YouTube、TikTok、Vimeo 等原始来源）并优先下载源视频，纯图片 Pin 自动获取高清原图
  - 站点适配器模块化重构，提升解析效率与可维护性
- 规范化元数据导入与来源记录：
  - 明确导入 Eagle 时保存元数据（标题、平台标签、截取前 500 字符的简介摘要）
  - 原始网页链接作为可选记录项，仅在用户开启“自动设置 Eagle 数据来源”偏好设置时写入
- 全面加强安全与隐私合规（符合 Eagle 商店审核标准）：
  - 明确依赖安装流程：缺少 yt-dlp 或 FFmpeg 时进入依赖管理页，由用户手动点击安装 yt-dlp（锁定版本 2026.08.19 并强制执行 SHA-256 完整性校验）；FFmpeg 依赖 Eagle 官方插件，未检测到时支持一键跳转应用商店
  - 完善浏览器 Cookie 授权机制与隐私披露：作为选用功能默认关闭，需用户主动开启；开启后通过 yt-dlp 读取 Chrome 登录 Cookie，仅在请求受限内容及 Pinterest 提取的第三方来源时使用匹配 Cookie，全程不收集、不上传任何用户数据
  - 移除所有第三方代理/镜像源与不安全 SSL 忽略逻辑，强制走官方受信任源与 HTTPS 安全连接
  - 引入网络安全边界（net-guard），严格校验 URL 并阻断 localhost 及私有/保留 IP 地址
- 优化网络连接与下载稳定性：
  - 恢复系统默认网络代理行为，适配系统代理与 VPN 环境
  - 优化 DNS 解析与多 CDN 节点自动回退，修复节点连接卡顿
  - 完善网络异常分类与本地化错误文案

---

- Redesigned UI & UX to 3.0.0 Specification:
  - Upgraded UI to Figma 3.0.0 design system; refreshed main view, download queue cards, and bottom input bar
  - Added dedicated tabs for Preferences and Dependency Management, supporting custom max resolution, max framerate, source URL recording, and cookie permissions
  - Improved update notifications with non-intrusive badge indicator on the settings icon
- New Platforms & Enhanced Extraction:
  - Added Pinterest pin support (video & image), with automatic third-party source extraction (e.g. original Instagram, YouTube, TikTok, Vimeo sources) and high-resolution fallback for image pins
  - Modularized site adapters for improved maintainability and extraction performance
- Precise Metadata & Source URL Import:
  - Accurately imports video title, platform extractor tags, and description summary (truncated to 500 characters) into Eagle
  - Original webpage URL is saved to Eagle items only when the "Auto-set Eagle Data Source" preference is enabled by the user
- Comprehensive Security, Privacy & Dependency Compliance (Eagle Store Review Standards):
  - Transparent Dependency Flow: Missing dependencies open the Dependency Management tab; users manually install yt-dlp (pinned 2026.08.19 with mandatory SHA-256 verification); FFmpeg utilizes Eagle's official plugin with one-click store redirection when missing
  - Explicit Browser Cookie Opt-in & Privacy Disclosure: Browser cookie access is strictly optional and disabled by default; when enabled, yt-dlp reads Chrome login cookies and applies matching cookies solely for target platform requests and third-party media extracted from Pinterest pins (e.g. Instagram, YouTube, TikTok, Vimeo). No cookie data is collected or uploaded to third parties
  - Removed third-party mirror sources and insecure SSL bypasses, enforcing official trusted origins and HTTPS encryption
  - Introduced network security boundary (net-guard) to validate URLs and block localhost and private/reserved IP addresses
- Optimized Network & Download Stability:
  - Restored system default network proxy behavior, compatible with system proxies and VPNs
  - Improved DNS resolution with multi-CDN fallback to prevent connection stalls
  - Enhanced network error classification and localized error messaging


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
- Renamed project to eagle-video-downloader to reflect support for 1000+ sites

## 2.0.0

- 重构为通用视频下载器，底层由 yt-dlp 驱动，支持 1000+ 视频网站
- 重构项目结构，源码迁移至 Plugin/ 目录，引入 esbuild 构建流程
- 重构下载逻辑，支持多视频批量下载（autonumber 模板）
- 重构 UI，引入下载队列模式，显示实时下载进度
- 重构国际化系统，引入 i18next，支持中英文切换
- 新增初始化流程，首次运行自动下载 yt-dlp

---

- Rebuilt as a universal video downloader powered by yt-dlp, supporting 1000+ sites
- Restructured project layout; source moved to Plugin/ with esbuild bundling
- Added multi-video batch download support
- Redesigned UI with download queue and real-time progress display
- Introduced i18next for Chinese/English internationalization
- Added first-run initialization flow to auto-download yt-dlp

## 1.0.0

- 初始版本，支持从 Twitter / X 下载视频并导入 Eagle

---

- Initial release with Twitter / X video download and Eagle import support
