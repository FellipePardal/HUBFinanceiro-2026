-- ============================================================================
-- Paulistão Feminino 2026 — chaves de estado namespaced em app_state
-- ----------------------------------------------------------------------------
-- O HUB Financeiro guarda todo o estado por campeonato dentro da tabela
-- pública `app_state` (key TEXT PK, value JSONB). O Brasileirão usa as chaves
-- "jogos", "servicos", "notas" etc.; o Paulistão Feminino usa as mesmas chaves
-- com o prefixo `paulistao_` para isolamento total.
--
-- Esta migration NÃO altera o schema (a tabela já aceita qualquer chave). Ela
-- apenas:
--   1. Documenta as novas chaves utilizadas pelo módulo Paulistão.
--   2. Faz seed inicial dos containers vazios para garantir que a primeira
--      leitura no front-end já receba os defaults persistidos (evita race com
--      múltiplos clientes gravando defaults simultaneamente).
--
-- Idempotente: usa `on conflict do nothing` — re-executar não sobrescreve dados
-- já criados pelo operador.
-- ============================================================================

insert into public.app_state (key, value, updated_at) values
  ('paulistao_jogos',             '[]'::jsonb, now()),
  ('paulistao_servicos',          '[]'::jsonb, now()),
  ('paulistao_notas',             '[]'::jsonb, now()),
  ('paulistao_notas_mensais',     '[]'::jsonb, now()),
  ('paulistao_envios',            '[]'::jsonb, now()),
  ('paulistao_fornecedores',      '[]'::jsonb, now()),
  ('paulistao_cotacoes',          '[]'::jsonb, now()),
  ('paulistao_livemode',          '[]'::jsonb, now()),
  ('paulistao_notas_livemode',    '[]'::jsonb, now()),
  ('paulistao_logistica',         '[]'::jsonb, now()),
  ('paulistao_eventos_log',       '[]'::jsonb, now()),
  ('paulistao_fornecedores_jogo', '{}'::jsonb, now())
on conflict (key) do nothing;
