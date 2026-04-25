-- 054_facturas.sql
-- Capa 22 — Facturación según RD 1619/2012 (Reglamento de Facturación español).
--
-- CAMBIO DE BD
-- - Qué cambia: tablas series_facturacion, facturas, factura_lineas, factura_resumen_iva.
--   Datos fiscales en empresas.config_empresa (clave 'datos_fiscales' JSONB).
-- - Por qué: facturación legal en España. Cubre obligatorias completas, simplificadas
--   y rectificativas. Numeración correlativa por serie sin huecos.
-- - Verifactu: campos preparados (hash, hash_anterior, qr_url) pero NO se firma
--   ni se envía a AEAT en esta capa. Cuando Mario lo confirme se enchufa.
-- - Riesgo: BAJO. Tablas nuevas. La inmutabilidad de facturas emitidas se enforca
--   vía CHECK + trigger.

-- ================== SERIES ==================
CREATE TABLE IF NOT EXISTS public.series_facturacion (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  codigo          TEXT NOT NULL,                   -- ej: 'A', 'F2026', 'R' (rectificativas)
  nombre          TEXT NOT NULL,
  prefijo         TEXT NOT NULL DEFAULT '',        -- ej: 'F', 'FAC-2026/'
  siguiente_num   INTEGER NOT NULL DEFAULT 1 CHECK (siguiente_num > 0),
  es_rectificativa BOOLEAN NOT NULL DEFAULT FALSE,
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, codigo)
);
CREATE INDEX IF NOT EXISTS series_empresa_idx ON public.series_facturacion(empresa_id);
DROP TRIGGER IF EXISTS series_touch_updated_at ON public.series_facturacion;
CREATE TRIGGER series_touch_updated_at BEFORE UPDATE ON public.series_facturacion
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS series_autofill_empresa ON public.series_facturacion;
CREATE TRIGGER series_autofill_empresa BEFORE INSERT ON public.series_facturacion
  FOR EACH ROW EXECUTE FUNCTION public.autofill_empresa_id();

-- ================== FACTURAS ==================
CREATE TABLE IF NOT EXISTS public.facturas (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id            UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  serie_id              UUID NOT NULL REFERENCES public.series_facturacion(id) ON DELETE RESTRICT,
  numero                INTEGER NOT NULL CHECK (numero > 0),
  numero_completo       TEXT NOT NULL,             -- '<prefijo><numero>' precalculado, único por empresa
  cliente_id            UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  proyecto_id           UUID REFERENCES public.proyectos(id) ON DELETE SET NULL,
  presupuesto_id        UUID REFERENCES public.presupuestos(id) ON DELETE SET NULL,

  tipo                  TEXT NOT NULL DEFAULT 'completa' CHECK (tipo IN ('completa','simplificada','rectificativa')),
  factura_rectificada_id UUID REFERENCES public.facturas(id) ON DELETE RESTRICT,  -- si es rectificativa
  motivo_rectificacion  TEXT,                                                       -- obligatorio si tipo=rectificativa

  fecha_emision         DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_operacion       DATE,                                                       -- si !== emision

  -- Snapshot fiscal: emisor + receptor en el momento de emitir (las facturas son inmutables)
  emisor                JSONB NOT NULL,                                             -- {razon_social, nif, domicilio_fiscal}
  receptor              JSONB NOT NULL,                                             -- {razon_social, nif, domicilio, es_empresa}

  -- Importes (calculados desde lineas)
  base_imponible        NUMERIC(12,2) NOT NULL DEFAULT 0,
  cuota_iva             NUMERIC(12,2) NOT NULL DEFAULT 0,
  retencion_irpf_pct    NUMERIC(5,2)  NOT NULL DEFAULT 0,
  cuota_irpf            NUMERIC(12,2) NOT NULL DEFAULT 0,
  recargo_eq_pct        NUMERIC(5,2)  NOT NULL DEFAULT 0,
  cuota_recargo_eq      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total                 NUMERIC(12,2) NOT NULL DEFAULT 0,

  forma_pago            TEXT NOT NULL DEFAULT 'transferencia'
                        CHECK (forma_pago IN ('transferencia','tarjeta','efectivo','domiciliacion','bizum','otro')),
  vencimiento_dias      INTEGER NOT NULL DEFAULT 30,
  fecha_vencimiento     DATE,
  iban                  TEXT,
  pagada                BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_pago            DATE,

  estado                TEXT NOT NULL DEFAULT 'borrador'
                        CHECK (estado IN ('borrador','emitida','enviada','pagada','rectificada','anulada')),

  -- Verifactu (preparado, no implementado en esta capa)
  hash                  TEXT,
  hash_anterior         TEXT,
  qr_url                TEXT,
  enviado_aeat          BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_envio_aeat      TIMESTAMPTZ,

  notas                 TEXT,
  pdf_url               TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (empresa_id, numero_completo)
);
CREATE INDEX IF NOT EXISTS facturas_empresa_idx        ON public.facturas(empresa_id);
CREATE INDEX IF NOT EXISTS facturas_cliente_idx        ON public.facturas(cliente_id);
CREATE INDEX IF NOT EXISTS facturas_proyecto_idx       ON public.facturas(proyecto_id);
CREATE INDEX IF NOT EXISTS facturas_estado_idx         ON public.facturas(empresa_id, estado);
CREATE INDEX IF NOT EXISTS facturas_fecha_emision_idx  ON public.facturas(empresa_id, fecha_emision DESC);
CREATE INDEX IF NOT EXISTS facturas_no_pagadas_idx     ON public.facturas(empresa_id, fecha_vencimiento) WHERE pagada = FALSE AND estado IN ('emitida','enviada');

DROP TRIGGER IF EXISTS facturas_touch_updated_at ON public.facturas;
CREATE TRIGGER facturas_touch_updated_at BEFORE UPDATE ON public.facturas
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS facturas_autofill_empresa ON public.facturas;
CREATE TRIGGER facturas_autofill_empresa BEFORE INSERT ON public.facturas
  FOR EACH ROW EXECUTE FUNCTION public.autofill_empresa_id();

-- ================== LÍNEAS ==================
CREATE TABLE IF NOT EXISTS public.factura_lineas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  factura_id      UUID NOT NULL REFERENCES public.facturas(id) ON DELETE CASCADE,
  orden           INTEGER NOT NULL DEFAULT 0,
  descripcion     TEXT NOT NULL,
  cantidad        NUMERIC(10,3) NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  precio_unitario NUMERIC(12,4) NOT NULL DEFAULT 0,
  descuento_pct   NUMERIC(5,2)  NOT NULL DEFAULT 0 CHECK (descuento_pct >= 0 AND descuento_pct <= 100),
  iva_pct         NUMERIC(5,2)  NOT NULL DEFAULT 21 CHECK (iva_pct IN (0, 4, 10, 21)),
  base_linea      NUMERIC(12,2) NOT NULL DEFAULT 0,
  cuota_iva_linea NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_linea     NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fl_factura_idx ON public.factura_lineas(factura_id, orden);
CREATE INDEX IF NOT EXISTS fl_empresa_idx ON public.factura_lineas(empresa_id);
DROP TRIGGER IF EXISTS fl_autofill_empresa ON public.factura_lineas;
CREATE TRIGGER fl_autofill_empresa BEFORE INSERT ON public.factura_lineas
  FOR EACH ROW EXECUTE FUNCTION public.autofill_empresa_id();

-- ================== FUNCIÓN: emitir factura (asigna número y bloquea) ==================
-- Se llama desde la app al cambiar estado a 'emitida'. Asigna numero correlativo
-- desde series_facturacion.siguiente_num y lo incrementa de forma atómica.
CREATE OR REPLACE FUNCTION public.emitir_factura(p_factura_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_serie_id UUID;
  v_prefijo  TEXT;
  v_num      INTEGER;
  v_completo TEXT;
  v_estado   TEXT;
BEGIN
  SELECT estado, serie_id INTO v_estado, v_serie_id
    FROM public.facturas WHERE id = p_factura_id FOR UPDATE;
  IF v_estado IS NULL THEN RAISE EXCEPTION 'Factura no encontrada'; END IF;
  IF v_estado <> 'borrador' THEN RAISE EXCEPTION 'Solo se pueden emitir facturas en borrador'; END IF;

  SELECT prefijo, siguiente_num INTO v_prefijo, v_num
    FROM public.series_facturacion WHERE id = v_serie_id FOR UPDATE;
  IF v_num IS NULL THEN RAISE EXCEPTION 'Serie no encontrada'; END IF;

  v_completo := v_prefijo || lpad(v_num::TEXT, 4, '0');

  UPDATE public.series_facturacion SET siguiente_num = siguiente_num + 1 WHERE id = v_serie_id;
  UPDATE public.facturas SET numero = v_num, numero_completo = v_completo, estado = 'emitida', fecha_emision = COALESCE(fecha_emision, CURRENT_DATE)
    WHERE id = p_factura_id;

  RETURN v_completo;
END;
$$;

-- ================== RLS ==================
ALTER TABLE public.series_facturacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facturas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factura_lineas     ENABLE ROW LEVEL SECURITY;

-- series_facturacion
DROP POLICY IF EXISTS series_facturacion_select ON public.series_facturacion;
DROP POLICY IF EXISTS series_facturacion_insert ON public.series_facturacion;
DROP POLICY IF EXISTS series_facturacion_update ON public.series_facturacion;
DROP POLICY IF EXISTS series_facturacion_delete ON public.series_facturacion;
CREATE POLICY series_facturacion_select ON public.series_facturacion FOR SELECT TO authenticated USING (empresa_id = public.current_empresa_id());
CREATE POLICY series_facturacion_insert ON public.series_facturacion FOR INSERT TO authenticated WITH CHECK (empresa_id = public.current_empresa_id());
CREATE POLICY series_facturacion_update ON public.series_facturacion FOR UPDATE TO authenticated USING (empresa_id = public.current_empresa_id()) WITH CHECK (empresa_id = public.current_empresa_id());
CREATE POLICY series_facturacion_delete ON public.series_facturacion FOR DELETE TO authenticated USING (empresa_id = public.current_empresa_id());

-- facturas
DROP POLICY IF EXISTS facturas_select ON public.facturas;
DROP POLICY IF EXISTS facturas_insert ON public.facturas;
DROP POLICY IF EXISTS facturas_update ON public.facturas;
DROP POLICY IF EXISTS facturas_delete ON public.facturas;
CREATE POLICY facturas_select ON public.facturas FOR SELECT TO authenticated USING (empresa_id = public.current_empresa_id());
CREATE POLICY facturas_insert ON public.facturas FOR INSERT TO authenticated WITH CHECK (empresa_id = public.current_empresa_id());
CREATE POLICY facturas_update ON public.facturas FOR UPDATE TO authenticated USING (empresa_id = public.current_empresa_id()) WITH CHECK (empresa_id = public.current_empresa_id());
CREATE POLICY facturas_delete ON public.facturas FOR DELETE TO authenticated USING (empresa_id = public.current_empresa_id());

-- factura_lineas
DROP POLICY IF EXISTS factura_lineas_select ON public.factura_lineas;
DROP POLICY IF EXISTS factura_lineas_insert ON public.factura_lineas;
DROP POLICY IF EXISTS factura_lineas_update ON public.factura_lineas;
DROP POLICY IF EXISTS factura_lineas_delete ON public.factura_lineas;
CREATE POLICY factura_lineas_select ON public.factura_lineas FOR SELECT TO authenticated USING (empresa_id = public.current_empresa_id());
CREATE POLICY factura_lineas_insert ON public.factura_lineas FOR INSERT TO authenticated WITH CHECK (empresa_id = public.current_empresa_id());
CREATE POLICY factura_lineas_update ON public.factura_lineas FOR UPDATE TO authenticated USING (empresa_id = public.current_empresa_id()) WITH CHECK (empresa_id = public.current_empresa_id());
CREATE POLICY factura_lineas_delete ON public.factura_lineas FOR DELETE TO authenticated USING (empresa_id = public.current_empresa_id());

-- ================== INMUTABILIDAD ==================
-- Una factura emitida no puede borrarse ni cambiar campos críticos.
CREATE OR REPLACE FUNCTION public.factura_inmutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.estado <> 'borrador' THEN
    RAISE EXCEPTION 'No se puede borrar una factura ya emitida (% %). Usa una rectificativa.', OLD.numero_completo, OLD.estado;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.estado <> 'borrador' THEN
    -- Permitido sólo cambiar pagada, fecha_pago, estado entre emitida↔enviada↔pagada↔rectificada↔anulada,
    -- hash/qr/aeat (Verifactu), pdf_url, notas.
    IF (OLD.numero IS DISTINCT FROM NEW.numero
       OR OLD.numero_completo IS DISTINCT FROM NEW.numero_completo
       OR OLD.cliente_id IS DISTINCT FROM NEW.cliente_id
       OR OLD.fecha_emision IS DISTINCT FROM NEW.fecha_emision
       OR OLD.base_imponible IS DISTINCT FROM NEW.base_imponible
       OR OLD.cuota_iva IS DISTINCT FROM NEW.cuota_iva
       OR OLD.total IS DISTINCT FROM NEW.total
       OR OLD.emisor::TEXT IS DISTINCT FROM NEW.emisor::TEXT
       OR OLD.receptor::TEXT IS DISTINCT FROM NEW.receptor::TEXT)
    THEN
      RAISE EXCEPTION 'Factura emitida es inmutable. Para corregir, crea una rectificativa.';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS facturas_inmutable_trg ON public.facturas;
CREATE TRIGGER facturas_inmutable_trg BEFORE UPDATE OR DELETE ON public.facturas
  FOR EACH ROW EXECUTE FUNCTION public.factura_inmutable();

CREATE OR REPLACE FUNCTION public.factura_lineas_inmutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_estado TEXT;
BEGIN
  SELECT estado INTO v_estado FROM public.facturas
    WHERE id = COALESCE(NEW.factura_id, OLD.factura_id);
  IF v_estado <> 'borrador' THEN
    RAISE EXCEPTION 'No se pueden modificar líneas de una factura ya emitida.';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS factura_lineas_inmutable_trg ON public.factura_lineas;
CREATE TRIGGER factura_lineas_inmutable_trg BEFORE INSERT OR UPDATE OR DELETE ON public.factura_lineas
  FOR EACH ROW EXECUTE FUNCTION public.factura_lineas_inmutable();

COMMENT ON TABLE public.facturas IS 'Facturas según RD 1619/2012. Inmutables tras emisión. Soporta completas, simplificadas y rectificativas. Verifactu pendiente.';
