# RLS na tabela `app_state` — como aplicar com segurança

Fecha o vetor do apagão: hoje a tabela `app_state` está sem RLS e a chave anon
(pública) permite ler/escrever/**apagar** todos os dados financeiros. Depois desta
mudança, o público (links/formulários sem login) só acessa as chaves necessárias
e **não consegue apagar nada**; o resto é só para usuários logados.

> **Não apaga nem altera nenhuma linha.** Só passa a filtrar o acesso. É 100%
> reversível (rollback no fim). Antes de aplicar, garanta que você tem o backup
> de hoje (`node scripts/backup.mjs --full`).

## O que o anon (sem login) passa a poder fazer

| Ação | Chaves liberadas |
|------|------------------|
| Ler | `jogos`, `fornecedores`, `paulistao_jogos`, `paulistao_fornecedores`, `forn_tabelas_preco`, `forn_campeonatos`, `forn_cidades`, `nf_submissions`, `paulistao_nf_submissions`, `envios`, `*_envios`, `nf_file_*` |
| Gravar (upsert) | `nf_submissions`, `paulistao_nf_submissions`, `forn_tabelas_preco`, `envios`, `*_envios` (+ seus `::backup`) |
| Inserir | `nf_file_*` (upload dos formulários) |
| Apagar | **nada** |

Tudo o mais (`notas`, `notas_mensais`, `servicos`, `cotacoes`, `logistica`,
`livemode`, `notas_livemode`, `notas_liveu`, `nf_historico*`, e todas as variantes
por campeonato) fica **só para logados**.

## Passo a passo

1. **Backup** (se ainda não fez hoje):
   ```
   node scripts/backup.mjs --full
   ```
2. **Baseline** — rode a verificação ANTES (deve mostrar as chaves financeiras como VISÍVEL, ou seja RLS off):
   ```
   node scripts/verificar_rls.mjs
   ```
3. **Aplicar a migration** — escolha um horário de baixo uso. Duas formas:
   - **Supabase Dashboard** → SQL Editor → cole o conteúdo de
     `supabase/migrations/20260723000000_rls_app_state.sql` → Run.
   - **ou** via CLI: `supabase db push` (se o projeto estiver linkado).
4. **Verificar** — rode de novo; agora as chaves financeiras devem ficar `invisível`
   e as públicas continuar `visível`:
   ```
   node scripts/verificar_rls.mjs --write
   ```
   Esperado: ✅ tudo conforme o esperado (inclusive INSERT/DELETE de chave protegida = negado).
5. **Smoke test manual** (5 min):
   - [ ] Logar no HUB e abrir Brasileirão → notas, serviços, envios carregam normal.
   - [ ] Editar/salvar algo (ex: uma nota) → persiste.
   - [ ] Abrir um link público de **envio** (`#envio/...`) numa aba anônima → carrega, baixa NF, confirma pagamento.
   - [ ] Abrir `#formulario` numa aba anônima → lista jogos/fornecedores, envia uma NF de teste com anexo.
   - [ ] Abrir `#tabela/<token>` numa aba anônima → carrega e salva a tabela de preços.

Se tudo passou, faça o merge do branch `seguranca/rls-app-state` na `main`.

## Rollback (volta exatamente ao estado anterior, na hora)

Rode no SQL Editor:
```sql
drop policy if exists "app_state auth all"    on public.app_state;
drop policy if exists "app_state anon read"   on public.app_state;
drop policy if exists "app_state anon insert" on public.app_state;
drop policy if exists "app_state anon update" on public.app_state;
alter table public.app_state disable row level security;
drop function if exists public.app_state_anon_read(text);
drop function if exists public.app_state_anon_rw(text);
```
Nenhum dado é perdido — RLS só liga/desliga o filtro.

## Limitações conhecidas (para depois)

- **Todos os usuários logados têm acesso total no banco.** O controle por papel
  (visualizador vs admin) hoje é só na interface. Restringir por papel no próprio
  banco é um passo futuro.
- **`envios` e `forn_tabelas_preco` continuam graváveis pelo anon** (os fluxos
  públicos precisam). Um atacante com a chave ainda poderia bagunçar essas duas
  chaves específicas — mas não as notas/finanças, e não consegue apagar. Blindar
  isso exigiria mover essas escritas para uma Edge Function (passo futuro).
- Depois que o RLS estiver estável, **rotacionar a chave anon** e criar o secret
  `SUPABASE_SERVICE_KEY` para o backup passar a usar service_role.
