/**
 * Instagram 适配器
 */

function match(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    return host === 'instagram.com' || host.endsWith('.instagram.com');
  } catch {
    return false;
  }
}

function getSiteArgs() {
  return [
    '--referer', 'https://www.instagram.com/',
    '--add-header', 'User-Agent:Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ];
}

async function handleExecFailure({ args, onProgress, onOutput, execYtDlp, hasCookieConsent }) {
  // Instagram：仅在用户显式 Opt-in 时使用浏览器 Cookie 重试
  if (!args.includes("--cookies-from-browser") && hasCookieConsent()) {
    return await execYtDlp([...args, "--cookies-from-browser", "chrome"], onProgress, onOutput, false);
  }
  return null;
}

module.exports = {
  match,
  getSiteArgs,
  handleExecFailure,
};
