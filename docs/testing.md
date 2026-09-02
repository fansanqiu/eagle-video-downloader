# 测试使用指南

本项目提供轻量级自动化测试脚本，用于验证 yt-dlp 二进制完整性与各平台链接的可下载性。

---

## 1. 快速测试命令

在项目根目录下执行：

```bash
# 1. 验证 yt-dlp 官方二进制下载与版本可执行性
node test-ytdlp.js

# 2. 验证视频链接可下载性（模拟下载流程，校验音视频源与格式，不写入实际文件）
node test-download.js
```

---

## 2. 自定义测试链接

编辑根目录下的 [`test-urls.js`](../test-urls.js)：

```js
module.exports = [
  'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
  'https://x.com/i/status/2093270659824529461',
  'https://www.pinterest.com/pin/8162843071239973/',
];
```

- 将数组内容替换为需要测试的目标视频或图片链接。
- 支持单条或多条链接，直接使用 `//` 注释掉无需测试的项。

---

## 3. 测试覆盖说明

| 脚本 | 验证内容 | 耗时与机制 |
| :--- | :--- | :--- |
| `test-ytdlp.js` | 官方二进制下载、SHA-256 完整性校验、macOS 隔离属性清除、`--version` 执行 | ~4秒，无缓存时下载官方版本并校验 |
| `test-download.js` | 站点适配器匹配、元数据解析、yt-dlp `--simulate` 验证音视频格式就绪 | 模拟下载，验证真实视频源可连通与可下载，不占磁盘 |
| `js/net-guard.test.js` | 网络安全模块（SSRF/IP/hostname 校验）、Pinterest 派生 URL 白名单、Cookie 范围、端口限制，含审核方关注的子串绕过场景 | ~1秒，纯内存，无网络请求，运行 `npm test` |
