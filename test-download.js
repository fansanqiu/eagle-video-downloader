/**
 * test-download.js — 真实下载测试（分钟级）
 *
 * 覆盖第一条出网路径（yt-dlp 子进程 → 视频站点）：
 * 对 test-urls.js 里每条链接调 downloadVideo()，报告文件大小，测完立即清理。
 *
 * 用法：node test-download.js
 */

const fs = require('fs');
const { setup } = require('./test-setup');
const { downloadVideo, cleanup } = require('./js/downloader');
const URLS = require('./test-urls');

async function main() {
  console.log('=== 视频链接下载测试 ===\n');
  await setup();
  console.log();

  let passed = 0;
  const t0Total = Date.now();

  for (let i = 0; i < URLS.length; i++) {
    const url = URLS[i];
    console.log(`[${i + 1}/${URLS.length}] ${url}`);
    const t0 = Date.now();
    let lastPct = -1;
    try {
      const results = await downloadVideo(
        url,
        prog => {
          const pct = prog.percent ?? 0;
          if (pct !== lastPct) {
            process.stdout.write(`\r  下载中 ${pct}%${prog.currentSpeed ? '  ' + prog.currentSpeed : ''}  `);
            lastPct = pct;
          }
        },
        null,
      );
      process.stdout.write('\n');

      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      for (const r of results) {
        const sizeMb = (fs.statSync(r.path).size / 1024 / 1024).toFixed(1);
        console.log(`  ✓ ${r.filename || r.path}  ${sizeMb} MB  (${elapsed}s)`);
        cleanup(r.path);
      }
      passed++;
    } catch (err) {
      process.stdout.write('\n');
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      const msg = err.message ? err.message.split('\n')[0] : String(err);
      console.log(`  ✗ ${msg}  (${elapsed}s)`);
    }
    console.log();
  }

  const totalSec = ((Date.now() - t0Total) / 1000).toFixed(0);
  console.log(`下载测试: ${passed}/${URLS.length} 通过  总耗时: ${totalSec}s`);
  process.exit(passed === URLS.length ? 0 : 1);
}

main().catch(err => { console.error(err); process.exit(1); });
