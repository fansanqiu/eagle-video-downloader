/**
 * 网络安全防护模块
 * 处理 IP 地址校验与 URL 安全检查（防 SSRF）
 */

const net = require('net');
const dns = require('dns');

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
    if (parts[0] === 169 && parts[1] === 254) return true;                  // 169.254.0.0/16
    if (parts[0] === 0) return true;                                         // 0.0.0.0/8
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
    if (normalized.startsWith('2001:db8:')) return true;                     // 文档地址
    if (normalized.startsWith('2001:') && (normalized.startsWith('2001:0:') || normalized === '2001::')) return true; // Teredo
    if (normalized.startsWith('2002:')) return true;                         // 6to4
    if (normalized.startsWith('ff')) return true;                            // 多播
    if (normalized.startsWith('100:')) return true;                           // discard prefix
  }
  return false;
}

/**
 * 安全 URL 验证：仅允许 HTTPS，阻断 localhost 及内网/私有 IP 地址
 * DNS 解析失败直接拒绝，IPv4/IPv6 双栈解析校验
 */
async function validateUrl(url) {
  if (typeof url !== 'string' || !url.trim()) {
    throw new Error('Invalid URL');
  }

  const parsed = new URL(url);

  if (parsed.protocol !== 'https:') {
    throw new Error('Only HTTPS URLs are allowed');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname === '[::1]') {
    throw new Error('Access to localhost is blocked');
  }

  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new Error(`Access to private IP address ${hostname} is blocked`);
    }
  } else {
    try {
      const [v4Addrs, v6Addrs] = await Promise.all([
        dns.promises.resolve4(hostname).catch(() => []),
        dns.promises.resolve6(hostname).catch(() => []),
      ]);
      const addresses = [...v4Addrs, ...v6Addrs];
      if (addresses.length === 0) {
        throw new Error(`DNS resolution returned no addresses for ${hostname}`);
      }
      const publicAddrs = addresses.filter(addr => !isPrivateIp(addr));
      if (publicAddrs.length === 0) {
        throw new Error(`All resolved addresses for ${hostname} are private, access blocked`);
      }
    } catch (e) {
      if (e.message && (e.message.includes('private') || e.message.includes('blocked') || e.message.includes('no addresses'))) throw e;
      throw new Error(`DNS resolution failed for ${hostname}: ${e.message}`);
    }
  }

  return parsed;
}

module.exports = {
  isPrivateIp,
  validateUrl,
};
