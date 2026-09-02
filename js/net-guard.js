/**
 * 网络安全防护模块
 * 处理 IP 地址校验与 URL 安全检查（防 SSRF）
 *
 * 错误代码约定：安全拒绝（非网络故障）统一附带 err.code = 'ENETBOUNDARY'，
 * 便于调用方与普通网络错误区分，以及 UI 层给出准确提示。
 */

const net = require('net');
const dns = require('dns');
const https = require('https');

/**
 * 检查 IP 地址是否为私有/保留/回环/链路本地/文档地址
 */
function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    if (parts[0] === 10) return true;                                       // 10.0.0.0/8
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;   // 172.16.0.0/12
    if (parts[0] === 192 && parts[1] === 168) return true;                  // 192.168.0.0/16
    if (parts[0] === 127) return true;                                       // 127.0.0.0/8
    if (parts[0] === 169 && parts[1] === 254) return true;                  // 169.254.0.0/16 (含云 metadata)
    if (parts[0] === 0) return true;                                         // 0.0.0.0/8
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;  // 100.64.0.0/10 (CGNAT)
    if (parts[0] === 192 && parts[1] === 0 && parts[2] === 2) return true;   // 192.0.2.0/24 (文档)
    if (parts[0] === 198 && parts[1] === 51 && parts[2] === 100) return true; // 198.51.100.0/24 (文档)
    if (parts[0] === 203 && parts[1] === 0 && parts[2] === 113) return true;  // 203.0.113.0/24 (文档)
    if (parts[0] >= 224 && parts[0] <= 239) return true;                     // 224.0.0.0/4 (多播)
    if (parts[0] >= 240) return true;                                        // 240.0.0.0/4 (保留) + 255.255.255.255 (广播)
  }
  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    if (normalized === '::1' || normalized === '::') return true;
    if (normalized.startsWith('fe80:')) return true;                         // link-local
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // unique local
    if (normalized.startsWith('::ffff:')) {                                  // IPv4-mapped IPv6
      const mapped = normalized.slice(7);
      if (net.isIPv4(mapped)) return isPrivateIp(mapped);
    }
    if (normalized.startsWith('64:ff9b:')) return true;                      // NAT64 64:ff9b::/96
    if (normalized.startsWith('2001:db8:')) return true;                     // 文档地址
    if (normalized.startsWith('2001:') && (normalized.startsWith('2001:0:') || normalized === '2001::')) return true; // Teredo
    if (normalized.startsWith('2002:')) return true;                         // 6to4
    if (normalized.startsWith('ff')) return true;                            // 多播
    if (normalized.startsWith('100:')) return true;                           // discard prefix
  }
  return false;
}

/**
 * 安全 URL 验证：仅允许 HTTPS，限制端口为空或 443，阻断 localhost 及内网/私有 IP 地址。
 * DNS 解析失败直接拒绝；仅 IPv4 解析（配合 --force-ipv4 与 pinnedLookup 的 family 4，
 * 整个下载链路强制走 IPv4）；任一解析结果为私有即拒绝（fail-closed）。
 * 返回 { parsed, addresses }，addresses 为已校验的目标 IP 列表，供调用方 pin IP 防 rebinding。
 *
 * 安全拒绝时抛出带 code='ENETBOUNDARY' 的 Error，普通网络故障不带该 code。
 */
function boundaryError(message) {
  const err = new Error(message);
  err.code = 'ENETBOUNDARY';
  return err;
}

async function validateUrl(url) {
  if (typeof url !== 'string' || !url.trim()) {
    throw boundaryError('Invalid URL');
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw boundaryError(`Invalid URL: ${url}`);
  }

  if (parsed.protocol !== 'https:') {
    throw boundaryError('Only HTTPS URLs are allowed');
  }

  // 拒绝含 userinfo（user:password@host）的 URL，防止凭证注入
  if (parsed.username || parsed.password) {
    throw boundaryError('URLs with userinfo (credentials) are not allowed');
  }

  // 仅允许默认 HTTPS 端口（443）或省略端口
  if (parsed.port !== '' && parsed.port !== '443') {
    throw boundaryError(`Non-standard port ${parsed.port} is not allowed`);
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname === '[::1]') {
    throw boundaryError('Access to localhost is blocked');
  }

  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw boundaryError(`Access to private IP address ${hostname} is blocked`);
    }
    return { parsed, addresses: [hostname] };
  }

  try {
    const addresses = await dns.promises.resolve4(hostname).catch(() => []);
    if (addresses.length === 0) {
      throw boundaryError(`DNS resolution returned no addresses for ${hostname}`);
    }
    // fail-closed：任一解析结果为私有/保留地址即拒绝
    const badAddr = addresses.find(addr => isPrivateIp(addr));
    if (badAddr) {
      throw boundaryError(`Resolved address ${badAddr} for ${hostname} is private, access blocked`);
    }
    return { parsed, addresses };
  } catch (e) {
    if (e.code === 'ENETBOUNDARY') throw e;
    throw new Error(`DNS resolution failed for ${hostname}: ${e.message}`);
  }
}

/**
 * 生成一个固定到已校验 IPv4 地址列表的 dns.lookup 替代函数
 * 用于 https 请求的 lookup 选项，防止校验后连接前发生 DNS rebinding。
 * 返回全部已校验地址，强制使用 IPv4。
 * TLS servername 仍使用原始 hostname，证书校验不受影响。
 */
function pinnedLookup(addresses) {
  const list = addresses.map(ip => ({ address: ip, family: 4 }));
  return (hostname, options, callback) => {
    if (options && options.all) return callback(null, list);
    return callback(null, list[0].address, 4);
  };
}

/**
 * 判断是否为网络连通性错误（超时/DNS/连接失败等）
 * 用于在 UI 层将底层错误替换为用户友好的「请检查网络」提示。
 * 注意：code='ENETBOUNDARY' 的安全阻断错误不属于网络故障，返回 false。
 */
const NETWORK_ERROR_PATTERNS = /timed out|timeout|ENOTFOUND|ECONNREFUSED|ECONNRESET|EHOSTUNREACH|ENETUNREACH|EAI_AGAIN|socket hang up|DNS resolution/i;
function isNetworkError(err) {
  if (err?.code === 'ENETBOUNDARY') return false;
  return NETWORK_ERROR_PATTERNS.test(err?.message || '') || NETWORK_ERROR_PATTERNS.test(err?.code || '');
}

/**
 * 校验 URL 的 hostname 是否属于允许的域名列表。
 * 判断方式：hostname === domain 或 hostname.endsWith('.' + domain)（精确主机/子域匹配，
 * 不使用全 URL 文本子串匹配，防止如 attacker.example/?ref=instagram.com 绕过）。
 * @param {string} url  待检查的完整 URL
 * @param {string[]} domains  允许的裸域名数组（如 ['instagram.com', 'youtube.com']）
 * @throws {Error} code='ENETBOUNDARY' 当 hostname 不在允许列表时
 */
function assertHostAllowed(url, domains) {
  let hostname;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    throw boundaryError(`Invalid URL for host check: ${url}`);
  }
  const allowed = domains.some(
    d => hostname === d || hostname.endsWith('.' + d)
  );
  if (!allowed) {
    throw boundaryError(`Host ${hostname} is not in the allowed platform list`);
  }
}

/**
 * 安全 HTTPS GET：先 validateUrl 校验，再将连接 pin 到已校验 IP。
 * 返回 https.ClientRequest（与 https.get 一致），调用方可 .on('error')/setTimeout。
 * 注意：这是异步的（需先做 DNS 校验），返回 Promise<ClientRequest>。
 */
async function secureHttpsGet(url, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  options = options || {};
  const { addresses } = await validateUrl(url);
  const getOptions = { ...options, lookup: pinnedLookup(addresses) };
  return https.get(url, getOptions, callback);
}

module.exports = {
  isPrivateIp,
  validateUrl,
  assertHostAllowed,
  pinnedLookup,
  secureHttpsGet,
  isNetworkError,
};
