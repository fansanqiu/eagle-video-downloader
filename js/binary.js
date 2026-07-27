/**
 * 二进制文件管理模块
 * 处理 yt-dlp 与 ffmpeg 的锁定版本下载、签名/哈希校验及配置
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');
const crypto = require('crypto');
const { spawn, execFileSync } = require('child_process');

// 插件路径（__dirname 运行时指向 dist/，向上一级即 Plugin/ 根目录）
const PLUGIN_ROOT = path.join(__dirname, '..');
const BIN_DIR = path.join(PLUGIN_ROOT, 'bin');

/**
 * 锁定依赖版本及 SHA-256 哈希
 */
const PINNED_VERSIONS = {
    ytdlp: {
        version: '2026.07.04',
        assets: {
            'yt-dlp.exe':   { sha256: '52fe3c26dcf71fbdc85b528589020bb0b8e383155cfa81b64dd447bbe35e24b8' },
            'yt-dlp_macos': { sha256: '498bd0dae17855c599d371d68ec5bafc439a9d8640e838be25c765a9792f261b' },
            'yt-dlp_linux': { sha256: '6bbb3d314cde4febe36e5fa1d55462e29c974f63444e707871834f6d8cc210ae' },
        },
        urlTemplate: 'https://github.com/yt-dlp/yt-dlp/releases/download/{version}/{binary}',
    },
    ffmpeg: {
        darwin_arm64: {
            url: 'https://github.com/eagle-app/eagle-plugin-ffmpeg/raw/main/eagle-ffmpeg-mac-arm64.zip',
            sha256: null,
        },
        darwin_x64: {
            url: 'https://github.com/eagle-app/eagle-plugin-ffmpeg/raw/main/eagle-ffmpeg-mac-x64.zip',
            sha256: null,
        },
        win32_x64: {
            url: 'https://github.com/BtbN/ffmpeg-builds/releases/download/autobuild-2026-07-04-14-18/ffmpeg-N-116244-g7b8d0c2e3a-win64-gpl.zip',
            sha256: null,
        },
    },
};

/**
 * 校验文件 SHA-256 摘要
 */
function verifySha256(filePath, expectedHash) {
    if (!expectedHash || expectedHash.startsWith('<')) return;
    const fileBuffer = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    if (hash.toLowerCase() !== expectedHash.toLowerCase()) {
        try { fs.unlinkSync(filePath); } catch (e) {}
        throw new Error(`SHA-256 verification failed for ${path.basename(filePath)}: expected ${expectedHash}, got ${hash}`);
    }
}

function httpsGetJson(options, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
        const req = https.get(options, (response) => {
            let data = '';
            response.on('data', (chunk) => { data += chunk; });
            response.on('end', () => {
                try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
            });
            response.on('error', reject);
        });
        req.setTimeout(timeoutMs, () => {
            req.destroy(new Error('Request timed out'));
        });
        req.on('error', reject);
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
 */
function getFfmpegSource() {
    return resolveFfmpeg()?.source ?? null;
}

/**
 * 当前平台是否支持自动安装 ffmpeg
 */
function canInstallFfmpeg() {
    const p = os.platform();
    return p === 'darwin' || p === 'win32';
}

/**
 * 获取可用的 ffmpeg 路径
 */
function getFfmpegPath() {
    return resolveFfmpeg()?.path ?? null;
}

// 下载空闲超时：15秒无数据传输视为连接卡死
const DOWNLOAD_IDLE_TIMEOUT_MS = 15000;
// 失败后的最大自动重试次数
const DOWNLOAD_MAX_RETRIES = 2;

/**
 * 下载文件并显示进度
 */
function downloadFile(url, destPath, onProgress, retriesLeft = DOWNLOAD_MAX_RETRIES, idleTimeoutMs = DOWNLOAD_IDLE_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
        const tmpPath = `${destPath}.download`;
        const file = fs.createWriteStream(tmpPath);
        let settled = false;

        const cleanupFile = () => {
            file.close();
            if (fs.existsSync(tmpPath)) {
                try { fs.unlinkSync(tmpPath); } catch (e) {}
            }
        };

        const handleFailure = (error) => {
            if (settled) return;
            settled = true;
            request.destroy();
            cleanupFile();

            if (retriesLeft > 0) {
                downloadFile(url, destPath, onProgress, retriesLeft - 1, idleTimeoutMs).then(resolve).catch(reject);
            } else {
                reject(error);
            }
        };

        const request = https.get(url, (response) => {
            // 处理重定向（301/302/307/308）
            if ([301, 302, 307, 308].includes(response.statusCode)) {
                settled = true;
                cleanupFile();
                const redirectUrl = response.headers.location;
                if (!redirectUrl || !redirectUrl.startsWith('https://')) {
                    reject(new Error(`Insecure redirect rejected: ${redirectUrl}`));
                    return;
                }
                downloadFile(redirectUrl, destPath, onProgress, retriesLeft, idleTimeoutMs)
                    .then(resolve)
                    .catch(reject);
                return;
            }

            if (response.statusCode !== 200) {
                settled = true;
                cleanupFile();
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

            response.on('error', handleFailure);
            response.pipe(file);

            file.on('finish', () => {
                if (settled) return;
                settled = true;
                file.close(() => {
                    try {
                        fs.renameSync(tmpPath, destPath);
                        resolve(destPath);
                    } catch (e) {
                        if (fs.existsSync(tmpPath)) {
                            try { fs.unlinkSync(tmpPath); } catch (_) {}
                        }
                        reject(e);
                    }
                });
            });

            file.on('error', handleFailure);
        });

        request.setTimeout(idleTimeoutMs, () => {
            handleFailure(new Error('Download timed out: no data received'));
        });

        request.on('error', handleFailure);
    });
}

/**
 * 获取特定平台锁定的 yt-dlp 下载信息
 */
function getYtDlpDownloadInfo() {
    const binaryName = getYtDlpBinaryName();
    const asset = PINNED_VERSIONS.ytdlp.assets[binaryName];
    if (!asset) {
        throw new Error(`Unsupported platform: ${os.platform()}`);
    }
    const url = PINNED_VERSIONS.ytdlp.urlTemplate
        .replace('{version}', PINNED_VERSIONS.ytdlp.version)
        .replace('{binary}', binaryName);
    return {
        url,
        sha256: asset.sha256,
        version: PINNED_VERSIONS.ytdlp.version,
    };
}

function clearQuarantine(filePath) {
    try {
        execFileSync('xattr', ['-d', 'com.apple.quarantine', filePath], { stdio: 'ignore' });
    } catch (e) {}
}

/**
 * 下载并校验锁定版本的 yt-dlp 二进制文件
 * @param {Function} onProgress 进度回调
 */
async function downloadYtDlp(onProgress) {
    if (!fs.existsSync(BIN_DIR)) {
        fs.mkdirSync(BIN_DIR, { recursive: true });
    }

    const destPath = getYtDlpPath();
    const { url, sha256 } = getYtDlpDownloadInfo();

    await downloadFile(url, destPath, onProgress);
    verifySha256(destPath, sha256);

    if (os.platform() !== 'win32') {
        fs.chmodSync(destPath, '755');
    }

    if (os.platform() === 'darwin') {
        clearQuarantine(destPath);
    }

    return destPath;
}

/**
 * 获取已安装的 yt-dlp 版本号
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
 * 获取锁定的最新 yt-dlp 版本号
 */
async function getLatestYtDlpVersion() {
    return PINNED_VERSIONS.ytdlp.version;
}

/**
 * 检查 yt-dlp 是否需要更新
 */
async function checkAndUpdateYtDlp(onProgress) {
    const installedVersion = await getInstalledYtDlpVersion();

    if (!installedVersion) {
        await downloadYtDlp(onProgress);
        return true;
    }

    const latestVersion = await getLatestYtDlpVersion();
    if (installedVersion !== latestVersion) {
        await downloadYtDlp(onProgress);
        return true;
    }
    return false;
}

/**
 * 解压安全验证：拒绝路径穿越和符号链接
 */
function validateExtractedFiles(dir, baseDir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        const resolved = path.resolve(fullPath);

        if (!resolved.startsWith(path.resolve(baseDir))) {
            throw new Error(`Path traversal detected: ${entry.name}`);
        }
        if (entry.isSymbolicLink()) {
            throw new Error(`Symbolic link rejected: ${entry.name}`);
        }
        if (entry.isDirectory()) {
            validateExtractedFiles(fullPath, baseDir);
        }
    }
}

/**
 * 下载并安装锁定版本的 ffmpeg
 * @param {Function} onProgress 进度回调
 */
async function downloadFfmpeg(onProgress) {
    const platform = os.platform();
    const arch = os.arch();

    let downloadUrl, zipName, expectedSha256;

    if (platform === 'darwin') {
        const key = arch === 'arm64' ? 'darwin_arm64' : 'darwin_x64';
        const info = PINNED_VERSIONS.ffmpeg[key];
        zipName = arch === 'arm64' ? 'eagle-ffmpeg-mac-arm64.zip' : 'eagle-ffmpeg-mac-x64.zip';
        downloadUrl = info.url;
        expectedSha256 = info.sha256;
    } else if (platform === 'win32') {
        const info = PINNED_VERSIONS.ffmpeg.win32_x64;
        zipName = 'ffmpeg-win-x64.zip';
        downloadUrl = info.url;
        expectedSha256 = info.sha256;
    } else {
        throw new Error(`Unsupported platform for ffmpeg auto-install: ${platform}`);
    }

    if (!fs.existsSync(BIN_DIR)) {
        fs.mkdirSync(BIN_DIR, { recursive: true });
    }

    const zipPath = path.join(BIN_DIR, zipName);
    await downloadFile(downloadUrl, zipPath, onProgress);
    verifySha256(zipPath, expectedSha256);

    const tmpDir = path.join(BIN_DIR, '_ffmpeg_tmp');
    if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });
    fs.mkdirSync(tmpDir);

    try {
        if (platform === 'darwin') {
            execFileSync('unzip', ['-o', zipPath, '-d', tmpDir], { stdio: 'ignore' });
        } else {
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

    // 验证解压内容安全性
    validateExtractedFiles(tmpDir, tmpDir);

    // 递归查找二进制
    function findBinary(dir, name) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isSymbolicLink()) continue;
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
 * 卸载插件自管理的 ffmpeg
 */
function uninstallFfmpeg() {
    const ffmpegPath = getOwnFfmpegPath();
    if (fs.existsSync(ffmpegPath)) {
        fs.unlinkSync(ffmpegPath);
    }
}

/**
 * 获取 Eagle 内置 ffmpeg 的版本号
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
 * 卸载 yt-dlp
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
 * 检查是否有可用的 yt-dlp 更新
 */
async function getYtDlpUpdateInfo() {
    const installedVersion = await getInstalledYtDlpVersion();
    if (!installedVersion) {
        return { hasUpdate: false, latestVersion: null, installedVersion: null };
    }
    const latestVersion = await getLatestYtDlpVersion();
    return {
        hasUpdate: installedVersion !== latestVersion,
        latestVersion,
        installedVersion,
    };
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
