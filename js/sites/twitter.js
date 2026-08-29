/**
 * Twitter / X 适配器
 */

function match(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    return host === 'twitter.com' || host === 'x.com' || host.endsWith('.twitter.com') || host.endsWith('.x.com');
  } catch {
    return false;
  }
}

function getSiteArgs() {
  return [
    '--ignore-no-formats-error',
  ];
}

module.exports = {
  match,
  getSiteArgs,
};
