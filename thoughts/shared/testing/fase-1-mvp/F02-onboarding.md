# F02 — Onboarding (3 ecrãs)

Fonte: `thoughts/shared/plans/2026-07-23-onboarding.md`

## Pré-requisitos
- [x] F01 (Autenticação) a funcionar — onboarding só é alcançável via registo bem-sucedido
- [x] `profiles.frequencia_cozinha` e `profiles.onboarding_completo` existem no schema remoto (correr o `ALTER TABLE` do plano se ainda não foi aplicado)
- [x] Conta de teste nova (sem onboarding concluído) para o fluxo feliz; conta com onboarding já concluído para testar o guard

## Testes automáticos / de código
- [x] `npx tsc --noEmit` sem erros em `onboardingStore.ts`, `profileStore.ts`, `useProfile.ts`, `Pill.tsx`, `StepIndicator.tsx`
- [x] SQL `ALTER TABLE profiles ADD COLUMN ...` corrido 2x seguidas no SQL Editor sem erro (idempotência)

## Testes manuais — fluxo feliz
1. [x] Registar conta nova → cai automaticamente em `/onboarding/step1`
2. [x] **Passo 1**: seleccionar 2+ preferências dietéticas (ex: vegan, airfryer) → indicador mostra "1/3" → tocar "Próximo"
3. [x] **Passo 2**: seleccionar 3+ ingredientes comuns (botão "Próximo" deve estar desactivado com <3 seleccionados, activo com 3+) → indicador "2/3" → tocar "Próximo"
4. [x] **Passo 3**: seleccionar filtros favoritos (opcional) + seleccionar 1 frequência de cozinha (obrigatório, selecção única) → indicador "3/3" → tocar "Concluir"
5. [x] Confirma navegação para `/(tabs)` (homepage)
6. [x] Fechar e reabrir a app → não volta a mostrar onboarding, vai directo para `/(tabs)`

## Testes manuais — navegação entre passos
- [x] No Passo 2, voltar atrás (gesto/botão) para o Passo 1 → as preferências seleccionadas anteriormente continuam marcadas
- [x] Repetir para Passo 3 → Passo 2 → ingredientes seleccionados preservados

## Testes manuais — casos de erro e limites
- [x] Passo 2: com 0, 1 ou 2 ingredientes seleccionados, botão "Próximo" permanece desactivado
- [x] Passo 3: sem seleccionar frequência de cozinha, botão "Concluir" permanece desactivado
- [x] Passo 3: falha de rede a meio do "Concluir" (modo avião) → mensagem de erro visível, sem crash, sem navegação para `/(tabs)`

## Testes manuais — guard de navegação (root layout)
- [x] Conta com `onboarding_completo = false`: abrir a app vai directo para `/onboarding/step1`, mesmo tentando navegar manualmente para `/(tabs)`
- [x] Conta com `onboarding_completo = true`: abrir a app vai directo para `/(tabs)`; navegar manualmente para `/onboarding/step1` ou `/(auth)/login` redirecciona de volta para `/(tabs)`
- [x] Sem flash visível do ecrã errado antes do redirect (splash screen mantém-se até auth+perfil resolvidos)

## Verificação de dados (Supabase)
```sql
select filtros_dieteticos, frequencia_cozinha, onboarding_completo
from profiles where email = '<email de teste>';
-- Esperado: filtros_dieteticos = união dos passos 1+3, frequencia_cozinha preenchido, onboarding_completo = true

select nome from pantry_items where user_id = (select id from profiles where email = '<email de teste>');
-- Esperado: uma linha por ingrediente seleccionado no Passo 2
```

## Regressão a vigiar
- O guard combinado (sessão + onboarding) em `_layout.tsx` afecta F01; testar os dois fluxos (auth e onboarding) juntos após qualquer alteração ao layout raiz.
- `Pill.tsx` é reutilizado por praticamente todas as features seguintes (F03 filtros, F04 filtros, F05 categorias, F06 coleções, etc.) — uma regressão visual/funcional aqui propaga-se.
