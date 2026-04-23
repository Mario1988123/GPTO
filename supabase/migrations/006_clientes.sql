-- 006_clientes.sql
-- Capa 1: clientes finales de cada empresa (personas/comercios que encargan armarios).

CREATE TABLE public.clientes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  nombre      TEXT NOT NULL,
  email       TEXT,
  telefono    TEXT,
  direccion   JSONB,   -- { calle, numero, piso, cp, ciudad, provincia, pais }
  nif         TEXT,
  notas       TEXT,
  activo      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX clientes_empresa_id_idx      ON public.clientes(empresa_id);
CREATE INDEX clientes_empresa_nombre_idx  ON public.clientes(empresa_id, lower(nombre));
CREATE UNIQUE INDEX clientes_empresa_nif_unique
  ON public.clientes(empresa_id, nif) WHERE nif IS NOT NULL;

CREATE TRIGGER clientes_touch_updated_at
BEFORE UPDATE ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

COMMENT ON TABLE public.clientes IS
  'Clientes finales de cada empresa (los que encargan armarios).';
COMMENT ON COLUMN public.clientes.direccion IS
  'JSONB libre. Claves sugeridas: calle, numero, piso, cp, ciudad, provincia, pais.';
COMMENT ON COLUMN public.clientes.activo IS
  'Soft delete: los clientes inactivos no aparecen en selectores pero conservan su historial.';
