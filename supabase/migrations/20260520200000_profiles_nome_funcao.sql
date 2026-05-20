-- Adiciona coluna funcao e atualiza trigger para ler nome/funcao do metadata

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS funcao text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, nome, funcao, entidade)
  VALUES (
    new.id,
    new.email,
    'pendente',
    new.raw_user_meta_data->>'nome',
    new.raw_user_meta_data->>'funcao',
    new.raw_user_meta_data->>'entidade'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;
