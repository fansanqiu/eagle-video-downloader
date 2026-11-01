const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { Readable } = require('node:stream');
const { test } = require('node:test');

function loadModule(name, overrides, root) {
  const module = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, name), 'utf8');
  const wrapped = vm.runInNewContext(`(function(require, module, exports, __dirname) { ${source}\n})`, {
    document: overrides.document, window: overrides.window, i18next: overrides.i18next,
    eagle: overrides.eagle,
    CustomEvent: overrides.CustomEvent, URL, Buffer, setImmediate, setTimeout, clearTimeout, console,
  });
  wrapped(id => id in overrides ? overrides[id] : require(id), module, module.exports, root);
  return module.exports;
}

function network(body, statusCode = 200) {
  return {
    validateUrl: async () => {},
    assertHostAllowed: () => {},
    secureHttpsGet: async (url, options, callback) => {
      if (typeof options === 'function') callback = options;
      const req = new EventEmitter();
      req.setTimeout = () => {};
      req.destroy = () => {};
      setImmediate(() => {
        const bytes = Buffer.from(typeof body === 'function' ? body(url) : body);
        const response = Readable.from([bytes]);
        response.statusCode = statusCode;
        response.headers = { 'content-length': String(bytes.length) };
        callback(response);
      });
      return req;
    },
  };
}

test('same-title downloads retain independent media files', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eagle-media-test-'));
  try {
    const downloader = loadModule('downloader.js', {
      os: { ...os, tmpdir: () => root },
      './net-guard': network(url => url.includes('/one/') ? 'first-image' : 'second-image'),
      './binary': {},
      './sites': {},
      i18next: { t: key => key },
    }, __dirname);
    const results = await Promise.all(['one', 'two'].map(id => downloader.downloadVideo(
      `https://dribbble.com/shots/${id}`,
      null,
      null,
      { type: 'image', title: 'Same title', imageUrl: `https://cdn.dribbble.com/${id}/image.png` }
    )));
    assert.notEqual(results[0][0].path, results[1][0].path);
    assert.equal(fs.readFileSync(results[0][0].path, 'utf8'), 'first-image');
    assert.equal(fs.readFileSync(results[1][0].path, 'utf8'), 'second-image');
    downloader.cleanup(results[0][0].path);
    assert.equal(fs.readFileSync(results[1][0].path, 'utf8'), 'second-image');
    downloader.cleanup(results[1][0].path);
    assert.equal(fs.readdirSync(path.join(root, 'eagle-video-downloader')).length, 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('cancelling a download kills the yt-dlp process tree and removes its temp files', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eagle-cancel-test-'));
  try {
    const ytdlpPath = path.join(root, 'yt-dlp.exe');
    fs.writeFileSync(ytdlpPath, '');
    const spawned = [];
    let ytdlpProc;
    const spawn = (command, args) => {
      const proc = new EventEmitter();
      proc.pid = 4242;
      proc.stdout = new EventEmitter();
      proc.stderr = new EventEmitter();
      proc.kill = () => {};
      spawned.push({ command, args: [...args] });
      if (command === ytdlpPath) {
        ytdlpProc = proc;
        // 模拟 yt-dlp 已写入部分文件
        fs.writeFileSync(`${args[args.indexOf('-o') + 1].replace('%(autonumber)s.%(ext)s', '1')}.mp4.part`, 'partial');
      } else {
        setImmediate(() => ytdlpProc.emit('close', null));
      }
      return proc;
    };
    const downloader = loadModule('downloader.js', {
      os: { ...os, tmpdir: () => root, platform: () => 'win32' },
      child_process: { spawn },
      './net-guard': network(''),
      './binary': { getYtDlpPath: () => ytdlpPath, getFfmpegPath: () => null },
      './sites': { normalizeUrl: url => url, getSiteArgs: () => [], handleExecFailure: async () => null },
      i18next: { t: key => key },
    }, __dirname);
    const controller = new AbortController();
    const download = downloader.downloadVideo('https://example.com/video', null, null,
      { title: 'Clip', webpage_url: 'https://example.com/video' }, { signal: controller.signal });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(fs.readdirSync(path.join(root, 'eagle-video-downloader')).length, 1);
    controller.abort();
    await assert.rejects(download, { code: 'ECANCELLED' });
    assert.deepEqual(spawned[1], { command: 'taskkill', args: ['/pid', '4242', '/T', '/F'] });
    assert.equal(fs.readdirSync(path.join(root, 'eagle-video-downloader')).length, 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('failed yt-dlp checksum retains the installed executable', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eagle-binary-test-'));
  try {
    const binary = loadModule('binary.js', { './net-guard': network('invalid-release') }, path.join(root, 'dist'));
    fs.mkdirSync(binary.BIN_DIR, { recursive: true });
    fs.writeFileSync(binary.getYtDlpPath(), 'working-installed-release');
    await assert.rejects(binary.downloadYtDlp(), /SHA-256 verification failed/);
    assert.equal(fs.readFileSync(binary.getYtDlpPath(), 'utf8'), 'working-installed-release');
    assert.deepEqual(fs.readdirSync(binary.BIN_DIR), [path.basename(binary.getYtDlpPath())]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('Dribbble rejects media links in failed Jina responses', async () => {
  const adapter = loadModule('sites/dribbble.js', {
    '../net-guard': network('Title: Error\nhttps://cdn.dribbble.com/userupload/123/error.png', 503),
    i18next: { t: key => key },
  }, path.join(__dirname, 'sites'));
  await assert.rejects(adapter.customGetInfo('https://dribbble.com/shots/123'), /dribbbleExtractFailed/);
});

test('Dribbble cancellation preserves input and sends no download event', async () => {
  const i18next = require('i18next').createInstance();
  await i18next.init({ lng: 'en', resources: { en: { translation: require('../Plugin/_locales/en.json') } } });
  const clicks = {};
  const events = [];
  const input = { value: 'https://dribbble.com/shots/123?tracking=test#comments', addEventListener() {} };
  const button = {
    classList: { add() {}, remove() {} }, querySelector: () => null,
    addEventListener: (name, handler) => { clicks[name] = handler; },
  };
  let allow = false;
  const confirmations = [];
  const ui = loadModule('ui.js', {
    './sites/dribbble': require('./sites/dribbble'),
    document: {
      getElementById: id => id === 'urlInput' ? input : button,
      dispatchEvent: event => events.push(event),
    },
    window: { confirm: message => { confirmations.push(message); return allow; } },
    i18next,
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
  }, __dirname);
  ui.setupInputBar();
  clicks.click();
  assert.equal(events.length, 0);
  assert.equal(input.value, 'https://dribbble.com/shots/123?tracking=test#comments');
  assert(confirmations[0].includes('https://dribbble.com/shots/123'));
  assert(!confirmations[0].includes('&#x2F;'));
  assert(!confirmations[0].includes('tracking=test'));
  allow = true;
  clicks.click();
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'startDownload');
  assert.equal(input.value, '');
});

test('Eagle HTML entry keeps binary files inside its supplied plugin path', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eagle-path-test-'));
  try {
    const pluginRoot = path.join(root, 'Plugin');
    const binary = loadModule('binary.js', {}, pluginRoot);
    let initialize;
    loadModule('plugin.js', {
      './binary': binary, './downloader': {}, './ui': {},
      i18next: { init: async () => { throw new Error('stop before UI setup'); } },
      eagle: {
        app: { locale: 'en' },
        onPluginCreate: callback => { initialize = callback; },
        onThemeChanged() {},
      },
    }, pluginRoot);
    await assert.rejects(initialize({ path: pluginRoot }), /stop before UI setup/);
    assert.equal(path.dirname(binary.getYtDlpPath()), path.join(pluginRoot, 'bin'));
    assert.equal(binary.BIN_DIR, path.join(pluginRoot, 'bin'));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
