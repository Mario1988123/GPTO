-- 003_usuarios.sql
-- Perfil 1:1 con auth.users. Creación manual (no auto-registro).
-- Roles MVP: admin, operario, cliente_final.

CREATE TABLE public.usuarios (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  rol         TEXT NOT NULL CHECK (rol IN ('admin', 'operario', 'cliente_final')),
  nombre      TEXT NOT NULL,
  activo      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX usuarios_empresa_id_idx ON public.usuarios(empresa_id);

CREATE TRIGGER usuarios_touch_updated_at
BEFORE UPDATE ON public.usuarios
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

COMMENT ON TABLE public.usuarios IS
  'Perfil GPTO de cada usuario de auth.users. Registro manual (admin crea cuentas).';
