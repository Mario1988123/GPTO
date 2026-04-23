-- 008_catalogo.sql
-- Capa 2: catálogo. 6 tablas. Unidades fijas: grosor en mm, precios en EUR.
-- config_empresa (tablero, kerf, trasera, IVA…) sigue en empresas.config_empresa JSONB.

-- ============================== proveedores ==============================
CREATE TABLE public.proveedores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  nombre      TEXT NOT NULL,
  contacto    TEXT,
  telefono    TEXT,
  email       TEXT,
  notas       TEXT,
  activo      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX proveedores_empresa_idx ON public.proveedores(empresa_id);
CREATE TRIGGER proveedores_touch_updated_at BEFORE UPDATE ON public.proveedores
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
COMMENT ON TABLE public.proveedores IS
  'Proveedores de la empresa (tableros, cantos, herrajes). Separado a tabla propia (Q3=b).';

-- ============================== materiales ==============================
CREATE TABLE public.materiales (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  categoria   TEXT NOT NULL CHECK (categoria IN ('tablero','madera_maciza','dm','melamina','contrachapado','otro')),
  nombre      TEXT NOT NULL,
  descripcion TEXT,
  activo      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX materiales_empresa_idx ON public.materiales(empresa_id);
CREATE INDEX materiales_empresa_cat_idx ON public.materiales(empresa_id, categoria);
CREATE TRIGGER materiales_touch_updated_at BEFORE UPDATE ON public.materiales
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
COMMENT ON TABLE public.materiales IS
  'Tipos de material base. Q2=b: con categoría y nombre.';

-- ============================== acabados ==============================
CREATE TABLE public.acabados (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  codigo      TEXT,
  nombre      TEXT NOT NULL,
  color_hex   TEXT,
  textura     TEXT,
  activo      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX acabados_empresa_idx ON public.acabados(empresa_id);
CREATE UNIQUE INDEX acabados_empresa_codigo_unique
  ON public.acabados(empresa_id, codigo) WHERE codigo IS NOT NULL;
CREATE TRIGGER acabados_touch_updated_at BEFORE UPDATE ON public.acabados
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
COMMENT ON TABLE public.acabados IS
  'Colores, texturas, terminaciones. Código opcional pero único por empresa.';

-- ============================== referencias_tablero ==============================
-- NÚCLEO del catálogo. Cada fila = una SKU real que la empresa compra.
CREATE TABLE public.referencias_tablero (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id            UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  material_id           UUID NOT NULL REFERENCES public.materiales(id) ON DELETE RESTRICT,
  acabado_id            UUID NOT NULL REFERENCES public.acabados(id) ON DELETE RESTRICT,
  proveedor_id          UUID REFERENCES public.proveedores(id) ON DELETE SET NULL,
  grosor_mm             INTEGER NOT NULL CHECK (grosor_mm > 0),
  precio_m2             NUMERIC(10,2) NOT NULL CHECK (precio_m2 >= 0),
  respeta_veta          BOOLEAN NOT NULL DEFAULT false,
  referencia_proveedor  TEXT,
  notas                 TEXT,
  activo                BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX referencias_tablero_empresa_idx ON public.referencias_tablero(empresa_id);
CREATE UNIQUE INDEX referencias_tablero_unique_combo
  ON public.referencias_tablero(empresa_id, material_id, acabado_id, grosor_mm, COALESCE(proveedor_id, '00000000-0000-0000-0000-000000000000'));
CREATE TRIGGER referencias_tablero_touch_updated_at BEFORE UPDATE ON public.referencias_tablero
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
COMMENT ON TABLE public.referencias_tablero IS
  'Núcleo del catálogo: entradas reales material+acabado+grosor+precio. No combinatoria automática.';

-- ============================== cantos ==============================
CREATE TABLE public.cantos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  nombre        TEXT NOT NULL,
  acabado_id    UUID REFERENCES public.acabados(id) ON DELETE SET NULL,
  grosor_mm     INTEGER CHECK (grosor_mm IS NULL OR grosor_mm > 0),
  proveedor_id  UUID REFERENCES public.proveedores(id) ON DELETE SET NULL,
  precio_ml     NUMERIC(10,2) NOT NULL CHECK (precio_ml >= 0),
  referencia_proveedor TEXT,
  notas         TEXT,
  activo        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX cantos_empresa_idx ON public.cantos(empresa_id);
CREATE INDEX cantos_empresa_acabado_idx ON public.cantos(empresa_id, acabado_id);
CREATE TRIGGER cantos_touch_updated_at BEFORE UPDATE ON public.cantos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
COMMENT ON TABLE public.cantos IS
  'Cantos en €/ml. acabado_id y grosor_mm NULL = aplica a todos.';

-- ============================== herrajes ==============================
CREATE TABLE public.herrajes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id            UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  tipo                  TEXT NOT NULL CHECK (tipo IN ('bisagra','tirador','guia','cierre','patas','barra','otro')),
  nombre                TEXT NOT NULL,
  referencia_proveedor  TEXT,
  proveedor_id          UUID REFERENCES public.proveedores(id) ON DELETE SET NULL,
  precio_unidad         NUMERIC(10,2) NOT NULL CHECK (precio_unidad >= 0),
  stock_disponible      INTEGER NOT NULL DEFAULT 0 CHECK (stock_disponible >= 0),
  notas                 TEXT,
  activo                BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX herrajes_empresa_idx ON public.herrajes(empresa_id);
CREATE INDEX herrajes_empresa_tipo_idx ON public.herrajes(empresa_id, tipo);
CREATE TRIGGER herrajes_touch_updated_at BEFORE UPDATE ON public.herrajes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
COMMENT ON TABLE public.herrajes IS
  'Herrajes en €/unidad. Q4=a: con tipo, precio unitario, stock.';
