# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 命令

```bash
npm install       # 安装依赖
npm run build     # 生产构建，输出到 Plugin/dist/plugin.js
npm run dev       # 开发模式，文件变更时自动重新构建
npm run package   # 打包为 视频下载器.eagleplugin（构建 + 清理 bin/ + zip）
```

没有测试套件。`Plugin/bin/` 已加入 gitignore，yt-dlp 二进制在运行时自动下载。

打包时直接运行 `npm run package`，会在项目根目录生成 `视频下载器.eagleplugin`，即可上传发布。

## 架构

源码在 `js/`，esbuild 将其打包为 `Plugin/dist/plugin.js`。UI 定义在 `Plugin/index.html`（内联 CSS）。Eagle 以 `Plugin/` 为根目录加载插件，运行时 `__dirname` 指向 `Plugin/dist/`。

各模块职责：

- `plugin.js` — 入口，处理 Eagle 生命周期钩子，管理下载队列（最多 3 个并发），协调各模块
- `ui.js` — 队列项渲染与状态更新，输入栏事件，主题切换
- `downloader.js` — 调用 yt-dlp 子进程，解析实时进度输出，处理多视频下载，Vimeo URL 规范化
- `binary.js` — yt-dlp 下载与版本检查（对比 GitHub Releases），macOS 隔离属性清除，Eagle 内置 ffmpeg 路径解析
- `eagle.js` — 调用 `eagle.item.addFromPath()` 将视频导入 Eagle 库

下载流程：用户输入 URL → `getVideoInfo()`（yt-dlp --dump-json）→ `downloadVideo()`（yt-dlp 子进程，临时目录）→ `importToEagle()` → 清理临时文件。

## 国际化

语言文件在 `Plugin/_locales/en.json` 和 `zh_CN.json`，使用 i18next。新增用户可见字符串时需同时更新两个文件。

## 发布注意

发布新版本前更新 `Plugin/manifest.json` 中的 `version` 字段。插件 ID 为 `75328212-f4fd-4152-952d-26aa1bfcedf9`，不可更改，否则 Eagle 会将其识别为新插件。
