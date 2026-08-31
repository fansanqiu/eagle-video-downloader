// node js/net-guard.test.js
const assert = require('assert');
const { isPrivateIp } = require('./net-guard');

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

console.log('net-guard: all checks passed');

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
