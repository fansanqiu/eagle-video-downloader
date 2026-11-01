<img src="./docs/封面-中文.jpg">

# Eagle Video Downloader

[English](./README.en.md) | 中文

从 yt-dlp 支持的网站直接下载视频到 Eagle。基于 [yt-dlp](https://github.com/yt-dlp/yt-dlp) 构建。

## 支持的平台

YouTube、Twitter / X、TikTok、Bilibili、Instagram、Pinterest、Dribbble、Vimeo 以及[更多平台](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md)。

## 功能特性

支持 yt-dlp 支持的视频网站，首次运行需要在依赖管理页点击安装 yt-dlp，使用 Eagle 官方 FFmpeg 插件合并音视频，下载完成后自动导入到 Eagle，并保存标题、平台标签及最多 500 字符的简介摘要。支持中英文界面、实时下载进度，以及 Pinterest 图钉与 Dribbble 作品的视频、图片解析。实际可下载内容取决于网站与解析结果。

原始网页链接默认写入 Eagle 数据来源，可在偏好设置中关闭。分辨率和帧率设置用于优先匹配格式；后备格式可能使用不带这些限制的画质，实际下载值可能超过设置值。

## 网络与外部服务

使用插件及安装依赖需要网络连接。解析 Dribbble 作品页面时，插件会将用户提供的作品网址（URL）发送至第三方 [Jina Reader](https://r.jina.ai/)，并使用其返回的页面内容提取媒体链接。Dribbble 解析依赖该服务；服务的可用性和返回结果会影响 Dribbble 下载。

Dribbble 下载前会显示传送的网址与用途，确认后开始解析；取消后保留输入。媒体先下载至系统临时目录，成功导入后清理临时文件；导入会创建新的 Eagle 项目，已有素材保持原样。中断或失败的下载残留可在系统临时目录的 eagle-video-downloader 文件夹清理。下载适用于无需浏览器登录即可访问的受支持内容。

## 安装方式

通过 [Eagle 社区](https://community-cn.eagle.cool/plugins) 安装，或在 Eagle 应用的插件中心搜索安装。

手动安装：下载[最新版本](https://github.com/fansanqiu/eagle-video-downloader/releases)，在 Eagle 中选择 插件 → 开发者选项 → 导入本地项目。

## 首次运行

首次启动时需要在依赖管理页安装 yt-dlp（约 30MB）。ffmpeg 使用 Eagle 官方 FFmpeg 插件；若本地未安装，可在依赖页点击按钮一键跳转至 Eagle 应用商店下载。

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
npm run package  # 打包插件
```

项目使用 esbuild 打包，i18next 国际化，yt-dlp 负责视频提取，ffmpeg 由 Eagle 官方 FFmpeg 插件提供。

## 系统要求

Eagle 4.0 或更高版本，需安装 Eagle 官方 FFmpeg 插件，需要网络连接。

## 开源协议

MIT © [fansanqiu](https://github.com/fansanqiu)

本工具仅供个人使用，请遵守视频平台的服务条款和版权法律。

## 致谢

本项目基于 [OlivierEstevez/eagle-twitter-video-downloader](https://github.com/OlivierEstevez/eagle-twitter-video-downloader) 开发，感谢原作者的开创性工作。视频解析与提取由 [yt-dlp](https://github.com/yt-dlp/yt-dlp) 提供支持，音视频合并与转码由 [FFmpeg](https://ffmpeg.org) 提供支持。
