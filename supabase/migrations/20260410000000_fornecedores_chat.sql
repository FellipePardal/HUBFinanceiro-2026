-- ============================================================================
-- Fornecedores / Negociações — tabelas dedicadas para chat + anexos + links
-- ----------------------------------------------------------------------------
-- As cotações em si continuam persistidas em public.app_state (key='cotacoes')
-- seguindo o padrão do projeto. Usamos tabelas dedicadas apenas para:
--   1. chat_mensagens   — histórico de mensagens por cotação/fornecedor
--   2. chat_anexos      — metadados dos arquivos anexados (arquivo em Storage)
--   3. cotacao_links    — tokens de compartilhamento público por negociação
--
-- Bucket de Storage esperado: 'negociacoes' (criar manualmente no painel).
-- ============================================================================

-- ─── CHAT_MENSAGENS ─────────────────────────────────────────────────────────
create table if not exists public.chat_mensagens (
  id          bigserial primary key,
  cotacao_id  text not null,
  fornecedor_id text,
  autor_tipo  text not null check (autor_tipo in ('interno','fornecedor','ia','sistema')),
  autor_nome  text,
  conteudo    text not null,
  metadata    jsonb default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists chat_mensagens_cotacao_idx on public.chat_mensagens (cotacao_id, created_at);
create index if not exists chat_mensagens_fornecedor_idx on public.chat_mensagens (fornecedor_id, created_at);

-- ─── CHAT_ANEXOS ────────────────────────────────────────────────────────────
create table if not exists public.chat_anexos (
  id           bigserial primary key,
  mensagem_id  bigint references public.chat_mensagens(id) on delete cascade,
  cotacao_id   text not null,
  nome_arquivo text not null,
  mime_type    text,
  tamanho      bigint,
  storage_path text not null,
  created_at   timestamptz not null default now()
);

create index if not exists chat_anexos_cotacao_idx on public.chat_anexos (cotacao_id);
create index if not exists chat_anexos_mensagem_idx on public.chat_anexos (mensagem_id);

-- ─── COTACAO_LINKS ──────────────────────────────────────────────────────────
-- Tokens públicos (UUID) para compartilhar uma negociação com o fornecedor
-- externo sem exigir login. Um link pode expirar e pode ser revogado.
create table if not exists public.cotacao_links (
  token        uuid primary key default gen_random_uuid(),
  cotacao_id   text not null,
  fornecedor_id text,
  criado_por   text,
  expira_em    timestamptz,
  revogado     boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists cotacao_links_cotacao_idx on public.cotacao_links (cotacao_id);

-- ─── RLS ────────────────────────────────────────────────────────────────────
-- O projeto usa a chave anon para acesso direto. Mantemos RLS desabilitado
-- nas novas tabelas para ficar consistente com public.app_state. Caso seja
-- necessário endurecer, habilitar policies separadamente.
alter table public.chat_mensagens disable row level security;
alter table public.chat_anexos    disable row level security;
alter table public.cotacao_links  disable row level security;

-- ─── REALTIME ───────────────────────────────────────────────────────────────
-- Habilita replicação para o chat funcionar em tempo real (como app_state).
alter publication supabase_realtime add table public.chat_mensagens;
alter publication supabase_realtime add table public.chat_anexos;
