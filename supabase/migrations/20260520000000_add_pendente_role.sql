-- Adiciona role 'pendente' para novos cadastros aguardarem aprovação do admin

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin','visualizador','fornecedor','pendente'));

ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'pendente';

-- Atualiza trigger para criar novos usuários com role 'pendente'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'pendente')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;
