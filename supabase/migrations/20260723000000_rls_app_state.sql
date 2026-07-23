-- ─── RLS em public.app_state ────────────────────────────────────────────────
-- Objetivo: fechar o vetor de perda de dados. Hoje a tabela app_state está com
-- RLS DESABILITADO e a chave anon (pública no client) dá read/write/DELETE total
-- em tudo — qualquer um com a chave pode zerar as notas/jogos/serviços.
--
-- Depois desta migration:
--   • authenticated (usuário logado no HUB) → acesso total (igual a hoje).
--   • anon (links/formulários públicos, SEM login) → acesso SÓ às chaves públicas
--     necessárias aos fluxos de fornecedor. NÃO pode ler dados financeiros nem
--     apagar NADA.
--   • service_role (Edge Functions, backup com service key) → ignora RLS (bypass).
--
-- NÃO apaga nem altera nenhuma linha. Só passa a filtrar o acesso.
-- Rollback no fim do arquivo (comentado).

-- ── Funções auxiliares que definem o que é "chave pública" ───────────────────
-- Chaves de LISTA que os fluxos públicos leem-modificam-gravam (upsert = insert+update):
-- envios (confirmação de pagamento / status), submissions dos formulários, tabela
-- de preços do fornecedor. Inclui as pilhas ::backup dessas mesmas chaves, pra o
-- backup automático do setState() continuar funcionando nas escritas públicas.
create or replace function public.app_state_anon_rw(k text)
returns boolean language sql immutable as $$
  select
       k in ('nf_submissions','paulistao_nf_submissions','forn_tabelas_preco','envios')
    or k like '%\_envios'
    or k in ('nf_submissions::backup','paulistao_nf_submissions::backup',
             'forn_tabelas_preco::backup','envios::backup')
    or k like '%\_envios::backup'
$$;

-- Chaves que o anon pode LER: as de leitura pura dos formulários/tabela +
-- os arquivos das NFs (download no envio público) + tudo que ele pode gravar
-- (o setState faz um SELECT do ::backup antes de gravar, então precisa ler).
create or replace function public.app_state_anon_read(k text)
returns boolean language sql immutable as $$
  select
       k in ('jogos','fornecedores',
             'paulistao_jogos','paulistao_fornecedores',
             'forn_tabelas_preco','forn_campeonatos','forn_cidades',
             'nf_submissions','paulistao_nf_submissions',
             'envios')
    or k like '%\_envios'
    or k like 'nf\_file\_%'
    or public.app_state_anon_rw(k)
$$;

-- ── Liga o RLS ───────────────────────────────────────────────────────────────
alter table public.app_state enable row level security;

-- Policy permissiva legada "allow_all" (ALL / roles=public / using=true): ficava
-- inofensiva com o RLS desligado, mas ao ligar o RLS ela libera TODO MUNDO (anon
-- incluso) e anula as regras abaixo. Tem que sair. (Descoberta ao aplicar em prod
-- em 2026-07-23 — o anon continuava lendo tudo até dropar isto.)
drop policy if exists "allow_all" on public.app_state;

-- ── Policies (idempotente: dropa antes de recriar) ──────────────────────────
drop policy if exists "app_state auth all"     on public.app_state;
drop policy if exists "app_state anon read"    on public.app_state;
drop policy if exists "app_state anon insert"  on public.app_state;
drop policy if exists "app_state anon update"  on public.app_state;

-- 1) Usuário logado: acesso total (SELECT/INSERT/UPDATE/DELETE) em qualquer chave.
create policy "app_state auth all"
  on public.app_state for all
  to authenticated
  using (true) with check (true);

-- 2) Público: LEITURA só das chaves públicas.
create policy "app_state anon read"
  on public.app_state for select
  to anon
  using (public.app_state_anon_read(key));

-- 3) Público: INSERT nas chaves de lista públicas + upload de arquivos de NF.
create policy "app_state anon insert"
  on public.app_state for insert
  to anon
  with check (public.app_state_anon_rw(key) or key like 'nf\_file\_%');

-- 4) Público: UPDATE só nas chaves de lista públicas.
--    (nf_file_ NÃO entra aqui de propósito: uploads têm id novo = INSERT; assim o
--     anon não consegue sobrescrever um arquivo de NF já existente.)
create policy "app_state anon update"
  on public.app_state for update
  to anon
  using (public.app_state_anon_rw(key))
  with check (public.app_state_anon_rw(key));

-- 5) Sem policy de DELETE pro anon => o público NÃO consegue apagar nenhuma linha.

-- ─── ROLLBACK (rodar isto pra voltar exatamente ao estado de antes) ──────────
-- drop policy if exists "app_state auth all"    on public.app_state;
-- drop policy if exists "app_state anon read"   on public.app_state;
-- drop policy if exists "app_state anon insert" on public.app_state;
-- drop policy if exists "app_state anon update" on public.app_state;
-- alter table public.app_state disable row level security;
-- drop function if exists public.app_state_anon_read(text);
-- drop function if exists public.app_state_anon_rw(text);
