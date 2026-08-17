-- ─── Append permitido para eventos de orçamento ─────────────────────────────
-- O módulo Orçamentos (Hub) grava o log de eventos em orc_<id>_eventos via
-- append_app_state_list. A allowlist da função barrava qualquer chave fora das
-- filas de NF, então a criação do orçamento falhava com "append não permitido".
-- Libera o padrão orc_*_eventos exigindo login (o módulo é só para logados).

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
  --   • históricos e eventos de orçamento: só usuário logado
  if k in ('nf_submissions','paulistao_nf_submissions') then
    null;
  elsif k in ('nf_historico','paulistao_nf_historico')
        or k like 'orc\_%\_eventos' then
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
