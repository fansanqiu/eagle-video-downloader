<img src="./docs/banner-docs.png">

# Eagle Video Downloader

English | [中文](./README.md)

Download videos directly to Eagle from 1000+ websites. Built on [yt-dlp](https://github.com/yt-dlp/yt-dlp).

## Supported Platforms

YouTube, Twitter / X, TikTok, Bilibili, Instagram, Vimeo, and [many more](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md).

## Features

Supports 1000+ video websites. Downloads yt-dlp automatically on first run. Uses Eagle's built-in ffmpeg for audio/video merging. Automatically imports downloaded videos to Eagle with metadata. Supports Chinese and English interfaces with real-time progress display.

## Installation

Install via [Eagle Community](https://community-cn.eagle.cool/plugins) or search for it in Eagle's plugin center.

Manual install: download the [latest release](https://github.com/fansanqiu/eagle-video-downloader/releases), then in Eagle go to Plugins → Developer Options → Import Local Project.

## First Run

On first launch the plugin automatically downloads yt-dlp (~30MB). ffmpeg uses Eagle's built-in version — no additional download required.

## Usage

1. Copy a video link
2. Paste it into the plugin input box
3. Click the download button
4. The video is automatically imported to Eagle after download

## Development

```bash
npm install      # Install dependencies
npm run build    # Build plugin
npm run dev      # Development mode (watch for changes)
```

The project uses esbuild for bundling, i18next for internationalization, yt-dlp for video extraction, and Eagle's built-in ffmpeg.

## System Requirements

Eagle 4.0 or higher. Internet connection required.

## License

MIT © [fansanqiu](https://github.com/fansanqiu)

For personal use only. Please comply with the terms of service of video platforms and applicable copyright laws.

## Acknowledgements

This project is based on [OlivierEstevez/eagle-twitter-video-downloader](https://github.com/OlivierEstevez/eagle-twitter-video-downloader). Thanks to the original author for the foundational work.
