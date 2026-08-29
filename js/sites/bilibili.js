/**
 * Bilibili 适配器
 */

function match(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    return host === 'bilibili.com' || host === 'b23.tv' || host.endsWith('.bilibili.com');
  } catch {
    return false;
  }
}

function getSiteArgs(url) {
  return [
    '--referer', 'https://www.bilibili.com',
    '--add-header', 'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ];
}

async function handleExecFailure({ stderr, args, onProgress, onOutput, execYtDlp, url }) {
  const is412 = stderr.includes("HTTP Error 412");
  const alreadyHasReferer = args.includes("--referer");
  if (is412 && !alreadyHasReferer) {
    const extraArgs = getSiteArgs(url);
    if (extraArgs.length > 0) {
      return await execYtDlp([...args, ...extraArgs], onProgress, onOutput, false);
    }
  }
  return null;
}

module.exports = {
  match,
  getSiteArgs,
  handleExecFailure,
};
