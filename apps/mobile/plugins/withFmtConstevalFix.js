// Config plugin: corrige o erro de compilação do pod `fmt` no iOS
// ("call to consteval function ... is not a constant expression"),
// causado por versões recentes do Clang (Xcode 16+) passarem a validar
// `consteval` de forma mais estrita do que a versão de `fmt` fixada pelo
// React Native espera. Fix documentado pela comunidade RN: definir a macro
// FMT_CONSTEVAL como vazia só para o target `fmt`, o que faz a própria
// biblioteca deixar de usar `consteval` nesses pontos.
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withFmtConstevalFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf-8');

      const marker = "target.name == 'fmt'";
      if (!contents.includes(marker)) {
        const fix = `
    installer.pods_project.targets.each do |target|
      if target.name == 'fmt'
        target.build_configurations.each do |config|
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FMT_CONSTEVAL='
        end
      end
    end
`;
        contents = contents.replace(
          /post_install do \|installer\|\n/,
          (match) => `${match}${fix}`
        );
        fs.writeFileSync(podfilePath, contents);
      }

      return config;
    },
  ]);
};
