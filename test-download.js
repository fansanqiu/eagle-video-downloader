/**
 * test-download.js — 可下载性验证测试（秒级）
 *
 * 验证端到端各站点可下载性：
 * 通过 getVideoInfo() 解析元数据，并用 yt-dlp --simulate 真实模拟下载流程
 * （连接视频源、校验可用 formats、执行 extractor，但不将实际媒体流写入磁盘）。
 *
 * 用法：node test-download.js
 */

const { setup } = require('./test-setup');
const { getVideoInfo } = require('./js/downloader');
const { getYtDlpPath } = require('./js/binary');
const { getSiteArgs } = require('./js/sites');
const { spawn } = require('child_process');
const https = require('https');
const URLS = require('./test-urls');

function verifySimulate(targetUrl) {
  return new Promise((resolve, reject) => {
    const args = [
      '--force-ipv4',
      '--no-warnings',
      '--simulate',
      '-f',
      'bestvideo+bestaudio/best/b',
      ...getSiteArgs(targetUrl),
      targetUrl,
    ];

    const proc = spawn(getYtDlpPath(), args);
    let stderr = '';

    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`yt-dlp exited with code ${code}: ${stderr.trim()}`));
      }
    });
  });
}

function verifyImageUrl(imageUrl) {
  return new Promise((resolve, reject) => {
    https.get(imageUrl, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        resolve();
      } else {
        reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.resume();
    }).on('error', reject);
  });
}

async function main() {
  console.log('=== 视频链接可下载性测试（模拟下载，不占磁盘）===\n');
  await setup();
  console.log();

  let passed = 0;
  const t0Total = Date.now();

  for (let i = 0; i < URLS.length; i++) {
    const url = URLS[i];
    console.log(`[${i + 1}/${URLS.length}] ${url}`);
    const t0 = Date.now();
    try {
      // 1. 获取视频/媒体信息
      const info = await getVideoInfo(url);

      // 2. 验证可下载性
      if (info.type === 'image' && info.imageUrl) {
        await verifyImageUrl(info.imageUrl);
        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(`  ✓ [图片Pin] 可下载: ${info.title || '(无标题)'}  (${elapsed}s)`);
      } else {
        const targetUrl = (info && typeof info.webpage_url === 'string' && info.webpage_url.startsWith('https'))
          ? info.webpage_url
          : url;
        await verifySimulate(targetUrl);
        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(`  ✓ [视频源] 可下载: ${info.title || '(无标题)'}  (${elapsed}s)`);
      }
      passed++;
    } catch (err) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      const msg = err.message ? err.message.split('\n')[0] : String(err);
      console.log(`  ✗ ${msg}  (${elapsed}s)`);
    }
    console.log();
  }

  const totalSec = ((Date.now() - t0Total) / 1000).toFixed(0);
  console.log(`可下载性测试: ${passed}/${URLS.length} 通过  总耗时: ${totalSec}s`);
  process.exit(passed === URLS.length ? 0 : 1);
}

main().catch(err => { console.error(err); process.exit(1); });
