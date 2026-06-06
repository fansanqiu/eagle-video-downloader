/**
 * 二进制文件管理模块
 * 处理 yt-dlp 的下载和配置
 * ffmpeg 使用 Eagle 内置版本，无需单独下载
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');
const { spawn, execFileSync } = require('child_process');

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

function getFfmpegBinaryName() {
    return os.platform() === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
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
    return path.join(getEagleDataDir(), 'Plugins', getEagleFfmpegDirName(), getFfmpegBinaryName());
}

/**
 * 获取插件自行管理的 ffmpeg 路径（存放在 bin/ 目录下）
 */
function getOwnFfmpegPath() {
    return path.join(BIN_DIR, getFfmpegBinaryName());
}

function resolveFfmpeg() {
    const eagle = getEagleFfmpegPath();
    if (fs.existsSync(eagle)) return { source: 'eagle', path: eagle };
    const own = getOwnFfmpegPath();
    if (fs.existsSync(own)) return { source: 'own', path: own };
    return null;
}

/**
 * 检测 ffmpeg 来源
 * 返回 'eagle'（Eagle 内置）| 'own'（插件自管理）| null（未找到）
 */
function getFfmpegSource() {
    return resolveFfmpeg()?.source ?? null;
}

/**
 * 当前平台是否支持自动安装 ffmpeg
 * macOS：eagle-app/eagle-plugin-ffmpeg 仓库提供 zip
 * Windows：BtbN 静态构建提供 zip（ffmpeg.exe 单文件，无需额外 DLL）
 */
function canInstallFfmpeg() {
    const p = os.platform();
    return p === 'darwin' || p === 'win32';
}

/**
 * 获取可用的 ffmpeg 路径
 * 优先 Eagle 内置，其次插件自管理
 */
function getFfmpegPath() {
    return resolveFfmpeg()?.path ?? null;
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

function clearQuarantine(filePath) {
    try {
        execFileSync('xattr', ['-d', 'com.apple.quarantine', filePath], { stdio: 'ignore' });
    } catch (e) {}
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
        clearQuarantine(destPath);
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

/**
 * 下载并安装 ffmpeg（支持 macOS / Windows）
 *
 * macOS 来源：eagle-app/eagle-plugin-ffmpeg（官方 zip，约 50 MB）
 * Windows 来源：BtbN 静态 GPL 构建（ffmpeg-master-latest-win64-gpl.zip，约 80 MB）
 *   - 静态链接，ffmpeg.exe 单文件运行，无需额外 DLL
 *   - Windows 解压：优先 tar.exe（Win10 1803+ 内置），降级到 PowerShell Expand-Archive
 *
 * 流程：下载 zip → 解压到临时目录 → 递归定位二进制 → 移至 bin/ → 设置权限
 */
async function downloadFfmpeg(onProgress) {
    const platform = os.platform();
    const arch = os.arch();

    let downloadUrl, zipName;

    if (platform === 'darwin') {
        zipName = arch === 'arm64'
            ? 'eagle-ffmpeg-mac-arm64.zip'
            : 'eagle-ffmpeg-mac-x64.zip';
        downloadUrl = `https://github.com/eagle-app/eagle-plugin-ffmpeg/raw/main/${zipName}`;
    } else if (platform === 'win32') {
        // BtbN 静态 GPL 构建，ffmpeg.exe 单文件，无 DLL 依赖
        zipName = 'ffmpeg-win-x64.zip';
        downloadUrl = 'https://github.com/BtbN/ffmpeg-builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip';
    } else {
        throw new Error(`Unsupported platform for ffmpeg auto-install: ${platform}`);
    }

    if (!fs.existsSync(BIN_DIR)) {
        fs.mkdirSync(BIN_DIR, { recursive: true });
    }

    // 下载 zip
    const zipPath = path.join(BIN_DIR, zipName);
    await downloadFile(downloadUrl, zipPath, onProgress);

    // 解压到临时目录（避免与现有文件混淆）
    const tmpDir = path.join(BIN_DIR, '_ffmpeg_tmp');
    if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });
    fs.mkdirSync(tmpDir);

    try {
        if (platform === 'darwin') {
            execFileSync('unzip', ['-o', zipPath, '-d', tmpDir], { stdio: 'ignore' });
        } else {
            // Windows：tar.exe（Win10 1803+ 内置）优先，降级到 PowerShell
            try {
                execFileSync('tar', ['-xf', zipPath, '-C', tmpDir], { stdio: 'ignore' });
            } catch (e) {
                execFileSync('powershell', [
                    '-NoProfile', '-Command',
                    `Expand-Archive -LiteralPath "${zipPath}" -DestinationPath "${tmpDir}" -Force`,
                ], { stdio: 'ignore' });
            }
        }
    } finally {
        if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    }

    // 递归查找 ffmpeg 二进制（兼容各种 zip 内部目录结构）
    function findBinary(dir, name) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isFile() && entry.name === name) return fullPath;
            if (entry.isDirectory()) {
                const found = findBinary(fullPath, name);
                if (found) return found;
            }
        }
        return null;
    }

    const binaryName = getFfmpegBinaryName();
    const foundBin = findBinary(tmpDir, binaryName);
    if (!foundBin) {
        fs.rmSync(tmpDir, { recursive: true });
        throw new Error('ffmpeg binary not found in downloaded package');
    }

    // 移动到 bin/ 目录，清理临时目录
    const destPath = getOwnFfmpegPath();
    if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
    fs.renameSync(foundBin, destPath);
    fs.rmSync(tmpDir, { recursive: true });

    if (platform !== 'win32') {
        fs.chmodSync(destPath, '755');
    }
    if (platform === 'darwin') {
        clearQuarantine(destPath);
    }

    return destPath;
}

/**
 * 卸载插件自管理的 ffmpeg（仅删除 bin/ 下的文件，不影响 Eagle 内置版本）
 */
function uninstallFfmpeg() {
    const ffmpegPath = getOwnFfmpegPath();
    if (fs.existsSync(ffmpegPath)) {
        fs.unlinkSync(ffmpegPath);
    }
}

/**
 * 获取 Eagle 内置 ffmpeg 的版本号
 * 返回版本字符串（如 "6.1.1"），无法运行时返回 null
 */
function getFfmpegVersion() {
    return new Promise((resolve) => {
        const ffmpegPath = getFfmpegPath();
        if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
            resolve(null);
            return;
        }
        const proc = spawn(ffmpegPath, ['-version']);
        let output = '';
        proc.stdout.on('data', (d) => { output += d.toString(); });
        proc.stderr.on('data', (d) => { output += d.toString(); });
        proc.on('close', () => {
            const match = output.match(/ffmpeg version (\S+)/);
            resolve(match ? match[1] : null);
        });
        proc.on('error', () => resolve(null));
    });
}

/**
 * 卸载 yt-dlp（删除二进制文件，清理空目录）
 */
function uninstallYtDlp() {
    const ytdlp = getYtDlpPath();
    if (fs.existsSync(ytdlp)) {
        fs.unlinkSync(ytdlp);
    }
    try {
        if (fs.existsSync(BIN_DIR) && fs.readdirSync(BIN_DIR).length === 0) {
            fs.rmdirSync(BIN_DIR);
        }
    } catch (e) {}
}

/**
 * 检查是否有可用的 yt-dlp 更新，不执行下载
 * 返回 { hasUpdate, latestVersion, installedVersion }
 */
async function getYtDlpUpdateInfo() {
    const installedVersion = await getInstalledYtDlpVersion();
    if (!installedVersion) {
        return { hasUpdate: false, latestVersion: null, installedVersion: null };
    }
    try {
        const latestVersion = await getLatestYtDlpVersion();
        return {
            hasUpdate: installedVersion !== latestVersion,
            latestVersion,
            installedVersion,
        };
    } catch (e) {
        return { hasUpdate: false, latestVersion: null, installedVersion };
    }
}

module.exports = {
    BIN_DIR,
    getYtDlpPath,
    getFfmpegPath,
    getFfmpegVersion,
    getFfmpegSource,
    canInstallFfmpeg,
    isYtDlpInstalled,
    downloadYtDlp,
    uninstallYtDlp,
    downloadFfmpeg,
    uninstallFfmpeg,
    checkAndUpdateYtDlp,
    getInstalledYtDlpVersion,
    getLatestYtDlpVersion,
    getYtDlpUpdateInfo,
};
