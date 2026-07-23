const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const projectRoot = __dirname;
const packagesRoot = path.resolve(projectRoot, '../../packages');

const config = getDefaultConfig(projectRoot);

// Necessário para o Metro seguir os symlinks criados pelo npm para os
// packages locais do monorepo (@emealia/supabase, @emealia/types, etc.,
// instalados via "file:../../packages/*").
config.resolver.unstable_enableSymlinks = true;

// Observa APENAS a pasta packages/ do monorepo (não a raiz inteira) para
// o Metro conseguir atravessar o symlink e encontrar o conteúdo real dos
// packages @emealia/*. Evitamos apontar para a raiz do monorepo inteira
// (que tem o seu próprio node_modules com react/react-dom para a app
// Next.js) para não arriscar resolução de módulos duplicados/conflituosos.
config.watchFolders = [packagesRoot];

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
