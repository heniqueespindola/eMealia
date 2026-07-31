# F13 — Perfil e Configurações + Internacionalização (PT/ES/EN)

Fonte: `thoughts/shared/plans/2026-07-30-perfil-e-configuracoes.md`

## Pré-requisitos
- [ ] SQL da Fase 1 corrido no Supabase: colunas `profiles.idioma` (default `pt-PT`) e `profiles.notificacoes_prefs` (jsonb), bucket de Storage `avatars` + as 4 policies (leitura pública, upload/update/delete próprio)
- [ ] Edge Function `delete-account` deployada (`supabase functions deploy delete-account`)
- [ ] `expo-image-picker` no array `plugins` de `app.json` — build de dev client novo se ainda não tiver sido gerado desde a adição do plugin
- [ ] 2 contas de teste distintas (uma para não interferir com testes de outras features ao eliminar conta)
- [ ] No simulador/dispositivo, saber trocar o idioma do sistema (Definições → Geral → Idioma) para validar o fallback pré-login em PT, ES e EN
- [ ] Acesso à Supabase Storage (Dashboard) para confirmar upload de avatar

## Testes automáticos / de código
- [ ] `cd apps/mobile && npx tsc --noEmit` sem erros
- [ ] `cd apps/mobile && npm run lint` sem warnings novos
- [ ] `grep -rn "\.label" apps/mobile/src apps/mobile/app` — não deve devolver leituras directas de `PLANS`/`FILTROS_DIETETICOS`/etc. de `@emealia/config` (só chamadas a `t(...)`); os únicos resultados aceitáveis são usos locais não relacionados com config (confirmar caso a caso)
- [ ] Inspeccionar `es.ts` e `en.ts` — confirmar que usam `satisfies TranslationDict` (ou equivalente) e que `tsc` falharia se faltasse alguma chave presente em `pt.ts`
- [ ] Invocar `delete-account` sem header `Authorization` via `curl` → esperado `401`:
  ```bash
  curl -i -X POST https://<project>.supabase.co/functions/v1/delete-account
  ```
- [ ] Invocar `delete-account` com um JWT válido de uma conta de teste descartável → esperado `200 {"ok":true}`, e confirmar que o utilizador desaparece de `auth.users`

## Testes manuais — fluxo feliz (edição de perfil)
1. [ ] Abrir Perfil → editar nome → sair do campo (ou "Guardar") → nome actualizado imediatamente no ecrã, sem reiniciar a app
2. [ ] Tocar "Editar foto" → escolher imagem da galeria → avatar actualiza-se de imediato no ecrã (confirmar que não fica com imagem antiga em cache)
3. [ ] Confirmar no Supabase Dashboard → Storage → `avatars/<user_id>/avatar.jpg` que o ficheiro foi criado/substituído
4. [ ] Tocar em cada filtro dietético (dos 9 disponíveis, não só o subconjunto do onboarding) → toggle reflecte-se imediatamente; sair do ecrã e voltar → estado persiste
5. [ ] Trocar idioma para Español → todo o texto do ecrã de Perfil muda imediatamente, sem reiniciar a app
6. [ ] Trocar idioma para English → idem
7. [ ] Voltar para Português → idem
8. [ ] Desligar "Alertas de despensa" mantendo "Sugestões de jantar" ligado → sair do ecrã Perfil e voltar → estado de cada toggle mantém-se independente (não reseta ambos)

## Testes manuais — exportação de dados (GDPR Art. 20)
- [ ] Tocar "Exportar os meus dados" → abre o share sheet nativo com um ficheiro `.json`
- [ ] Abrir o ficheiro exportado e confirmar que contém `profile`, `pantry_items`, `saved_recipes`, `shopping_list`, `meal_plan`, `followed_creators` da conta de teste (comparar com o que existe no Supabase)
- [ ] Conta com poucos ou nenhuns dados nalguma tabela (ex: sem `meal_plan`) → exportação não falha, campo correspondente vem vazio/`[]`
- [ ] Em modo avião → tentar exportar → mensagem de erro clara (`profile.erroExportar`), sem crash

## Testes manuais — eliminação de conta (GDPR Art. 17)
- [ ] Tocar "Eliminar conta" → aparece `Alert` de confirmação com o texto de aviso de irreversibilidade
- [ ] Tocar "Cancelar" no alerta → nada acontece, conta permanece intacta
- [ ] Tocar "Eliminar conta" no alerta (usar conta de teste descartável) → app faz logout automático e navega para `/(auth)/login`
- [ ] Confirmar no Supabase Dashboard → Authentication que o utilizador foi removido de `auth.users`
- [ ] Confirmar que as linhas relacionadas em `profiles`/`pantry_items`/`saved_recipes`/etc. foram removidas (via `ON DELETE CASCADE` do schema, ou verificar manualmente se não houver cascade)
- [ ] Tentar fazer login novamente com as credenciais da conta eliminada → falha com erro de credenciais inválidas

## Testes manuais — logout
- [ ] Tocar "Terminar sessão" → `Alert` de confirmação
- [ ] "Cancelar" → permanece na app, sessão activa
- [ ] Confirmar → navega para `/(auth)/login`, reabrir a app não repõe a sessão anterior

## Testes manuais — i18n global (toda a app)
> A Fase 7 do plano traduz ~35 ficheiros. Percorrer cada tab com o idioma trocado em `LanguageSection` e confirmar que nenhum ecrã fica com texto misto (ex: título em espanhol mas botão em português).

- [ ] Com idioma = Español: navegar por Início, Pesquisar, Despensa, Planeador, Favoritos, Macros, Perfil, Criadores → todo o texto visível em espanhol, incluindo mensagens de erro, alertas de confirmação, placeholders de input e labels de filtros/planos/coleções (`config.*`)
- [ ] Repetir com idioma = English
- [ ] Repetir com idioma = Português (idioma por omissão) como controlo — confirmar que nada ficou acidentalmente em inglês/espanhol residual
- [ ] Confirmar que badges de fonte (YouTube/TikTok/Instagram/eMealia/Spoonacular) **não** são traduzidos em nenhum idioma (decisão explícita do plano)
- [ ] Datas formatadas (ex: "Semana de..." no planeador, data de renovação do plano, data de expiração na despensa) mudam de formato/locale consoante o idioma activo (`formatarData`)
- [ ] Pré-login (ecrãs de login/registo): mudar o idioma do **sistema operativo** (não da app, já que ainda não há `profile`) para Español → ecrãs de login/registo aparecem em espanhol
- [ ] Repetir o teste anterior com idioma do sistema = English
- [ ] Repetir com idioma do sistema num idioma não suportado (ex: Français) → cai no fallback definido (`pt`, conforme `i18n.defaultLocale`)
- [ ] Pluralização: confirmar que mensagens como "%{count} itens adicionados à lista" usam sempre a forma plural mesmo com `count = 1` — limitação conhecida e aceite, não é bug

## Verificação de dados (Supabase)
```sql
-- Perfil após alterações no ecrã
select id, nome, idioma, notificacoes_prefs, filtros_dieteticos, avatar_url
from profiles
where id = '<id de teste>';

-- Confirmar remoção total após eliminação de conta
select * from profiles where id = '<id de teste eliminada>'; -- esperado: 0 linhas
select * from auth.users where id = '<id de teste eliminada>'; -- esperado: 0 linhas
```

## Regressão a vigiar
- `apps/mobile/app/(tabs)/profile.tsx` foi completamente reescrito — retestar F08 (Planos e pagamentos: secção de plano/restaurar compras) e F10 (Macros: link "Ver objectivos e progresso"), ambos agora dependentes das novas secções de Perfil.
- Toda a app foi tocada pela tradução (Fase 7) — depois de validar i18n, correr rapidamente os fluxos felizes de F01-F12 em português para confirmar que nenhuma string ficou em falta (aparecendo como chave crua tipo `profile.titulo` em vez do texto traduzido é o sintoma mais comum de regressão).
- `constants/planner.ts` (`formatarIntervaloSemana`) e outros formatadores de data mudaram de assinatura — confirmar que o Planeador (F09) e o Histórico de Macros (F10) continuam a mostrar datas correctas em todos os idiomas.
