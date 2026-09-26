// Learn more https://docs.expo.dev/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// sql.js (only used for the web preview) contains Node-only branches that
// require `node:fs` / `node:crypto`. They are never executed in the browser,
// so we resolve them to an empty module to keep Metro happy.
const emptyModule = path.resolve(__dirname, 'src/db/empty-module.js');
const nodeOnly = new Set(['fs', 'crypto', 'path', 'node:fs', 'node:crypto', 'node:path']);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (nodeOnly.has(moduleName) && context.originModulePath.includes(`${path.sep}sql.js${path.sep}`)) {
    return { type: 'sourceFile', filePath: emptyModule };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
