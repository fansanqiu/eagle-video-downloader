/**
 * 测试脚本公共初始化：i18n、残骸清理、二进制保障、环境打印
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const i18next = require('i18next');
const { isYtDlpInstalled, downloadYtDlp, getFfmpegSource, BIN_DIR } = require('./js/binary');

async function setup() {
  // i18n：让错误信息可读
  await i18next.init({
    lng: 'en',
    fallbackLng: 'en',
    resources: { en: { translation: require('./Plugin/_locales/en.json') } },
  });
  global.i18next = i18next;

  // 清理中断的 .download 残骸（误以为二进制已存在的根源）
  if (!fs.existsSync(BIN_DIR)) fs.mkdirSync(BIN_DIR, { recursive: true });
  for (const f of fs.readdirSync(BIN_DIR).filter(n => n.endsWith('.download'))) {
    fs.unlinkSync(path.join(BIN_DIR, f));
    console.log(`[setup] 清理残骸: ${f}`);
  }

  // 确保二进制就位（与插件行为完全一致：SHA-256 校验 + chmod + 清隔离属性）
  if (!isYtDlpInstalled()) {
    console.log('[setup] yt-dlp 未找到，开始下载...');
    await downloadYtDlp(pct => process.stdout.write(`\r[setup] 下载中 ${pct}%  `));
    process.stdout.write('\n');
    console.log('[setup] yt-dlp 安装完成');
  }

  // 环境信息（代理状态是本次回归的关键变量）
  console.log(`[env] ffmpeg 来源: ${getFfmpegSource() || '未找到'}`);
  try {
    const proxy = execSync('scutil --proxy', { encoding: 'utf8' });
    const http = proxy.match(/HTTPProxy\s*:\s*(\S+)/)?.[1];
    const port = proxy.match(/HTTPPort\s*:\s*(\S+)/)?.[1];
    const enabled = proxy.match(/HTTPEnable\s*:\s*(\d)/)?.[1];
    console.log(`[env] 系统代理: ${enabled === '1' ? `${http}:${port}` : '未开启'}`);
  } catch (_) {
    console.log('[env] 系统代理: 无法读取（非 macOS？）');
  }
}

module.exports = { setup };
