/**
 * test-ytdlp.js — yt-dlp 二进制下载测试
 *
 * 覆盖第二条出网路径（Node https → GitHub）：
 * URL 构造 → validateUrl（DNS + 私有 IP 判定）→ HTTPS 下载 → SHA-256 校验 → chmod → 清隔离属性
 *
 * 用法：node test-ytdlp.js
 */

const fs = require('fs');
const path = require('path');
const { setup } = require('./test-setup');
const { isYtDlpInstalled, uninstallYtDlp, downloadYtDlp, getInstalledYtDlpVersion, BIN_DIR } = require('./js/binary');

async function main() {
  console.log('=== yt-dlp 二进制下载测试 ===\n');

  // 记录 setup() 之前是否已有缓存：
  // - 有缓存 → setup() 直接用，测试需强制重下才能覆盖网络路径
  // - 无缓存 → setup() 本身就是完整新装，已经测了网络路径，无需重下
  const wasCached = isYtDlpInstalled();
  await setup();
  console.log();

  const t0 = Date.now();

  if (wasCached) {
    console.log('[test] 检测到已有缓存，删除并强制重新下载以测试网络路径...');
    uninstallYtDlp();
    let lastPct = -1;
    try {
      await downloadYtDlp(pct => {
        if (pct !== lastPct) { process.stdout.write(`\r[test] 下载中 ${pct}%  `); lastPct = pct; }
      });
      process.stdout.write('\n');
    } catch (err) {
      process.stdout.write('\n');
      console.error(`[test] 下载失败: ${err.message}`);
      process.exit(1);
    }
  } else {
    console.log('[test] setup() 刚完成了一次全新安装，网络路径已通过验证');
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  // 文件大小
  const binName = process.platform === 'win32' ? 'yt-dlp.exe' : (process.platform === 'darwin' ? 'yt-dlp_macos' : 'yt-dlp_linux');
  const binPath = path.join(BIN_DIR, binName);
  const sizeMb = (fs.statSync(binPath).size / 1024 / 1024).toFixed(1);

  // 确认可执行（用 --version 实际运行）
  const version = await getInstalledYtDlpVersion();
  if (!version) {
    console.error('[test] 二进制无法执行（getInstalledYtDlpVersion 返回 null）');
    process.exit(1);
  }

  console.log(`[test] ✓ 版本: ${version}  大小: ${sizeMb} MB  耗时: ${elapsed}s`);
  console.log('\n二进制下载测试: 1/1 通过');
}

main().catch(err => { console.error(err); process.exit(1); });
