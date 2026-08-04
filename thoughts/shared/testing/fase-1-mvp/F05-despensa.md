# F05 — Despensa / inventário de ingredientes

Fonte: `thoughts/shared/plans/2026-07-24-despensa.md`

## Pré-requisitos
- [x] Coluna `pantry_items.categoria` aplicada no schema remoto
- [x] Testar em dispositivo físico ou simulador com câmara simulada para o scanner de barcode (negar e conceder permissão)
- [x] Uma conta de teste no plano `free` com 20 itens já na despensa (para testar o limite) e outra sem esse limite

## Testes automáticos / de código
- [x] `npx tsc --noEmit` sem erros
- [x] `expo lint` sem warnings
- [x] Script `schema.sql` corrido 2x seguidas sem erro (idempotência do `ALTER TABLE ... ADD COLUMN IF NOT EXISTS categoria`)

## Testes manuais — CRUD básico
1. [x] Adicionar item por texto (com autocomplete) → aparece na secção de categoria correcta (frescos/secos/congelados/outros)
2. [x] Editar quantidade/validade de um item → persiste após pull-to-refresh
3. [x] Swipe para a esquerda num item → revela botão eliminar; toque longo → também elimina (com `Alert` de confirmação)
4. [x] Pull-to-refresh recarrega a lista a partir do Supabase

## Testes manuais — scanner de código de barras
- [x] Negar permissão de câmara → mostra ecrã de pedido de permissão, não crasha
- [x] Ler um código de barras real (produto português) → nome pré-preenchido via Open Food Facts
- [x] Ler um código de barras inexistente na OFF → não crasha, mostra "Produto não encontrado. Podes continuar a adicionar manualmente." e mantém o formulário aberto

## Testes manuais — alertas e limites
- [x] Item com `expira_em` a 3 dias ou menos → mostra badge "Expira em breve"; item já expirado → também mostra o badge
- [x] Plano `free` com 20 itens → botão "+ Adicionar" desactivado, aviso de upgrade visível
- [x] Plano `premium_monthly`/`premium_annual` → sem limite, "+ Adicionar" sempre activo

## Testes manuais — integração "cozinhar agora"
- [x] Com pelo menos 1 item na despensa, tocar "Cozinhar agora" → abre a Pesquisa (F04) com os ingredientes da despensa já como chips e "Usar despensa" activo
- [x] O toggle manual "Usar despensa" em `search.tsx` continua a funcionar exactamente como antes (teste de regressão explícito)

## Verificação de dados (Supabase)
```sql
select nome, quantidade, categoria, expira_em, barcode
from pantry_items
where user_id = '<id de teste>'
order by categoria, expira_em;
```

## Regressão a vigiar
- `_layout.tsx` ganha `GestureHandlerRootView` nesta feature (necessário para `Swipeable`) — confirmar que nenhum outro ecrã (feed, auth) sofre alteração de comportamento de gestos após esta mudança.
- F07 (Lista de compras) adiciona um botão "🛒 Lista de compras" ao header deste ecrã — confirmar layout depois de F07.
- F08 (Planos) substitui o `<Card>` de aviso de limite por `PremiumLock` — retestar a mensagem/CTA de upgrade depois de F08.
