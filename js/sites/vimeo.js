/**
 * Vimeo 适配器
 */

function match(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    return host === 'vimeo.com' || host.endsWith('.vimeo.com');
  } catch {
    return false;
  }
}

function normalizeUrl(url) {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === "vimeo.com" || urlObj.hostname === "www.vimeo.com") {
      const pathParts = urlObj.pathname.split("/").filter((p) => p);
      const videoId = pathParts.find((part) => /^\d+$/.test(part));
      if (videoId) {
        return `https://player.vimeo.com/video/${videoId}`;
      }
    }
    return url;
  } catch {
    return url;
  }
}

module.exports = {
  match,
  normalizeUrl,
};
