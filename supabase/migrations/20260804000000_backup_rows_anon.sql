-- ─── Backups por linha: RLS do anon acompanha o formato novo ─────────────────
-- Desde 2026-08 o pushBackup grava uma linha por versão (`key::backup::v0..v4`
-- e `key::backup::d0..d6`) em vez da pilha única `key::backup` — a pilha exigia
-- ler e regravar até 15 cópias completas a cada edição e foi o maior consumidor
-- do Disk IO que derrubou o projeto em 2026-08-03/04.
--
-- Esta migration só atualiza a função que define onde o anon tem leitura/escrita:
-- em vez de listar sufixos `::backup` exatos, deriva a chave-base (tudo antes de
-- `::backup`) e aplica a mesma lista de chaves públicas de sempre. Nada muda para
-- usuários autenticados (policy "app_state auth all" cobre tudo).

create or replace function public.app_state_anon_rw(k text)
returns boolean language sql immutable as $$
  select regexp_replace(k, '::backup.*$', '') in
           ('nf_submissions','paulistao_nf_submissions','forn_tabelas_preco','envios')
      or regexp_replace(k, '::backup.*$', '') like '%\_envios'
$$;

-- app_state_anon_read não muda: ela já inclui app_state_anon_rw(k) no OR,
-- então herda os novos sufixos automaticamente.

-- ─── ROLLBACK (voltar ao formato de pilha única) ─────────────────────────────
-- create or replace function public.app_state_anon_rw(k text)
-- returns boolean language sql immutable as $$
--   select
--        k in ('nf_submissions','paulistao_nf_submissions','forn_tabelas_preco','envios')
--     or k like '%\_envios'
--     or k in ('nf_submissions::backup','paulistao_nf_submissions::backup',
--              'forn_tabelas_preco::backup','envios::backup')
--     or k like '%\_envios::backup'
-- $$;
