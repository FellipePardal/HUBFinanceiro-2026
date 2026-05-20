-- Garante role pendente como default e adiciona coluna entidade

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin','visualizador','fornecedor','pendente'));
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'pendente';

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS entidade text;

-- Trigger lê entidade do metadata do signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, entidade)
  VALUES (
    new.id,
    new.email,
    'pendente',
    new.raw_user_meta_data->>'entidade'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;
