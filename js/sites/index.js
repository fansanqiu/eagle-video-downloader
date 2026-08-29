/**
 * 站点适配器聚合调度
 */

const bilibili = require('./bilibili');
const twitter = require('./twitter');
const vimeo = require('./vimeo');
const instagram = require('./instagram');
const pinterest = require('./pinterest');

const adapters = [
  bilibili,
  twitter,
  vimeo,
  instagram,
  pinterest,
];

function findAdapter(url) {
  if (!url || typeof url !== 'string') return null;
  for (const adapter of adapters) {
    if (adapter.match(url)) {
      return adapter;
    }
  }
  return null;
}

function normalizeUrl(url) {
  const adapter = findAdapter(url);
  if (adapter && typeof adapter.normalizeUrl === 'function') {
    return adapter.normalizeUrl(url);
  }
  return url;
}

function getSiteArgs(url) {
  const adapter = findAdapter(url);
  if (adapter && typeof adapter.getSiteArgs === 'function') {
    return adapter.getSiteArgs(url);
  }
  return [];
}

async function customGetInfo(url, context) {
  const adapter = findAdapter(url);
  if (adapter && typeof adapter.customGetInfo === 'function') {
    return await adapter.customGetInfo(url, context);
  }
  return null;
}

async function handleExecFailure(context) {
  const { url } = context;
  const adapter = findAdapter(url);
  if (adapter && typeof adapter.handleExecFailure === 'function') {
    return await adapter.handleExecFailure(context);
  }
  return null;
}

module.exports = {
  findAdapter,
  normalizeUrl,
  getSiteArgs,
  customGetInfo,
  handleExecFailure,
};
