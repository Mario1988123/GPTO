-- 026_proyectos_token.sql
-- Capa 12: token publico de acceso a un proyecto. Se incluye en el link que se manda al cliente.
-- La ruta /c/[token] usa service_role server-side para leer los datos (se salta RLS con filtrado por token).

ALTER TABLE public.proyectos
  ADD COLUMN acceso_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid();

CREATE INDEX proyectos_acceso_token_idx ON public.proyectos(acceso_token);

COMMENT ON COLUMN public.proyectos.acceso_token IS
  'Token UUID para compartir el estado del proyecto con el cliente (/c/[token]). No adivinable.';
