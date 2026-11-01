/**
 * Dribbble 适配器
 * 支持 Dribbble Shot 页面视频与图片解析下载
 */

const { validateUrl, assertHostAllowed, secureHttpsGet } = require("../net-guard");
const i18next = require("i18next");

const ALLOWED_DOMAINS = ['dribbble.com', 'cdn.dribbble.com'];

function match(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    return host === 'dribbble.com' || host.endsWith('.dribbble.com');
  } catch {
    return false;
  }
}

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname === 'dribbble.com' || u.hostname === 'www.dribbble.com') {
      return `${u.protocol}//${u.host}${u.pathname}`;
    }
    return url;
  } catch {
    return url;
  }
}

function getSiteArgs() {
  return [
    '--referer', 'https://dribbble.com/',
    '--add-header', 'User-Agent:Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ];
}

function parseJinaResponse(raw) {
  let title = "Dribbble Shot";
  let description = "";
  let content = raw;
  let ogImage = null;
  let creator = "Dribbble";

  if (raw.trim().startsWith("{")) {
    try {
      const json = JSON.parse(raw);
      const d = json.data || {};
      const meta = d.metadata || {};
      title = d.title || meta["og:title"] || title;
      description = d.description || meta["description"] || "";
      content = d.content || "";
      creator = meta["twitter:creator"] || creator;
      if (meta["og:image"]) {
        ogImage = Array.isArray(meta["og:image"]) ? meta["og:image"][0] : meta["og:image"];
      }
    } catch {}
  } else {
    const titleMatch = raw.match(/^Title:\s*(.+)$/m);
    if (titleMatch) title = titleMatch[1].trim();
  }

  const videoMatch = content.match(/https:\/\/cdn\.dribbble\.com\/(?:userupload|users)\/[^\s\)"\x27]+\.mp4/i)
    || raw.match(/https:\/\/cdn\.dribbble\.com\/(?:userupload|users)\/[^\s\)"\x27]+\.mp4/i);

  const imgMatch = content.match(/https:\/\/cdn\.dribbble\.com\/userupload\/[^\s\)"\x27]+\.(?:jpg|jpeg|png|webp|gif)/i)
    || raw.match(/https:\/\/cdn\.dribbble\.com\/userupload\/[^\s\)"\x27]+\.(?:jpg|jpeg|png|webp|gif)/i)
    || ogImage;

  return {
    title,
    description,
    creator,
    videoUrl: videoMatch ? videoMatch[0] : null,
    imageUrl: imgMatch ? (typeof imgMatch === "string" ? imgMatch : imgMatch[0]) : null,
  };
}

function fetchShotData(shotUrl) {
  return new Promise(async (resolve) => {
    try {
      const jinaUrl = `https://r.jina.ai/${shotUrl}`;
      await validateUrl(jinaUrl);
      const req = await secureHttpsGet(
        jinaUrl,
        {
          headers: {
            "Accept": "application/json",
            "X-Return-Format": "json",
          },
        },
        (res) => {
          if (res.statusCode !== 200) {
            res.resume();
            resolve(null);
            return;
          }
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("error", () => resolve(null));
          res.on("aborted", () => resolve(null));
          res.on("end", () => {
            resolve(parseJinaResponse(body));
          });
        }
      );
      req.on("error", () => resolve(null));
      req.setTimeout(20000, () => {
        req.destroy();
        resolve(null);
      });
    } catch (e) {
      resolve(null);
    }
  });
}

async function customGetInfo(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.toLowerCase() === 'cdn.dribbble.com') {
      return null;
    }
  } catch {
    return null;
  }

  if (!url.includes('/shots/')) {
    return null;
  }

  const cleanUrl = normalizeUrl(url);
  const shotData = await fetchShotData(cleanUrl);
  if (!shotData) {
    throw new Error(i18next.t("error.dribbbleExtractFailed"));
  }

  const shotIdMatch = url.match(/\/shots\/(\d+)/);
  const shotId = shotIdMatch ? shotIdMatch[1] : null;

  if (shotData.videoUrl) {
    assertHostAllowed(shotData.videoUrl, ALLOWED_DOMAINS);
    await validateUrl(shotData.videoUrl);

    return {
      title: shotData.title,
      description: shotData.description,
      uploader: shotData.creator || 'Dribbble',
      extractor: 'dribbble',
      webpage_url: shotData.videoUrl,
      thumbnail: shotData.imageUrl,
      duration: 0,
      id: shotId,
    };
  }

  if (shotData.imageUrl) {
    assertHostAllowed(shotData.imageUrl, ALLOWED_DOMAINS);
    await validateUrl(shotData.imageUrl);

    return {
      type: 'image',
      imageUrl: shotData.imageUrl,
      title: shotData.title,
      description: shotData.description,
      duration: 0,
      thumbnail: shotData.imageUrl,
      uploader: shotData.creator || 'Dribbble',
      extractor: 'dribbble',
      webpage_url: url,
      id: shotId,
    };
  }

  throw new Error(i18next.t("error.dribbbleNoMedia"));
}

module.exports = {
  match,
  normalizeUrl,
  getSiteArgs,
  customGetInfo,
};
