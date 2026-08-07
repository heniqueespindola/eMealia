// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // scripts/: ferramentas de build Node.js pontuais (ex: geração de
    // ícone placeholder), fora do bundle da app — não código React Native.
    ignores: ["dist/*", "scripts/*"],
  }
]);
