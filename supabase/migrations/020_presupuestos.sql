-- 020_presupuestos.sql
-- Capa 7.1: presupuestos con lineas desglosadas, numeracion secuencial por empresa+tipo+año.

-- ============================== secuencias ==============================
CREATE TABLE public.secuencias (
  empresa_id      UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL CHECK (tipo IN ('PRES','PED','ALB','PIE','LOT')),
  anio            INTEGER NOT NULL,
  ultimo_numero   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (empresa_id, tipo, anio)
);

-- Funcion SQL puro con UPSERT: devuelve el siguiente numero formateado.
-- Ej: get_next_sequence('PRES') -> 'PRES-2026-0001' para la empresa del usuario.
CREATE OR REPLACE FUNCTION public.get_next_sequence(p_tipo TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.secuencias (empresa_id, tipo, anio, ultimo_numero)
  VALUES (public.current_empresa_id(), p_tipo, EXTRACT(YEAR FROM now())::INTEGER, 1)
  ON CONFLICT (empresa_id, tipo, anio)
  DO UPDATE SET ultimo_numero = public.secuencias.ultimo_numero + 1
  RETURNING p_tipo || '-' || anio || '-' || LPAD(ultimo_numero::TEXT, 4, '0');
$$;

COMMENT ON FUNCTION public.get_next_sequence(TEXT) IS
  'Genera el siguiente codigo secuencial por empresa+tipo+año. Ej: PRES-2026-0001.';

-- ============================== presupuestos ==============================
CREATE TABLE public.presupuestos (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id             UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  proyecto_id            UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE RESTRICT,
  numero                 TEXT UNIQUE,
  fecha_emision          DATE,
  validez_dias           INTEGER NOT NULL DEFAULT 30 CHECK (validez_dias IN (15, 30, 60, 90)),
  modo_presentacion      TEXT NOT NULL DEFAULT 'detallado_modulo'
                          CHECK (modo_presentacion IN ('detallado_modulo','precio_cerrado')),
  descuento_global_pct   NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (descuento_global_pct >= 0 AND descuento_global_pct <= 100),
  subtotal_eur           NUMERIC(12,2) NOT NULL DEFAULT 0,
  descuento_eur          NUMERIC(12,2) NOT NULL DEFAULT 0,
  base_imponible_eur     NUMERIC(12,2) NOT NULL DEFAULT 0,
  iva_pct                NUMERIC(5,2) NOT NULL DEFAULT 21,
  iva_eur                NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_eur              NUMERIC(12,2) NOT NULL DEFAULT 0,
  estado                 TEXT NOT NULL DEFAULT 'borrador'
                          CHECK (estado IN ('borrador','enviado','aceptado','rechazado','caducado')),
  snapshot               JSONB,
  pdf_url                TEXT,
  notas                  TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX presupuestos_empresa_idx   ON public.presupuestos(empresa_id);
CREATE INDEX presupuestos_proyecto_idx  ON public.presupuestos(proyecto_id);
CREATE INDEX presupuestos_estado_idx    ON public.presupuestos(empresa_id, estado);
CREATE TRIGGER presupuestos_touch_updated_at BEFORE UPDATE ON public.presupuestos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER presupuestos_autofill_empresa BEFORE INSERT ON public.presupuestos
  FOR EACH ROW EXECUTE FUNCTION public.autofill_empresa_id();
COMMENT ON TABLE public.presupuestos IS
  'Presupuesto del proyecto. numero NULL hasta emitir. snapshot congela los datos al emitir.';

-- ============================== presupuestos_lineas ==============================
CREATE TABLE public.presupuestos_lineas (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presupuesto_id         UUID NOT NULL REFERENCES public.presupuestos(id) ON DELETE CASCADE,
  orden                  INTEGER NOT NULL DEFAULT 0,
  categoria              TEXT NOT NULL CHECK (categoria IN ('tableros','cantos','herrajes','mano_obra','otro')),
  descripcion            TEXT NOT NULL,
  cantidad               NUMERIC(12,4) NOT NULL CHECK (cantidad >= 0),
  unidad                 TEXT NOT NULL CHECK (unidad IN ('ud','m2','ml','h','global')),
  precio_unitario_eur    NUMERIC(10,4) NOT NULL CHECK (precio_unitario_eur >= 0),
  descuento_linea_pct    NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (descuento_linea_pct >= 0 AND descuento_linea_pct <= 100),
  total_linea_eur        NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX presupuestos_lineas_pres_idx ON public.presupuestos_lineas(presupuesto_id, orden);
CREATE TRIGGER presupuestos_lineas_touch_updated_at BEFORE UPDATE ON public.presupuestos_lineas
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
COMMENT ON TABLE public.presupuestos_lineas IS
  'Lineas del presupuesto. total_linea_eur = cantidad * precio_unitario_eur * (1 - descuento_linea_pct/100).';
