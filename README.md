<img src="./docs/banner-docs.png">

# Eagle Video Downloader

[English](./README.en.md) | 中文

从 1000+ 网站直接下载视频到 Eagle。基于 [yt-dlp](https://github.com/yt-dlp/yt-dlp) 构建。

## 支持的平台

YouTube、Twitter / X、TikTok、Bilibili、Instagram、Vimeo 以及[更多平台](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md)。

## 功能特性

支持 1000+ 视频网站，首次运行自动下载 yt-dlp，使用 Eagle 内置 ffmpeg 合并音视频，下载完成后自动导入到 Eagle 并保存元数据，支持中英文界面，显示实时下载进度。

## 安装方式

通过 [Eagle 社区](https://community-cn.eagle.cool/plugins) 安装，或在 Eagle 应用的插件中心搜索安装。

手动安装：下载[最新版本](https://github.com/fansanqiu/eagle-video-downloader/releases)，在 Eagle 中选择 插件 → 开发者选项 → 导入本地项目。

## 首次运行

首次启动时插件会自动下载 yt-dlp（约 30MB）。ffmpeg 直接使用 Eagle 内置版本，无需额外下载。

## 使用方法

1. 复制视频链接
2. 粘贴到插件输入框
3. 点击下载按钮
4. 下载完成后自动导入到 Eagle

## 开发

```bash
npm install      # 安装依赖
npm run build    # 构建插件
npm run dev      # 开发模式（监听文件变化）
```

项目使用 esbuild 打包，i18next 国际化，yt-dlp 负责视频提取，ffmpeg 由 Eagle 内置提供。

## 系统要求

Eagle 4.0 或更高版本，需要网络连接。

## 开源协议

MIT © [fansanqiu](https://github.com/fansanqiu)

本工具仅供个人使用，请遵守视频平台的服务条款和版权法律。
