const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Monorepo: observar a raiz do workspace para apanhar mudanças nos packages @emealia/*
config.watchFolders = [workspaceRoot];

// Monorepo: procurar módulos tanto no node_modules local como no da raiz
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Necessário para o Metro seguir corretamente os symlinks criados pelo npm workspaces / file:
config.resolver.unstable_enableSymlinks = true;
config.resolver.disableHierarchicalLookup = false;

// SVG transformer
const { transformer, resolver } = config;
config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};
config.resolver = {
  ...config.resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...resolver.sourceExts, 'svg'],
};

module.exports = withNativeWind(config, { input: './src/styles/global.css' });
