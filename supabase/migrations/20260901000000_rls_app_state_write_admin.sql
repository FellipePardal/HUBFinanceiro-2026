-- Etapa 4 do plano de segurança: escrita no app_state só para admin.
--
-- Antes, qualquer usuário logado (visualizador, fornecedor, pendente) tinha
-- ALL no app_state — o "só leitura" do visualizador era só de fachada no
-- front. Agora:
--   • SELECT: qualquer logado (o visualizador precisa ler tudo que enxerga).
--   • INSERT/UPDATE: admin, OU as mesmas chaves que o anon já pode escrever
--     (filas de submissão dos formulários públicos + nf_file_ no insert) —
--     um fornecedor LOGADO preenchendo o formulário público não pode ter
--     menos acesso do que um anônimo.
--   • DELETE: só admin.
-- As RPCs append/remove são SECURITY DEFINER com allowlist própria e seguem
-- funcionando para os formulários.

begin;

drop policy if exists "app_state auth all" on public.app_state;

create policy "app_state auth read" on public.app_state
  for select to authenticated
  using (true);

create policy "app_state auth insert" on public.app_state
  for insert to authenticated
  with check (
    public.get_my_role() = 'admin'
    or public.app_state_anon_rw(key)
    or key like 'nf\_file\_%'
  );

create policy "app_state auth update" on public.app_state
  for update to authenticated
  using (
    public.get_my_role() = 'admin'
    or public.app_state_anon_rw(key)
  )
  with check (
    public.get_my_role() = 'admin'
    or public.app_state_anon_rw(key)
  );

create policy "app_state auth delete" on public.app_state
  for delete to authenticated
  using (public.get_my_role() = 'admin');

commit;
