# F11 — Criadores em destaque

Fonte: `thoughts/shared/plans/2026-07-30-criadores-em-destaque.md`

## Pré-requisitos
- [x] ⚠️ **Dependência externa**: `video_cache.creator_channel_id` só é preenchido por um processo fora deste repositório. Sem isso, o perfil do criador e a tab "A seguir" ficam sempre vazios e a notificação nunca dispara — confirmar com quem gere esse processo antes de considerar esta feature testável ponta-a-ponta
- [x] Tabelas `creators`/`followed_creators`, coluna `video_cache.creator_channel_id`, `profiles.expo_push_token` aplicadas
- [x] Secrets `project_url`/`service_role_key` criados no Vault (`select name from vault.secrets;`)
- [x] Testar em dispositivo físico (push notifications não funcionam em simulador — `Device.isDevice`)

## Testes automáticos / de código
- [x] `npm run typecheck` sem erros
- [x] `tsc --noEmit` + `expo lint` sem warnings em `apps/mobile`
- [x] Todos os componentes novos sob 150 linhas
- [x] `select * from creators limit 1;`, `select * from followed_creators limit 1;` sem erro
- [x] `\d video_cache` mostra `creator_channel_id`; `\d profiles` mostra `expo_push_token`

## Testes manuais — curadoria (backend)
- [ ] Inserir manualmente uma linha em `creators` com `channel_id` real, invocar `sync-creator` via `supabase functions invoke sync-creator --data '{"channel_id":"UC..."}'` → `nome`/`avatar_url`/`numero_videos` ficam preenchidos

## Testes manuais — ecrã de criadores
1. [x] Abrir `/creators` a partir do ícone no cabeçalho da homepage → lista de criadores em destaque com avatar/nome/especialidade/nº vídeos
2. [x] Tocar "Seguir" num criador → botão muda para "A seguir"; pedido de permissão de notificações aparece na primeira vez
3. [x] Tocar num criador → abre o perfil com vídeos recentes desse canal
4. [x] Deixar de seguir no perfil → reflecte-se na lista de destaque ao voltar atrás

## Testes manuais — tab "A seguir" na homepage
- [x] Homepage → Pill "A seguir" sem nenhum criador seguido → estado vazio com CTA para `/creators`
- [x] Homepage → Pill "A seguir" com ≥1 criador seguido → feed mostra só vídeos desses `creator_channel_id`

## Testes manuais — notificação de novo vídeo
- [x] ⚠️ Requer processo externo funcional ou inserção manual de teste: inserir linha em `video_cache` com `creator_channel_id` preenchido + utilizador de teste em `followed_creators` com `expo_push_token` válido → confirmar recepção da notificação no dispositivo

## Verificação de dados (Supabase)
```sql
select c.nome, c.especialidade, fc.followed_at
from followed_creators fc
join creators c on c.id = fc.creator_id
where fc.user_id = '<id de teste>';
```

## Regressão a vigiar
- `useFeed.ts` (F03) é estendido com um terceiro parâmetro (`creatorChannelIds`) — retestar o conjunto completo de F03 depois desta feature, com especial atenção ao fallback `MOCK_VIDEOS` (não deve activar-se na tab "A seguir").
- Confirmar que o ícone novo no cabeçalho da homepage não quebra o layout existente do título/pills de filtro.
