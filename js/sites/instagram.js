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

async function handleExecFailure({ args, onProgress, onOutput, execYtDlp, authorizeCookies, url }) {
  // Instagram：Cookie 重试须经逐域名弹窗明确授权（authorizeCookies 整合开关+弹窗+缓存三重判定）
  if (!args.includes("--cookies-from-browser") && await authorizeCookies(url, 'direct')) {
    return await execYtDlp([...args, "--cookies-from-browser", "chrome"], onProgress, onOutput, { allowRecovery: false, targetUrl: url });
  }
  return null;
}

module.exports = {
  match,
  getSiteArgs,
  handleExecFailure,
};
