-- ============================================================================
-- Remoção do Chat/IA — desfaz a migration 20260410000000_fornecedores_chat
-- ----------------------------------------------------------------------------
-- O fluxo de chat com IA intermediadora foi descontinuado em favor de um novo
-- modelo de negociação baseado em tabelas de preço por fornecedor preenchidas
-- via link público (a ser introduzido em migration posterior).
--
-- Itens removidos:
--   1. tabelas chat_mensagens, chat_anexos, cotacao_links
--   2. publicação realtime das tabelas de chat
--   3. Edge Function "chat-ia" (removida do código-fonte; cabe ao operador
--      remover do painel Supabase e revogar o secret ANTHROPIC_API_KEY).
--
-- O bucket de Storage 'negociacoes' não é dropado automaticamente — caso não
-- haja outro uso, removê-lo manualmente pelo painel.
-- ============================================================================

alter publication supabase_realtime drop table if exists public.chat_anexos;
alter publication supabase_realtime drop table if exists public.chat_mensagens;

drop table if exists public.chat_anexos    cascade;
drop table if exists public.chat_mensagens cascade;
drop table if exists public.cotacao_links  cascade;
