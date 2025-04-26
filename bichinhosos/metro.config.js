const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    'missing-asset-registry-path': path.resolve(__dirname, 'assets/empty.png'),
  },
  assetExts: [
    ...config.resolver.assetExts,
    'png',
    'jpg',
    'svg',
    'ttf',
    'otf',
  ],
  sourceExts: [...config.resolver.sourceExts, 'mjs'],
};

module.exports = config;