// node js/net-guard.test.js
const assert = require('assert');
const { isPrivateIp, validateUrl, assertHostAllowed, isNetworkError } = require('./net-guard');

assert(isPrivateIp('127.0.0.1'),          '127/8 loopback');
assert(isPrivateIp('10.0.0.1'),           '10/8 private');
assert(isPrivateIp('172.16.0.1'),         '172.16/12 private');
assert(isPrivateIp('192.168.1.1'),        '192.168/16 private');
assert(isPrivateIp('169.254.169.254'),    '169.254/16 link-local / cloud metadata');
assert(isPrivateIp('100.64.0.1'),         '100.64/10 CGNAT');
assert(!isPrivateIp('198.18.0.3'),        '198.18/15 RFC2544 benchmark — fake-ip pool, must pass');
assert(!isPrivateIp('8.8.8.8'),           'public IP');
assert(!isPrivateIp('1.1.1.1'),           'public IP');
assert(isPrivateIp('::1'),                'IPv6 loopback');
assert(isPrivateIp('::ffff:127.0.0.1'),   'IPv4-mapped loopback');
assert(isPrivateIp('fe80::1'),            'link-local IPv6');
assert(isPrivateIp('fd00::1'),            'unique local IPv6');

console.log('net-guard: isPrivateIp checks passed');

// ── assertHostAllowed ─────────────────────────────────────────────────────────
const DOMAINS = ['instagram.com', 'youtube.com', 'youtu.be', 'vimeo.com', 'tiktok.com'];

// 白名单内：精确 host 与 www. 子域
assertHostAllowed('https://instagram.com/p/abc', DOMAINS);
assertHostAllowed('https://www.instagram.com/p/abc', DOMAINS);
assertHostAllowed('https://youtube.com/watch?v=x', DOMAINS);
assertHostAllowed('https://youtu.be/x', DOMAINS);
assertHostAllowed('https://vimeo.com/12345', DOMAINS);
assertHostAllowed('https://www.tiktok.com/@user/video/1', DOMAINS);

// 白名单外：域名出现在 path/query/fragment，不得通过
let threw;
threw = false;
try { assertHostAllowed('https://attacker.example/?ref=instagram.com', DOMAINS); } catch(e) { assert.strictEqual(e.code, 'ENETBOUNDARY'); threw = true; }
assert(threw, 'attacker.example/?ref=instagram.com should be rejected');

threw = false;
try { assertHostAllowed('https://instagram.com.attacker.example/x', DOMAINS); } catch(e) { assert.strictEqual(e.code, 'ENETBOUNDARY'); threw = true; }
assert(threw, 'instagram.com.attacker.example should be rejected');

threw = false;
try { assertHostAllowed('https://attacker.example/youtube.com/', DOMAINS); } catch(e) { assert.strictEqual(e.code, 'ENETBOUNDARY'); threw = true; }
assert(threw, 'attacker.example/youtube.com/ should be rejected');

threw = false;
try { assertHostAllowed('https://myinstagram.com/x', DOMAINS); } catch(e) { assert.strictEqual(e.code, 'ENETBOUNDARY'); threw = true; }
assert(threw, 'myinstagram.com (not a subdomain) should be rejected');

// 审核方关注的绕过场景（对应 Eagle 驳回意见）：
// hostname = localhost，平台域名出现在 path 里
threw = false;
try { assertHostAllowed('https://localhost/instagram.com/x', DOMAINS); } catch(e) { assert.strictEqual(e.code, 'ENETBOUNDARY'); threw = true; }
assert(threw, 'localhost/instagram.com/x should be rejected — localhost is not in allowlist');

// hostname = 私有 IP，平台域名出现在 query 里
threw = false;
try { assertHostAllowed('https://127.0.0.1/?u=instagram.com', DOMAINS); } catch(e) { assert.strictEqual(e.code, 'ENETBOUNDARY'); threw = true; }
assert(threw, '127.0.0.1/?u=instagram.com should be rejected — private IP is not in allowlist');

// userinfo（user@host）：instagram.com 在 @ 前，实际 hostname 是 evil.example
threw = false;
try { assertHostAllowed('https://instagram.com@evil.example/x', DOMAINS); } catch(e) { assert.strictEqual(e.code, 'ENETBOUNDARY'); threw = true; }
assert(threw, 'instagram.com@evil.example should be rejected — parsed hostname is evil.example');

console.log('net-guard: assertHostAllowed checks passed');

// ── isNetworkError 排除 ENETBOUNDARY ─────────────────────────────────────────
const boundaryErr = new Error('Access to localhost is blocked');
boundaryErr.code = 'ENETBOUNDARY';
assert(!isNetworkError(boundaryErr), 'ENETBOUNDARY should NOT be classified as network error');

const dnsErr = new Error('DNS resolution failed for example.com: ENOTFOUND');
assert(isNetworkError(dnsErr), 'ENOTFOUND DNS error should be a network error');

const timeoutErr = new Error('timed out');
assert(isNetworkError(timeoutErr), 'timeout should be a network error');

console.log('net-guard: isNetworkError checks passed');

// ── validateUrl 端口限制 ──────────────────────────────────────────────────────
async function runValidateUrlTests() {
  // 非标准端口应被拒绝
  let portThrew = false;
  try { await validateUrl('https://example.com:6379/'); } catch(e) { assert.strictEqual(e.code, 'ENETBOUNDARY'); portThrew = true; }
  assert(portThrew, 'https://example.com:6379/ should be rejected (non-standard port)');

  portThrew = false;
  try { await validateUrl('https://example.com:22/'); } catch(e) { assert.strictEqual(e.code, 'ENETBOUNDARY'); portThrew = true; }
  assert(portThrew, 'https://example.com:22/ should be rejected (non-standard port)');

  portThrew = false;
  try { await validateUrl('https://example.com:9200/'); } catch(e) { assert.strictEqual(e.code, 'ENETBOUNDARY'); portThrew = true; }
  assert(portThrew, 'https://example.com:9200/ should be rejected (non-standard port)');

  // 端口 443 和省略端口应通过（需要 DNS，只测端口逻辑本身）
  portThrew = false;
  try { await validateUrl('https://localhost/'); } catch(e) { assert.strictEqual(e.code, 'ENETBOUNDARY'); portThrew = true; }
  assert(portThrew, 'https://localhost/ should be rejected by localhost check');

  portThrew = false;
  try { await validateUrl('https://192.168.1.1/'); } catch(e) { assert.strictEqual(e.code, 'ENETBOUNDARY'); portThrew = true; }
  assert(portThrew, 'https://192.168.1.1/ should be rejected by private IP check');

  // 审核方关注的绕过场景（validateUrl 层）
  // hostname = localhost，平台域名在 path
  portThrew = false;
  try { await validateUrl('https://localhost/instagram.com/x'); } catch(e) { assert.strictEqual(e.code, 'ENETBOUNDARY'); portThrew = true; }
  assert(portThrew, 'https://localhost/instagram.com/x should be blocked by localhost check');

  // hostname = 私有 IP，平台域名在 query
  portThrew = false;
  try { await validateUrl('https://127.0.0.1/?u=instagram.com'); } catch(e) { assert.strictEqual(e.code, 'ENETBOUNDARY'); portThrew = true; }
  assert(portThrew, 'https://127.0.0.1/?u=instagram.com should be blocked by private IP check');

  // userinfo：instagram.com@evil.example — 新增的显式 userinfo 拒绝
  portThrew = false;
  try { await validateUrl('https://instagram.com@evil.example/x'); } catch(e) { assert.strictEqual(e.code, 'ENETBOUNDARY'); portThrew = true; }
  assert(portThrew, 'https://instagram.com@evil.example/x should be blocked by userinfo check');

  console.log('net-guard: validateUrl port/boundary checks passed');
}

runValidateUrlTests().catch(e => { console.error(e); process.exit(1); });

// ── pickDerivedSourceUrl ──────────────────────────────────────────────────────
const { pickDerivedSourceUrl: _pick } = require('./sites/pinterest');

// 合法候选应被选出
const html1 = `{"entityId":"12345"} https://attacker.example/?ref=instagram.com https://www.instagram.com/p/abc123`;
assert.strictEqual(_pick(html1, '12345'), 'https://www.instagram.com/p/abc123', 'legit Instagram URL should be picked');

// 攻击者构造的 URL 应被跳过，返回 null（无合法候选）
const html2 = `{"entityId":"12345"} https://attacker.example/?ref=instagram.com https://instagram.com.evil.example/x`;
assert.strictEqual(_pick(html2, '12345'), null, 'no legit URL in attacker HTML should return null');

// youtu.be 应通过
const html3 = `{"entityId":"12345"} https://youtu.be/dQw4w9WgXcQ`;
assert.strictEqual(_pick(html3, '12345'), 'https://youtu.be/dQw4w9WgXcQ', 'youtu.be URL should be picked');

// 无 pinId 时扫全文
const html4 = `noise https://vimeo.com/123456 more noise`;
assert.strictEqual(_pick(html4, null), 'https://vimeo.com/123456', 'full scan should find vimeo URL');

// Pinterest SSR JSON 风格的反斜杠转义（https:\/\/ 形式），应能被提取
const html5 = `{"entityId":"99"} "originUrl":"https:\\/\\/www.instagram.com\\/p\\/abc123"`;
assert.strictEqual(_pick(html5, '99'), 'https://www.instagram.com/p/abc123', 'backslash-escaped URL in SSR JSON should be extracted');

// 审核方关注的绕过场景：hostname = localhost 或私有 IP，平台域名在 path/query，应返回 null
const html6 = `{"entityId":"77"} https://localhost/instagram.com/path https://192.168.1.1/?ref=youtube.com`;
assert.strictEqual(_pick(html6, '77'), null, 'localhost/private-IP candidates should be rejected, returning null');

console.log('net-guard: pickDerivedSourceUrl logic checks passed');

// Test buildFormatSelector in downloader.js
const { buildFormatSelector } = require('./downloader');
assert.strictEqual(
  buildFormatSelector('auto', 'auto'),
  'bestvideo+bestaudio/best/b',
  'auto auto'
);
assert.strictEqual(
  buildFormatSelector('1080', 'auto'),
  'bestvideo[height<=1080]+bestaudio/best[height<=1080]/bestvideo+bestaudio/best/b',
  '1080 auto'
);
assert.strictEqual(
  buildFormatSelector('auto', '30'),
  'bestvideo[fps<=30]+bestaudio/best[fps<=30]/bestvideo+bestaudio/best/b',
  'auto 30'
);
assert.strictEqual(
  buildFormatSelector('1080', '60'),
  'bestvideo[height<=1080][fps<=60]+bestaudio/best[height<=1080][fps<=60]/bestvideo[height<=1080]+bestaudio/best[height<=1080]/bestvideo[fps<=60]+bestaudio/best[fps<=60]/bestvideo+bestaudio/best/b',
  '1080 60'
);

console.log('downloader: format selector checks passed');
