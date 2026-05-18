/**
 * 二进制文件管理模块
 * 处理 yt-dlp 的下载和配置
 * ffmpeg 使用 Eagle 内置版本，无需单独下载
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');

// 插件路径（__dirname 运行时指向 dist/，向上一级即 Plugin/ 根目录）
const PLUGIN_ROOT = path.join(__dirname, '..');
const BIN_DIR = path.join(PLUGIN_ROOT, 'bin');

function isSSLError(err) {
    return (
        err.code === 'ERR_SSL_UNEXPECTED_EOF' ||
        err.code === 'EPROTO' ||
        (err.message && (err.message.includes('SSL') || err.message.includes('ssl')))
    );
}

function httpsGetJson(options, sslFallback = false) {
    return new Promise((resolve, reject) => {
        const opts = sslFallback ? { ...options, rejectUnauthorized: false } : options;
        https.get(opts, (response) => {
            let data = '';
            response.on('data', (chunk) => { data += chunk; });
            response.on('end', () => {
                try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
            });
        }).on('error', (err) => {
            if (isSSLError(err) && !sslFallback) {
                httpsGetJson(options, true).then(resolve).catch(reject);
            } else {
                reject(err);
            }
        });
    });
}

/**
 * 获取特定平台的 yt-dlp 二进制文件名
 */
function getYtDlpBinaryName() {
    const platform = os.platform();
    switch (platform) {
        case 'win32':
            return 'yt-dlp.exe';
        case 'darwin':
            return 'yt-dlp_macos';
        case 'linux':
            return 'yt-dlp_linux';
        default:
            return 'yt-dlp';
    }
}

/**
 * 获取 yt-dlp 二进制文件路径
 */
function getYtDlpPath() {
    return path.join(BIN_DIR, getYtDlpBinaryName());
}

/**
 * 检查 yt-dlp 是否已安装
 */
function isYtDlpInstalled() {
    return fs.existsSync(getYtDlpPath());
}

/**
 * 获取 Eagle 数据目录（跨平台）
 */
function getEagleDataDir() {
    const platform = os.platform();
    if (platform === 'darwin') {
        return path.join(os.homedir(), 'Library', 'Application Support', 'Eagle');
    } else if (platform === 'win32') {
        return path.join(os.homedir(), 'AppData', 'Roaming', 'Eagle');
    } else {
        return path.join(os.homedir(), '.config', 'Eagle');
    }
}

/**
 * 获取 Eagle 内置 ffmpeg 的目录名（跨平台）
 * Eagle 将 ffmpeg 作为系统插件存储：
 *   ~/Library/Application Support/Eagle/Plugins/ffmpeg-{platform}-{arch}/
 */
function getEagleFfmpegDirName() {
    const platform = os.platform();
    const arch = os.arch();
    const archName = arch === 'arm64' ? 'arm64' : 'x64';

    if (platform === 'darwin') {
        return `ffmpeg-mac-${archName}`;
    } else if (platform === 'win32') {
        return `ffmpeg-win-${archName}`;
    } else {
        return `ffmpeg-linux-${archName}`;
    }
}

/**
 * 获取 Eagle 内置 ffmpeg 的完整路径
 */
function getEagleFfmpegPath() {
    const binaryName = os.platform() === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
    return path.join(getEagleDataDir(), 'Plugins', getEagleFfmpegDirName(), binaryName);
}

/**
 * 获取可用的 ffmpeg 路径
 * 优先使用 Eagle 内置版本
 */
function getFfmpegPath() {
    const eagleFfmpeg = getEagleFfmpegPath();
    if (fs.existsSync(eagleFfmpeg)) {
        return eagleFfmpeg;
    }
    return null;
}

/**
 * 下载文件并显示进度
 */
function downloadFile(url, destPath, onProgress, sslFallback = false) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);

        let reqOptions = url;
        if (sslFallback) {
            const u = typeof url === 'string' ? new URL(url) : url;
            reqOptions = {
                hostname: u.hostname,
                port: u.port || 443,
                path: u.pathname + (u.search || ''),
                rejectUnauthorized: false,
            };
        }

        const request = https.get(reqOptions, (response) => {
            // 处理重定向（301/302/307/308）
            if ([301, 302, 307, 308].includes(response.statusCode)) {
                file.close();
                fs.unlinkSync(destPath);
                downloadFile(response.headers.location, destPath, onProgress, sslFallback)
                    .then(resolve)
                    .catch(reject);
                return;
            }

            if (response.statusCode !== 200) {
                file.close();
                fs.unlinkSync(destPath);
                reject(new Error(`Download failed with status ${response.statusCode}`));
                return;
            }

            const totalSize = parseInt(response.headers['content-length'], 10);
            let downloadedSize = 0;

            response.on('data', (chunk) => {
                downloadedSize += chunk.length;
                if (onProgress && totalSize) {
                    onProgress(Math.round((downloadedSize / totalSize) * 100));
                }
            });

            response.pipe(file);

            file.on('finish', () => {
                file.close();
                resolve(destPath);
            });
        });

        request.on('error', (error) => {
            file.close();
            if (fs.existsSync(destPath)) {
                fs.unlinkSync(destPath);
            }
            if (isSSLError(error) && !sslFallback) {
                downloadFile(url, destPath, onProgress, true).then(resolve).catch(reject);
            } else {
                reject(error);
            }
        });
    });
}

/**
 * 从 GitHub 获取最新发布的 yt-dlp 下载链接
 */
async function getYtDlpDownloadUrl() {
    const binaryName = getYtDlpBinaryName();
    if (binaryName === 'yt-dlp') {
        throw new Error(`Unsupported platform: ${os.platform()}`);
    }
    const release = await httpsGetJson({
        hostname: 'api.github.com',
        path: '/repos/yt-dlp/yt-dlp/releases/latest',
        headers: { 'User-Agent': 'Eagle-Video-Downloader' },
    });
    const asset = release.assets.find(a => a.name === binaryName);
    if (!asset) {
        throw new Error(`Binary ${binaryName} not found in release`);
    }
    return asset.browser_download_url;
}

/**
 * 下载 yt-dlp 二进制文件
 */
async function downloadYtDlp(onProgress) {
    if (!fs.existsSync(BIN_DIR)) {
        fs.mkdirSync(BIN_DIR, { recursive: true });
    }

    const destPath = getYtDlpPath();
    const downloadUrl = await getYtDlpDownloadUrl();
    await downloadFile(downloadUrl, destPath, onProgress);

    if (os.platform() !== 'win32') {
        fs.chmodSync(destPath, '755');
    }

    // 清除 macOS 隔离属性，否则系统可能阻止执行
    if (os.platform() === 'darwin') {
        try {
            const { execFileSync } = require('child_process');
            execFileSync('xattr', ['-d', 'com.apple.quarantine', destPath], { stdio: 'ignore' });
        } catch (e) {
            // 属性不存在时 xattr 会报错，忽略即可
        }
    }

    return destPath;
}

/**
 * 获取已安装的 yt-dlp 版本号
 * 返回版本字符串（如 "2024.11.18"），无法运行时返回 null
 */
function getInstalledYtDlpVersion() {
    return new Promise((resolve) => {
        const ytdlp = getYtDlpPath();
        if (!fs.existsSync(ytdlp)) {
            resolve(null);
            return;
        }
        const { spawn } = require('child_process');
        const proc = spawn(ytdlp, ['--version']);
        let output = '';
        proc.stdout.on('data', (d) => { output += d.toString(); });
        proc.on('close', () => resolve(output.trim() || null));
        proc.on('error', () => resolve(null));
    });
}

/**
 * 从 GitHub 获取最新 yt-dlp 的版本号（tag_name）
 */
async function getLatestYtDlpVersion() {
    const release = await httpsGetJson({
        hostname: 'api.github.com',
        path: '/repos/yt-dlp/yt-dlp/releases/latest',
        headers: { 'User-Agent': 'Eagle-Video-Downloader' },
    });
    return release.tag_name;
}

/**
 * 检查 yt-dlp 是否需要更新，如需要则重新下载
 * - 二进制存在但无法运行 → 重新下载
 * - 版本低于最新版 → 重新下载
 * 返回 true 表示执行了更新，false 表示无需更新
 */
async function checkAndUpdateYtDlp(onProgress) {
    const installedVersion = await getInstalledYtDlpVersion();

    if (!installedVersion) {
        // 文件存在但无法执行，重新下载
        await downloadYtDlp(onProgress);
        return true;
    }

    try {
        const latestVersion = await getLatestYtDlpVersion();
        if (installedVersion !== latestVersion) {
            await downloadYtDlp(onProgress);
            return true;
        }
    } catch (e) {
        // 网络问题无法检查版本，跳过更新
    }
    return false;
}

module.exports = {
    BIN_DIR,
    getYtDlpPath,
    getFfmpegPath,
    isYtDlpInstalled,
    downloadYtDlp,
    checkAndUpdateYtDlp,
};
