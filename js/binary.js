/**
 * 二进制文件管理模块
 * 处理 yt-dlp 锁定版本下载与 SHA-256 哈希校验
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { spawn, execFileSync } = require('child_process');
const { secureHttpsGet } = require('./net-guard');

// 插件路径（__dirname 运行时指向 dist/，向上一级即 Plugin/ 根目录）
const PLUGIN_ROOT = path.join(__dirname, '..');
const BIN_DIR = path.join(PLUGIN_ROOT, 'bin');

/**
 * 锁定依赖版本及 SHA-256 哈希
 */
const PINNED_VERSIONS = {
    ytdlp: {
        version: '2026.08.19',
        assets: {
            'yt-dlp.exe':   { sha256: '66674953fe251b89f4d08c5f0e35e0728679bd67ab3d7d05c0562af101dd3e7a' },
            'yt-dlp_macos': { sha256: '0f192b7ec147ab6288885d6351d9ab67367640029b4377576ef46dd79cf7b202' },
            'yt-dlp_linux': { sha256: '58162f9bfdc27458ea47bfcb311cf47028f17d8154a8bf7d689861d46399230a' },
        },
        urlTemplate: 'https://github.com/yt-dlp/yt-dlp/releases/download/{version}/{binary}',
    },
};

/**
 * 校验文件 SHA-256 摘要
 * 无有效校验值时必须删除文件并停止
 */
function verifySha256(filePath, expectedHash) {
    if (!expectedHash || typeof expectedHash !== 'string' || expectedHash.length !== 64 || expectedHash.startsWith('<')) {
        try { fs.unlinkSync(filePath); } catch (e) {}
        throw new Error(`SHA-256 verification failed for ${path.basename(filePath)}: hash missing or invalid`);
    }
    const fileBuffer = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    if (hash.toLowerCase() !== expectedHash.toLowerCase()) {
        try { fs.unlinkSync(filePath); } catch (e) {}
        throw new Error(`SHA-256 verification failed for ${path.basename(filePath)}: expected ${expectedHash}, got ${hash}`);
    }
}

function getYtDlpBinaryName() {
    const platform = os.platform();
    switch (platform) {
        case 'win32':   return 'yt-dlp.exe';
        case 'darwin':  return 'yt-dlp_macos';
        case 'linux':   return 'yt-dlp_linux';
        default:        return 'yt-dlp';
    }
}

function getYtDlpPath() {
    return path.join(BIN_DIR, getYtDlpBinaryName());
}

function isYtDlpInstalled() {
    return fs.existsSync(getYtDlpPath());
}

function getEagleFfmpegPath() {
    const platform = os.platform();
    const archName = os.arch() === 'arm64' ? 'arm64' : 'x64';
    const dataDir = platform === 'darwin'
        ? path.join(os.homedir(), 'Library', 'Application Support', 'Eagle')
        : platform === 'win32'
            ? path.join(os.homedir(), 'AppData', 'Roaming', 'Eagle')
            : path.join(os.homedir(), '.config', 'Eagle');
    const dirName = platform === 'darwin' ? `ffmpeg-mac-${archName}`
        : platform === 'win32' ? `ffmpeg-win-${archName}`
        : `ffmpeg-linux-${archName}`;
    const bin = platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
    return path.join(dataDir, 'Plugins', dirName, bin);
}

function resolveFfmpeg() {
    const p = getEagleFfmpegPath();
    if (fs.existsSync(p)) return { source: 'eagle', path: p };
    return null;
}

/**
 * 检测 ffmpeg 来源
 */
function getFfmpegSource() {
    return resolveFfmpeg()?.source ?? null;
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
function downloadFile(url, destPath, onProgress, retriesLeft = DOWNLOAD_MAX_RETRIES, idleTimeoutMs = DOWNLOAD_IDLE_TIMEOUT_MS, maxRedirects = 5) {
    return new Promise((resolve, reject) => {
        const tmpPath = `${destPath}.download`;
        const file = fs.createWriteStream(tmpPath);
        let settled = false;
        let request = null;

        const cleanupFile = () => {
            file.close();
            if (fs.existsSync(tmpPath)) {
                try { fs.unlinkSync(tmpPath); } catch (e) {}
            }
        };

        const handleFailure = (error) => {
            if (settled) return;
            settled = true;
            if (request) request.destroy();
            cleanupFile();

            if (retriesLeft > 0) {
                downloadFile(url, destPath, onProgress, retriesLeft - 1, idleTimeoutMs).then(resolve).catch(reject);
            } else {
                reject(error);
            }
        };

        const onResponse = (response) => {
            // 处理重定向（301/302/307/308）
            if ([301, 302, 307, 308].includes(response.statusCode)) {
                settled = true;
                cleanupFile();
                const redirectUrl = response.headers.location;
                if (!redirectUrl) {
                    reject(new Error('Redirect missing location header'));
                    return;
                }
                if (maxRedirects <= 0) {
                    reject(new Error('Too many redirects'));
                    return;
                }
                // 递归的 downloadFile 会经由 secureHttpsGet 重新校验并 pin IP
                downloadFile(redirectUrl, destPath, onProgress, retriesLeft, idleTimeoutMs, maxRedirects - 1)
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
        };

        // secureHttpsGet 会先做 DNS 校验（fail-closed），再把连接 pin 到已校验 IP
        secureHttpsGet(url, onResponse)
            .then((req) => {
                request = req;
                request.setTimeout(idleTimeoutMs, () => {
                    handleFailure(new Error('Download timed out: no data received'));
                });
                request.on('error', handleFailure);
            })
            .catch(handleFailure);
    });
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
    const binaryName = getYtDlpBinaryName();
    const asset = PINNED_VERSIONS.ytdlp.assets[binaryName];
    if (!asset) throw new Error(`Unsupported platform: ${os.platform()}`);
    const url = PINNED_VERSIONS.ytdlp.urlTemplate
        .replace('{version}', PINNED_VERSIONS.ytdlp.version)
        .replace('{binary}', binaryName);

    await downloadFile(url, destPath, onProgress);
    verifySha256(destPath, asset.sha256);

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
function getLatestYtDlpVersion() {
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

    const latestVersion = getLatestYtDlpVersion();
    if (installedVersion !== latestVersion) {
        await downloadYtDlp(onProgress);
        return true;
    }
    return false;
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
    getFfmpegSource,
    isYtDlpInstalled,
    downloadYtDlp,
    uninstallYtDlp,
    checkAndUpdateYtDlp,
    getInstalledYtDlpVersion,
    getLatestYtDlpVersion,
    getYtDlpUpdateInfo,
    verifySha256,
};
