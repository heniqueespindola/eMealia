// Config plugin com correções ao Podfile gerado pelo `expo prebuild`.
// Fica aqui porque o ios/Podfile e os Pods são regenerados sempre que corres
// `expo prebuild` ou `expo run:ios` — qualquer edição direta perdia-se a
// cada regeneração.
//
// 1) :modular_headers => true só para o AppCheckCore
//    O AppCheckCore (dependência transitiva do
//    @react-native-google-signin/google-signin) é um Swift pod que não
//    integra como biblioteca estática sem isto. Aplicar isto GLOBALMENTE
//    via `use_modular_headers!` parte o modulemap próprio do React Native
//    (erro "Redefinition of module 'react_runtime'"), por isso aplicamos
//    só a este pod específico.
//
// 2) Patch a ios/Pods/fmt/include/fmt/base.h
//    Bug de incompatibilidade entre a lib `fmt` (usada internamente pelo
//    Folly/Hermes) e versões de Xcode/Clang mais recentes que aquelas que a
//    fmt previa quando decide se usa `consteval` (C++20). A macro
//    FMT_USE_CONSTEVAL é definida de forma incondicional dentro do próprio
//    header (sem verificar se já foi definida por fora via -D), por isso
//    passar flags ao compilador não tem qualquer efeito — a única forma
//    fiável é reescrever essa macro para 0 diretamente no ficheiro depois
//    de instalado pelo CocoaPods, forçando a fmt a usar o caminho antigo
//    (constexpr, sem consteval) que compila normalmente.
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withPodfileFixes(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf-8');

      if (!contents.includes("'AppCheckCore', :modular_headers")) {
        contents = contents.replace(
          /use_expo_modules!\n/,
          (match) =>
            `${match}\n` +
            `  pod 'AppCheckCore', :modular_headers => true\n` +
            `  pod 'GoogleUtilities', :modular_headers => true\n` +
            `  pod 'RecaptchaInterop', :modular_headers => true\n`
        );
      }

      const marker = '# eMealia: patch fmt/base.h (FMT_USE_CONSTEVAL)';
      if (!contents.includes(marker)) {
        contents = contents.replace(
          /post_install do \|installer\|\n/,
          (match) =>
            `${match}` +
            `    ${marker}\n` +
            `    fmt_header = File.join(__dir__, 'Pods', 'fmt', 'include', 'fmt', 'base.h')\n` +
            `    if File.exist?(fmt_header)\n` +
            `      fmt_src = File.read(fmt_header)\n` +
            `      fmt_marker = '// eMealia: force FMT_USE_CONSTEVAL off'\n` +
            `      unless fmt_src.include?(fmt_marker)\n` +
            `        fmt_src = fmt_src.sub(\n` +
            `          "#if FMT_USE_CONSTEVAL\\n#  define FMT_CONSTEVAL consteval",\n` +
            `          fmt_marker + "\\n#undef FMT_USE_CONSTEVAL\\n#define FMT_USE_CONSTEVAL 0\\n\\n#if FMT_USE_CONSTEVAL\\n#  define FMT_CONSTEVAL consteval"\n` +
            `        )\n` +
            `        File.write(fmt_header, fmt_src)\n` +
            `      end\n` +
            `    end\n\n`
        );
      }

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};
