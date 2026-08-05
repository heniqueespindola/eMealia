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
//    só a este pod específico (e às suas próprias dependências).
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
//
// 3) Gerar o dSYM da Hermes durante o archive
//    O hermes-engine (Pods/hermes-engine/.../hermes.xcframework) não traz
//    nenhum dSYM pré-compilado. A Apple exige um dSYM com o mesmo UUID do
//    binário embutido para aceitar o upload — "The archive did not include
//    a dSYM for the hermes.framework". A única forma fiável de garantir que
//    o UUID bate certo é gerar o dSYM a partir do binário REAL já embutido
//    na app (via dsymutil), não tentar reaproveitar um dSYM pré-existente.
//    Isto é feito com um novo Build Phase no target principal (eMealia),
//    adicionado aqui via o gem xcodeproj porque o projeto .xcodeproj é
//    regenerado a cada `expo prebuild` — editar o Xcode diretamente perdia-se.
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withPodfileFixes(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf-8');

      // --- 1) modular_headers para AppCheckCore + dependências ---
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

      // --- 2) patch fmt/base.h (FMT_USE_CONSTEVAL) ---
      const fmtMarker = '# eMealia: patch fmt/base.h (FMT_USE_CONSTEVAL)';
      if (!contents.includes(fmtMarker)) {
        contents = contents.replace(
          /post_install do \|installer\|\n/,
          (match) =>
            `${match}` +
            `    ${fmtMarker}\n` +
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

      // --- 3) gerar dSYM da Hermes durante o archive ---
      // Usa post_integrate (não post_install!): o CocoaPods só grava a sua
      // própria cópia do eMealia.xcodeproj DEPOIS do post_install correr, o
      // que sobrescrevia silenciosamente o Build Phase que tentávamos
      // adicionar ali. post_integrate corre a seguir a essa gravação.
      const hermesMarker = '# eMealia: gerar dSYM da Hermes durante o archive';
      if (!contents.includes(hermesMarker)) {
        contents +=
          `\n${hermesMarker}\n` +
          `post_integrate do |installer|\n` +
          `  require 'xcodeproj'\n` +
          `  app_project_path = File.join(__dir__, 'eMealia.xcodeproj')\n` +
          `  app_project = Xcodeproj::Project.open(app_project_path)\n` +
          `  main_target = app_project.targets.find { |t| t.name == 'eMealia' }\n` +
          `  if main_target\n` +
          `    hermes_phase_name = 'eMealia: Generate Hermes dSYM'\n` +
          `    already_added = main_target.build_phases.any? { |bp| bp.respond_to?(:name) && bp.name == hermes_phase_name }\n` +
          `    unless already_added\n` +
          `      hermes_phase = main_target.new_shell_script_build_phase(hermes_phase_name)\n` +
          `      hermes_phase.shell_script = [\n` +
          `        'HERMES_FRAMEWORK="\${CODESIGNING_FOLDER_PATH}/Frameworks/hermes.framework/hermes"',\n` +
          `        'if [ -f "$HERMES_FRAMEWORK" ] && [ -n "$DWARF_DSYM_FOLDER_PATH" ]; then',\n` +
          `        '  mkdir -p "$DWARF_DSYM_FOLDER_PATH"',\n` +
          `        '  xcrun dsymutil "$HERMES_FRAMEWORK" -o "$DWARF_DSYM_FOLDER_PATH/hermes.framework.dSYM"',\n` +
          `        'fi',\n` +
          `      ].join("\\n")\n` +
          `      app_project.save\n` +
          `    end\n` +
          `  end\n` +
          `end\n`;
      }

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};
