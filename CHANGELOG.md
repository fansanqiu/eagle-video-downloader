# Changelog

## 2.4.0

- 重构安全与隐私机制（符合 Eagle 商店审核要求）：
  - 锁定二进制依赖版本（yt-dlp 2026.07.04），新增 SHA-256 摘要完整性校验，校验失败自动清除文件
  - 移除所有第三方代理/镜像源（`gh-proxy.com`、`ghfast.top`），始终从官方受信任源下载
  - 移除所有 TLS 证书验证跳过逻辑（`NODE_TLS_REJECT_UNAUTHORIZED=0` / `--no-check-certificate`），强制加密传输
  - 新增浏览器 Cookie 显式 Opt-in 授权机制，默认禁用 Cookie 读取，并在设置中说明使用目的与平台
  - 加强 URL 与网络边界校验：仅允许 HTTPS，严格阻断 `localhost`、回环、私有网段及链路本地 IP 地址，重定向二次校验
  - 压缩包解压新增路径穿越（`..`）与符号链接（symlink）安全防护
- 优化 Pinterest 视频与图片解析降级链：针对 Pinterest 转存视频（如 Instagram 帖子），自动前置提取嵌入的第三方平台源地址；针对纯图片 Pin 自动提取并下载高清原图，解决 `No video formats found` 报错
- 优化信息提取与下载机制：在 `getVideoInfo` 阶段完成第三方目标地址与 `webpage_url` 的同步转换以及 Pin 类型判断，消除二次重复请求
- 优化格式兼容策略：在视频下载阶段采用 `bestvideo+bestaudio/best/b` 通用兼容格式
- 优化代理与网络请求：网页抓取优先接入 Chromium 浏览器网络栈（全局 `fetch`），自动复用 Eagle 的系统代理与 VPN 节点
- 优化 Pinterest 子域名（如 uk.pinterest.com）重定向自动追踪与 Carousel 帖子的元数据提取

---

- Comprehensive Security & Privacy Hardening (Eagle Store Review Compliance):
  - Pinned binary dependencies (yt-dlp 2026.07.04) with SHA-256 integrity verification
  - Removed all third-party executable mirror sources; downloads are restricted to official trusted origins
  - Removed all TLS certificate verification bypass logic (`NODE_TLS_REJECT_UNAUTHORIZED=0` / `--no-check-certificate`), enforcing HTTPS connections
  - Introduced explicit user Opt-in consent flow for browser cookie access, disabled by default
  - Strict URL and network boundary validation: HTTPS-only, blocking `localhost`, loopback, and private IP ranges, with redirect re-validation
  - Added path traversal and symbolic link protection during archive extraction
- Improved Pinterest extraction fallback chain: pre-extracts third-party source URLs (e.g. Instagram) for embedded video pins, and automatically downloads high-resolution images for image-only pins, resolving `No video formats found` errors
- Optimized metadata extraction and download flow: handles target source URLs and pin type classification during `getVideoInfo` to prevent redundant requests
- Optimized video format matching strategy with fallback to `bestvideo+bestaudio/best/b`
- Enhanced network proxy compatibility by utilizing global Chromium `fetch` stack for page fetching
- Improved handling of Pinterest subdomains (e.g. uk.pinterest.com) and multi-media carousel pins


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
