-- ─── Checagem de NF duplicada para os formulários públicos ───────────────────
-- Incidente 2026-08: a NF 16 do João Marcos entrou duas vezes (grafias
-- diferentes do fornecedor) e foi paga em dobro nos envios 19 e 20 do
-- Brasileirão. O formulário público precisa checar duplicata ANTES de gravar,
-- mas o RLS (20260723000000) esconde notas/notas_mensais do anon de propósito.
-- Solução: um RPC security definer que compara e devolve só {dup, motivo, onde}
-- — nenhum dado financeiro vaza pro público.
--
-- A comparação normaliza acento/caixa/pontuação (igual ao normTexto de
-- src/lib/dedupeNF.js) e também aceita um hash sha-256 do arquivo (fileHash
-- gravado nas notas; ver saveNFFile em src/lib/supabase.js) pra pegar o mesmo
-- PDF reenviado com outro número.
--
-- Só pendentes (submissions) e aprovadas (notas/notas_mensais) entram na
-- checagem. Histórico de REJEITADAS fica de fora de propósito: fornecedor
-- reenviar uma NF corrigida com o mesmo número é fluxo legítimo.

create extension if not exists unaccent with schema extensions;

create or replace function public.nf_norm(t text)
returns text
language sql stable
set search_path = public, extensions
as $$
  select trim(regexp_replace(lower(extensions.unaccent(coalesce(t, ''))), '[^a-z0-9]+', ' ', 'g'))
$$;

create or replace function public.nf_duplicada(
  p_escopo text,
  p_fornecedor text,
  p_numero text,
  p_file_hash text default null
)
returns jsonb
language plpgsql stable security definer
set search_path = public, extensions
as $$
declare
  ks text[];
  k text;
  chave text;
  hit jsonb;
begin
  ks := case p_escopo
    when 'brasileirao' then array['nf_submissions', 'notas', 'notas_mensais']
    when 'paulistao'   then array['paulistao_nf_submissions', 'paulistao_notas', 'paulistao_notas_mensais']
    else null
  end;
  if ks is null then
    return jsonb_build_object('dup', false);
  end if;

  chave := case when nf_norm(p_numero) = '' then null
                else nf_norm(p_fornecedor) || '||' || nf_norm(p_numero) end;
  if chave is null and p_file_hash is null then
    return jsonb_build_object('dup', false);
  end if;

  foreach k in array ks loop
    select jsonb_build_object(
             'dup', true,
             'motivo', case when p_file_hash is not null and el->>'fileHash' = p_file_hash
                            then 'arquivo' else 'numero' end,
             'onde', k)
      into hit
      from app_state s, jsonb_array_elements(s.value) el
     where s.key = k
       and jsonb_typeof(s.value) = 'array'
       and (
         (chave is not null and nf_norm(el->>'fornecedor') || '||' || nf_norm(el->>'numeroNF') = chave)
         or (p_file_hash is not null and el->>'fileHash' = p_file_hash)
       )
     limit 1;
    if hit is not null then
      return hit;
    end if;
  end loop;

  return jsonb_build_object('dup', false);
end
$$;

grant execute on function public.nf_duplicada(text, text, text, text) to anon, authenticated;
