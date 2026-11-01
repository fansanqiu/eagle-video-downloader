# 3.0.1 发布复核记录

复核日期：2026-10-23。依据 [Eagle 审核标准](https://developer.eagle.cool/plugin-api/zh-cn/plugin-review/criteria)及以下全部子栏目。

| 规则 | 本次核对与修正 |
| --- | --- |
| [发布设置与可审核性](https://developer.eagle.cool/plugin-api/zh-cn/plugin-review/criteria/configuration-and-reviewability) | 根目录 manifest 有效，ID 保持原插件身份，版本同步为 3.0.1，devTools 关闭；已使用 Eagle 官方打包，并实际安装核对运行文件 |
| [商店文案](https://developer.eagle.cool/plugin-api/zh-cn/plugin-review/criteria/store-listing-copy) | 中英文分别说明 Jina Reader、作品 URL 传输、用途及服务依赖；偏好设置、画质后备选择、输入框位置和本地文件行为与实现对应；短描述分别为 78、180 字符 |
| [视觉素材](https://developer.eagle.cool/plugin-api/zh-cn/plugin-review/criteria/visual-assets) | 图标为 512×512；中英文封面均为 2880×1920；已查看留白、文字、比例及实际下载界面对应关系 |
| [安全与隐私](https://developer.eagle.cool/plugin-api/zh-cn/plugin-review/criteria/security-and-privacy) | 检查 HTTPS、域名与私有 IP 限制；Dribbble 下载前明确展示第三方目的地和作品 URL，取消保留输入；文案说明 yt-dlp 子进程网络边界及已校验组件的权限设置 |
| [安装包内容](https://developer.eagle.cool/plugin-api/zh-cn/plugin-review/criteria/package-contents) | 安装包仅含界面、编译脚本、双语资源及图标，逐文件核对；开发目录、邮件、运行时二进制及测试文件位于安装包外 |
| [文件安全](https://developer.eagle.cool/plugin-api/zh-cn/plugin-review/criteria/file-safety) | yt-dlp 固定为官方 2026.10.21，三平台摘要与官方 SHA2-256SUMS 对应；校验完成后替换组件，失败保留现有版本；运行依赖审计报告为 0 个已知漏洞 |
| [功能与政策合规](https://developer.eagle.cool/plugin-api/zh-cn/plugin-review/criteria/functionality-and-policy) | 修复同名并发下载的文件覆盖风险、组件校验失败丢失旧版本、Jina HTTP 错误响应处理及提示中的 URL 转义；回归测试覆盖取消和数据保留 |

## 验证

- `npm test`：网络边界、格式选择及 5 项发布安全回归通过。
- `npm run build`：构建通过。
- `npm audit --omit=dev`：0 个已知漏洞。
- 安装包路径、重复项、目录越界、manifest 及运行文件一致性检查通过。
- Eagle 实际安装最终官方导出的 3.0.1，检查启动、偏好设置、依赖管理及 Dribbble 取消流程；确认网址完整显示，取消后保留输入。
- Eagle 内实际更新 yt-dlp 至 2026.10.21，已安装文件的 SHA-256 与官方摘要一致。
- 最终修订使用 `plugin.path` 限定组件目录，并验证自身目录内的官方组件版本、摘要及媒体模拟下载。重复下载遇到网络波动时，本机验证使用此前下载且摘要一致的官方组件。
- 通过 Dribbble 媒体直链实际下载并导入 49 秒 MP4（1440×1080，20.45 MB），在 Eagle 中核对标题、generic 解析标签及原始来源网址。
- Jina Reader 公开作品测试通过代理返回 HTTP 200，含标题与媒体链接。

## 网络条件与提交状态

- 当前网络已完成 GitHub 组件下载及 Dribbble CDN 媒体下载。Jina Reader 直连请求仍超时，通过现有代理读取公开作品成功。双语介绍与审核备注分别说明该服务依赖和本机实测范围。
- 最终修订已使用 Eagle 官方打包功能导出、重新安装和上传，运行文件逐项匹配。
- 最终安装包 SHA-256：`c846620bc63310d753a7e6c525acfbeb3a75fccfc477829ba8448bc5e4f45127`。
- 2026-10-23 已按用户确认接受条款并重新提交 3.0.1；[审核页](https://community-en.eagle.cool/my/plugin/75328212-f4fd-4152-952d-26aa1bfcedf9/draft)显示 `Pending Review`（待审核），版本为 3.0.1。

实际 macOS 验证与 Windows 平台摘要核对分别记录；Windows 运行验证待执行。
