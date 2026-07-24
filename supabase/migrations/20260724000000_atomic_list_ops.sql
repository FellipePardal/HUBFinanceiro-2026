-- ─── Operações atômicas nas listas do app_state ─────────────────────────────
-- Problema: as listas (nf_submissions etc.) eram gravadas com ler-modificar-
-- gravar no client. Dois fornecedores enviando NF ao mesmo tempo liam a mesma
-- versão e o segundo UPDATE apagava a submissão do primeiro (last-write-wins).
-- O mesmo valia pra duas pessoas aprovando itens diferentes em paralelo.
--
-- Solução: append e remove viram UPDATE atômico de uma linha no Postgres —
-- o lock de linha serializa escritas concorrentes e ninguém sobrescreve
-- ninguém. O client (lib/supabase.js: appendState/removeFromStateList) usa
-- estas funções via RPC e cai no caminho antigo se elas ainda não existirem.

-- Append de 1 item (ou array de itens) numa lista do app_state.
-- Dedupe por clientRef: se já existe um elemento com o mesmo clientRef
-- (reenvio do formulário após falha/timeout), não grava de novo.
create or replace function public.append_app_state_list(k text, entry jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  arr jsonb := case when jsonb_typeof(entry) = 'array' then entry else jsonb_build_array(entry) end;
  ref text  := arr->0->>'clientRef';
begin
  -- Allowlist (security definer ignora RLS, então o guarda é aqui):
  --   • filas de submissão: público (formulários anon) e logado
  --   • históricos: só usuário logado
  if k in ('nf_submissions','paulistao_nf_submissions') then
    null;
  elsif k in ('nf_historico','paulistao_nf_historico') then
    if auth.role() is distinct from 'authenticated' then
      raise exception 'append em "%" exige login', k;
    end if;
  else
    raise exception 'append não permitido para a chave "%"', k;
  end if;

  insert into public.app_state (key, value, updated_at)
  values (k, '[]'::jsonb, now())
  on conflict (key) do nothing;

  update public.app_state
     set value = coalesce(value, '[]'::jsonb) || arr,
         updated_at = now()
   where key = k
     and (ref is null or not exists (
           select 1 from jsonb_array_elements(coalesce(value, '[]'::jsonb)) e
           where e->>'clientRef' = ref));
end $$;

-- Remove da lista o elemento cujo campo "id" (como texto) bate com item_id.
-- Retorna true se algo foi removido — false significa que o item já tinha
-- saído (outra aba/pessoa decidiu antes), e quem chamou não deve repetir os
-- efeitos colaterais (ex.: criar a nota de novo).
create or replace function public.remove_app_state_list(k text, item_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  if auth.role() is distinct from 'authenticated' then
    raise exception 'remover de "%" exige login', k;
  end if;
  if k not in ('nf_submissions','paulistao_nf_submissions',
               'nf_historico','paulistao_nf_historico') then
    raise exception 'remove não permitido para a chave "%"', k;
  end if;

  update public.app_state
     set value = coalesce((
           select jsonb_agg(e order by ord)
           from jsonb_array_elements(value) with ordinality t(e, ord)
           where e->>'id' is distinct from item_id
         ), '[]'::jsonb),
         updated_at = now()
   where key = k
     and exists (
           select 1 from jsonb_array_elements(coalesce(value, '[]'::jsonb)) e
           where e->>'id' = item_id);
  get diagnostics n = row_count;
  return n > 0;
end $$;

revoke all on function public.append_app_state_list(text, jsonb) from public;
revoke all on function public.remove_app_state_list(text, text) from public;
grant execute on function public.append_app_state_list(text, jsonb) to anon, authenticated;
grant execute on function public.remove_app_state_list(text, text) to authenticated;

-- ─── ROLLBACK ────────────────────────────────────────────────────────────────
-- drop function if exists public.append_app_state_list(text, jsonb);
-- drop function if exists public.remove_app_state_list(text, text);
