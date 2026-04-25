-- 045_catalogo_puertas_suelos.sql
-- Capa 22 — Catálogos nuevos: puertas de paso, suelos, aislantes, rodapiés.
--
-- CAMBIO DE BD
-- - Qué cambia: crea 4 tablas nuevas de catálogo + triggers de updated_at + autofill_empresa_id.
-- - Por qué: Mario presupuesta también puertas de paso (corredera, abatible, invisible, con/sin
--   tapeta, pladur/obra), suelo tipo parquet/laminado con su aislante y rodapié (a veces con
--   LED). Hasta ahora esto se metía a mano como "subelemento proveedor"; lo convertimos en
--   catálogo reutilizable.
-- - Tablas afectadas: nuevas.
-- - Migración (SQL): la de abajo.
-- - Rollback (SQL): DROP TABLE x4.
-- - Riesgo: BAJO. Nuevas tablas, no tocan nada existente. Empiezan vacías.

-- ================== PUERTAS DE PASO ==================
CREATE TABLE IF NOT EXISTS public.puertas_paso_catalogo (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id           UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  nombre               TEXT NOT NULL,
  tipo_apertura        TEXT NOT NULL CHECK (tipo_apertura IN (
                         'abatible','corredera_vista','corredera_cajon',
                         'pivotante','vaiven','plegable','invisible','doble_hoja'
                       )),
  ancho_mm             INTEGER NOT NULL CHECK (ancho_mm > 0),
  alto_mm              INTEGER NOT NULL CHECK (alto_mm > 0),
  grosor_hoja_mm       INTEGER NOT NULL DEFAULT 40 CHECK (grosor_hoja_mm > 0),
  grosor_muro_mm       INTEGER NOT NULL DEFAULT 100 CHECK (grosor_muro_mm > 0),
  material_cajon       TEXT NOT NULL DEFAULT 'pladur' CHECK (material_cajon IN ('pladur','obra','madera','metal')),
  lleva_tapeta         BOOLEAN NOT NULL DEFAULT TRUE,
  ancho_tapeta_mm      INTEGER CHECK (ancho_tapeta_mm IS NULL OR ancho_tapeta_mm > 0),
  acabado              TEXT,
  color                TEXT,
  proveedor_id         UUID REFERENCES public.proveedores(id) ON DELETE SET NULL,
  referencia_proveedor TEXT,
  precio_coste_eur     NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (precio_coste_eur >= 0),
  precio_pvp_eur       NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (precio_pvp_eur >= 0),
  notas                TEXT,
  activo               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS puertas_paso_empresa_idx ON public.puertas_paso_catalogo(empresa_id);
DROP TRIGGER IF EXISTS puertas_paso_touch_updated_at ON public.puertas_paso_catalogo;
CREATE TRIGGER puertas_paso_touch_updated_at BEFORE UPDATE ON public.puertas_paso_catalogo
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS puertas_paso_autofill_empresa ON public.puertas_paso_catalogo;
CREATE TRIGGER puertas_paso_autofill_empresa BEFORE INSERT ON public.puertas_paso_catalogo
  FOR EACH ROW EXECUTE FUNCTION public.autofill_empresa_id();
COMMENT ON TABLE public.puertas_paso_catalogo IS
  'Catálogo de puertas de paso (no confundir con puertas de armario). Se añaden al presupuesto como línea propia.';

-- ================== SUELOS (parquet/laminado/vinilico) ==================
CREATE TABLE IF NOT EXISTS public.suelos_catalogo (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id           UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  nombre               TEXT NOT NULL,
  tipo                 TEXT NOT NULL CHECK (tipo IN ('parquet_natural','laminado','vinilico','tarima_maciza','spc','otro')),
  clase_uso            TEXT CHECK (clase_uso IS NULL OR clase_uso IN ('AC3','AC4','AC5','AC6')),
  grosor_mm            INTEGER NOT NULL CHECK (grosor_mm > 0),
  ancho_lama_mm        INTEGER CHECK (ancho_lama_mm IS NULL OR ancho_lama_mm > 0),
  largo_lama_mm        INTEGER CHECK (largo_lama_mm IS NULL OR largo_lama_mm > 0),
  acabado              TEXT,
  proveedor_id         UUID REFERENCES public.proveedores(id) ON DELETE SET NULL,
  referencia_proveedor TEXT,
  precio_coste_m2      NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (precio_coste_m2 >= 0),
  precio_pvp_m2        NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (precio_pvp_m2 >= 0),
  notas                TEXT,
  activo               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS suelos_empresa_idx ON public.suelos_catalogo(empresa_id);
DROP TRIGGER IF EXISTS suelos_touch_updated_at ON public.suelos_catalogo;
CREATE TRIGGER suelos_touch_updated_at BEFORE UPDATE ON public.suelos_catalogo
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS suelos_autofill_empresa ON public.suelos_catalogo;
CREATE TRIGGER suelos_autofill_empresa BEFORE INSERT ON public.suelos_catalogo
  FOR EACH ROW EXECUTE FUNCTION public.autofill_empresa_id();

-- ================== AISLANTES ==================
CREATE TABLE IF NOT EXISTS public.aislantes_catalogo (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id           UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  nombre               TEXT NOT NULL,
  tipo                 TEXT NOT NULL DEFAULT 'foam' CHECK (tipo IN ('foam','fibra','corcho','polietileno','otro')),
  grosor_mm            INTEGER NOT NULL CHECK (grosor_mm > 0),
  proveedor_id         UUID REFERENCES public.proveedores(id) ON DELETE SET NULL,
  referencia_proveedor TEXT,
  precio_coste_m2      NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (precio_coste_m2 >= 0),
  precio_pvp_m2        NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (precio_pvp_m2 >= 0),
  notas                TEXT,
  activo               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS aislantes_empresa_idx ON public.aislantes_catalogo(empresa_id);
DROP TRIGGER IF EXISTS aislantes_touch_updated_at ON public.aislantes_catalogo;
CREATE TRIGGER aislantes_touch_updated_at BEFORE UPDATE ON public.aislantes_catalogo
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS aislantes_autofill_empresa ON public.aislantes_catalogo;
CREATE TRIGGER aislantes_autofill_empresa BEFORE INSERT ON public.aislantes_catalogo
  FOR EACH ROW EXECUTE FUNCTION public.autofill_empresa_id();

-- ================== RODAPIÉS ==================
CREATE TABLE IF NOT EXISTS public.rodapies_catalogo (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id           UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  nombre               TEXT NOT NULL,
  material             TEXT NOT NULL CHECK (material IN ('pvc','madera','mdf','lacado','aluminio','otro')),
  altura_mm            INTEGER NOT NULL CHECK (altura_mm > 0),
  grosor_mm            INTEGER NOT NULL DEFAULT 12 CHECK (grosor_mm > 0),
  formato_m            NUMERIC(4,2) NOT NULL DEFAULT 2.40 CHECK (formato_m > 0),
  lleva_led            BOOLEAN NOT NULL DEFAULT FALSE,
  acabado              TEXT,
  proveedor_id         UUID REFERENCES public.proveedores(id) ON DELETE SET NULL,
  referencia_proveedor TEXT,
  precio_coste_ml      NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (precio_coste_ml >= 0),
  precio_pvp_ml        NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (precio_pvp_ml >= 0),
  notas                TEXT,
  activo               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rodapies_empresa_idx ON public.rodapies_catalogo(empresa_id);
DROP TRIGGER IF EXISTS rodapies_touch_updated_at ON public.rodapies_catalogo;
CREATE TRIGGER rodapies_touch_updated_at BEFORE UPDATE ON public.rodapies_catalogo
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS rodapies_autofill_empresa ON public.rodapies_catalogo;
CREATE TRIGGER rodapies_autofill_empresa BEFORE INSERT ON public.rodapies_catalogo
  FOR EACH ROW EXECUTE FUNCTION public.autofill_empresa_id();

-- ================== RLS ==================
ALTER TABLE public.puertas_paso_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suelos_catalogo       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aislantes_catalogo    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rodapies_catalogo     ENABLE ROW LEVEL SECURITY;

-- Políticas idénticas para las 4 tablas: solo ven lo suyo por empresa_id.
-- Sin DO $$ ... $$ para que el SQL Editor de Supabase no parta el dollar-quote.

-- puertas_paso_catalogo
DROP POLICY IF EXISTS puertas_paso_catalogo_select ON public.puertas_paso_catalogo;
DROP POLICY IF EXISTS puertas_paso_catalogo_insert ON public.puertas_paso_catalogo;
DROP POLICY IF EXISTS puertas_paso_catalogo_update ON public.puertas_paso_catalogo;
DROP POLICY IF EXISTS puertas_paso_catalogo_delete ON public.puertas_paso_catalogo;
CREATE POLICY puertas_paso_catalogo_select ON public.puertas_paso_catalogo FOR SELECT TO authenticated USING (empresa_id = public.current_empresa_id());
CREATE POLICY puertas_paso_catalogo_insert ON public.puertas_paso_catalogo FOR INSERT TO authenticated WITH CHECK (empresa_id = public.current_empresa_id());
CREATE POLICY puertas_paso_catalogo_update ON public.puertas_paso_catalogo FOR UPDATE TO authenticated USING (empresa_id = public.current_empresa_id()) WITH CHECK (empresa_id = public.current_empresa_id());
CREATE POLICY puertas_paso_catalogo_delete ON public.puertas_paso_catalogo FOR DELETE TO authenticated USING (empresa_id = public.current_empresa_id());

-- suelos_catalogo
DROP POLICY IF EXISTS suelos_catalogo_select ON public.suelos_catalogo;
DROP POLICY IF EXISTS suelos_catalogo_insert ON public.suelos_catalogo;
DROP POLICY IF EXISTS suelos_catalogo_update ON public.suelos_catalogo;
DROP POLICY IF EXISTS suelos_catalogo_delete ON public.suelos_catalogo;
CREATE POLICY suelos_catalogo_select ON public.suelos_catalogo FOR SELECT TO authenticated USING (empresa_id = public.current_empresa_id());
CREATE POLICY suelos_catalogo_insert ON public.suelos_catalogo FOR INSERT TO authenticated WITH CHECK (empresa_id = public.current_empresa_id());
CREATE POLICY suelos_catalogo_update ON public.suelos_catalogo FOR UPDATE TO authenticated USING (empresa_id = public.current_empresa_id()) WITH CHECK (empresa_id = public.current_empresa_id());
CREATE POLICY suelos_catalogo_delete ON public.suelos_catalogo FOR DELETE TO authenticated USING (empresa_id = public.current_empresa_id());

-- aislantes_catalogo
DROP POLICY IF EXISTS aislantes_catalogo_select ON public.aislantes_catalogo;
DROP POLICY IF EXISTS aislantes_catalogo_insert ON public.aislantes_catalogo;
DROP POLICY IF EXISTS aislantes_catalogo_update ON public.aislantes_catalogo;
DROP POLICY IF EXISTS aislantes_catalogo_delete ON public.aislantes_catalogo;
CREATE POLICY aislantes_catalogo_select ON public.aislantes_catalogo FOR SELECT TO authenticated USING (empresa_id = public.current_empresa_id());
CREATE POLICY aislantes_catalogo_insert ON public.aislantes_catalogo FOR INSERT TO authenticated WITH CHECK (empresa_id = public.current_empresa_id());
CREATE POLICY aislantes_catalogo_update ON public.aislantes_catalogo FOR UPDATE TO authenticated USING (empresa_id = public.current_empresa_id()) WITH CHECK (empresa_id = public.current_empresa_id());
CREATE POLICY aislantes_catalogo_delete ON public.aislantes_catalogo FOR DELETE TO authenticated USING (empresa_id = public.current_empresa_id());

-- rodapies_catalogo
DROP POLICY IF EXISTS rodapies_catalogo_select ON public.rodapies_catalogo;
DROP POLICY IF EXISTS rodapies_catalogo_insert ON public.rodapies_catalogo;
DROP POLICY IF EXISTS rodapies_catalogo_update ON public.rodapies_catalogo;
DROP POLICY IF EXISTS rodapies_catalogo_delete ON public.rodapies_catalogo;
CREATE POLICY rodapies_catalogo_select ON public.rodapies_catalogo FOR SELECT TO authenticated USING (empresa_id = public.current_empresa_id());
CREATE POLICY rodapies_catalogo_insert ON public.rodapies_catalogo FOR INSERT TO authenticated WITH CHECK (empresa_id = public.current_empresa_id());
CREATE POLICY rodapies_catalogo_update ON public.rodapies_catalogo FOR UPDATE TO authenticated USING (empresa_id = public.current_empresa_id()) WITH CHECK (empresa_id = public.current_empresa_id());
CREATE POLICY rodapies_catalogo_delete ON public.rodapies_catalogo FOR DELETE TO authenticated USING (empresa_id = public.current_empresa_id());
