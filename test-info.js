/**
 * test-info.js — 快速解析测试（秒级）
 *
 * 覆盖第一条出网路径（yt-dlp 子进程 → 视频站点）：
 * 对 test-urls.js 里每条链接调 getVideoInfo()，打印解析结果，不下载。
 *
 * 用法：node test-info.js
 */

const { setup } = require('./test-setup');
const { getVideoInfo } = require('./js/downloader');
const URLS = require('./test-urls');

async function main() {
  console.log('=== 视频链接解析测试 ===\n');
  await setup();
  console.log();

  let passed = 0;
  for (let i = 0; i < URLS.length; i++) {
    const url = URLS[i];
    console.log(`[${i + 1}/${URLS.length}] ${url}`);
    const t0 = Date.now();
    try {
      const info = await getVideoInfo(url);
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      if (info.type === 'image') {
        console.log(`  ✓ [image] ${info.title || '(无标题)'}  (${elapsed}s)`);
      } else {
        const dur = info.duration ? `  时长: ${info.duration}s` : '';
        console.log(`  ✓ ${info.title || '(无标题)'}${dur}  (${elapsed}s)`);
      }
      passed++;
    } catch (err) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      const msg = err.message ? err.message.split('\n')[0] : String(err);
      console.log(`  ✗ ${msg}  (${elapsed}s)`);
    }
    console.log();
  }

  console.log(`解析测试: ${passed}/${URLS.length} 通过`);
  process.exit(passed === URLS.length ? 0 : 1);
}

main().catch(err => { console.error(err); process.exit(1); });
