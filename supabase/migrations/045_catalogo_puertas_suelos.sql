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
CREATE TRIGGER puertas_paso_touch_updated_at BEFORE UPDATE ON public.puertas_paso_catalogo
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
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
CREATE TRIGGER suelos_touch_updated_at BEFORE UPDATE ON public.suelos_catalogo
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
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
CREATE TRIGGER aislantes_touch_updated_at BEFORE UPDATE ON public.aislantes_catalogo
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
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
CREATE TRIGGER rodapies_touch_updated_at BEFORE UPDATE ON public.rodapies_catalogo
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER rodapies_autofill_empresa BEFORE INSERT ON public.rodapies_catalogo
  FOR EACH ROW EXECUTE FUNCTION public.autofill_empresa_id();

-- ================== RLS ==================
ALTER TABLE public.puertas_paso_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suelos_catalogo       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aislantes_catalogo    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rodapies_catalogo     ENABLE ROW LEVEL SECURITY;

-- Políticas idénticas para las 4 tablas: solo ven lo suyo por empresa_id.
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['puertas_paso_catalogo','suelos_catalogo','aislantes_catalogo','rodapies_catalogo']) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_select ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_insert ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_update ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_delete ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_select ON public.%I FOR SELECT TO authenticated USING (empresa_id = public.current_empresa_id())', t, t);
    EXECUTE format('CREATE POLICY %I_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (empresa_id = public.current_empresa_id())', t, t);
    EXECUTE format('CREATE POLICY %I_update ON public.%I FOR UPDATE TO authenticated USING (empresa_id = public.current_empresa_id()) WITH CHECK (empresa_id = public.current_empresa_id())', t, t);
    EXECUTE format('CREATE POLICY %I_delete ON public.%I FOR DELETE TO authenticated USING (empresa_id = public.current_empresa_id())', t, t);
  END LOOP;
END $$;
