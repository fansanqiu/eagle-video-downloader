# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Eagle Video Downloader is an **Eagle app plugin** that downloads videos from 1000+ websites (YouTube, Twitter/X, TikTok, Bilibili, etc.) directly into Eagle media management software. It uses `yt-dlp` + `ffmpeg` under the hood and auto-downloads these binaries on first run.

The plugin window is fixed at **400×84px** (frameless, vibrancy enabled).

## Commands

```bash
npm install       # Install dependencies
npm run dev       # Development mode (watch + rebuild on change)
npm run build     # Production build
```

No test suite exists. Build output goes to `Plugin/dist/plugin.js` (bundled via esbuild from `js/plugin.js`).

The `Plugin/bin/` directory is gitignored — yt-dlp and ffmpeg binaries are downloaded at runtime.

## Architecture

The UI is defined in `Plugin/index.html` (inline CSS, references `dist/plugin.js`). Source lives in `js/`:

| File | Responsibility |
|------|---------------|
| `plugin.js` | Entry point. Handles Eagle lifecycle hooks (`Eagle.onPluginCreate`), coordinates initialization, manages global state (`isInitialized`, `currentDownload`) |
| `ui.js` | Input bar state machine: `idle → preparing → downloading → completed/error`. Theme detection, URL validation, progress display |
| `downloader.js` | Spawns `yt-dlp` subprocess. Parses real-time progress output (regex). Handles multi-video downloads via `autonumber` template. Vimeo URL normalization |
| `binary.js` | Cross-platform binary management. Fetches latest yt-dlp from GitHub API, downloads with redirect/chmod handling |
| `eagle.js` | Calls Eagle API to import video files with metadata (title, uploader, source URL, etc.) |

**Download flow**: user inputs URL → `getVideoInfo()` (yt-dlp `--dump-json`) → `downloadVideo()` (yt-dlp subprocess) → `importToEagle()` → cleanup temp files.

**Build config** (`esbuild.config.js`): targets Node 16+, CommonJS format, `electron` is external (not bundled). `ffmpeg-static` dependency has been removed — ffmpeg is now downloaded at runtime.

## Internationalization

Two locale files: `Plugin/_locales/en.json` and `Plugin/_locales/zh_CN.json`. Uses `i18next`. When adding user-facing strings, add entries to both locale files.

## Eagle Plugin Integration

`Plugin/manifest.json` defines the plugin ID, entry point (`index.html`), and window dimensions. The plugin communicates with Eagle via the global `Eagle` object (Electron-based). Binaries are stored in `Plugin/bin/` (resolved via `path.join(__dirname, '..')` at runtime from `dist/`).

## Project Structure

```
Plugin/          ← Eagle 打包此目录
  manifest.json
  index.html
  assets/
  _locales/
  dist/          ← esbuild 输出（gitignored）
  bin/           ← 运行时下载的二进制（gitignored）
js/              ← 源码（不打包）
esbuild.config.js
package.json
```

打包前运行 `npm run prepublish` 以构建并清理 `Plugin/bin/`，再用 Eagle 对 `Plugin/` 目录执行打包。
