-- 049_pedidos_tableros.sql
-- Capa 22 — Pedidos al proveedor de corte (tablero cortado).
--
-- CAMBIO DE BD
-- - Qué cambia: tabla pedidos_tableros_corte (un pedido por proyecto y proveedor)
--   + relación 1:N con tableros_corte (pedido_tablero_id) para marcar qué tableros
--   se enviaron en qué pedido.
-- - Por qué: tras el nesting, el carpintero encarga el corte a una empresa externa.
--   Hay que guardar fecha de pedido, fecha de entrega prometida, estado, notas,
--   para encadenar la Gantt de montaje.
-- - Tablas afectadas: nueva + ALTER tableros_corte (columna aditiva).
-- - Rollback: DROP TABLE + DROP COLUMN.
-- - Riesgo: BAJO.

CREATE TABLE IF NOT EXISTS public.pedidos_tableros_corte (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id              UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  proyecto_id             UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  proveedor_id            UUID REFERENCES public.proveedores(id) ON DELETE SET NULL,
  estado                  TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN (
                            'borrador','enviado','confirmado','en_produccion','entregado','cancelado'
                          )),
  fecha_pedido            DATE,
  fecha_entrega_prometida DATE,
  fecha_entrega_real      DATE,
  coste_total_eur         NUMERIC(10,2),
  notas                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ptc_proyecto_idx ON public.pedidos_tableros_corte(proyecto_id);
CREATE INDEX IF NOT EXISTS ptc_empresa_idx ON public.pedidos_tableros_corte(empresa_id);
CREATE INDEX IF NOT EXISTS ptc_estado_idx ON public.pedidos_tableros_corte(empresa_id, estado);
DROP TRIGGER IF EXISTS ptc_touch_updated_at ON public.pedidos_tableros_corte;
CREATE TRIGGER ptc_touch_updated_at BEFORE UPDATE ON public.pedidos_tableros_corte
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS ptc_autofill_empresa ON public.pedidos_tableros_corte;
CREATE TRIGGER ptc_autofill_empresa BEFORE INSERT ON public.pedidos_tableros_corte
  FOR EACH ROW EXECUTE FUNCTION public.autofill_empresa_id();

COMMENT ON TABLE public.pedidos_tableros_corte IS
  'Pedido al proveedor externo para cortar los tableros del nesting. Punto de arranque del Gantt de montaje.';

-- Ligar tableros_corte a un pedido (opcional: un tablero puede existir aún sin haberse pedido).
ALTER TABLE public.tableros_corte
  ADD COLUMN IF NOT EXISTS pedido_id UUID REFERENCES public.pedidos_tableros_corte(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS tableros_corte_pedido_idx ON public.tableros_corte(pedido_id);

-- RLS
ALTER TABLE public.pedidos_tableros_corte ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ptc_select ON public.pedidos_tableros_corte;
DROP POLICY IF EXISTS ptc_insert ON public.pedidos_tableros_corte;
DROP POLICY IF EXISTS ptc_update ON public.pedidos_tableros_corte;
DROP POLICY IF EXISTS ptc_delete ON public.pedidos_tableros_corte;
CREATE POLICY ptc_select ON public.pedidos_tableros_corte FOR SELECT TO authenticated USING (empresa_id = public.current_empresa_id());
CREATE POLICY ptc_insert ON public.pedidos_tableros_corte FOR INSERT TO authenticated WITH CHECK (empresa_id = public.current_empresa_id());
CREATE POLICY ptc_update ON public.pedidos_tableros_corte FOR UPDATE TO authenticated USING (empresa_id = public.current_empresa_id()) WITH CHECK (empresa_id = public.current_empresa_id());
CREATE POLICY ptc_delete ON public.pedidos_tableros_corte FOR DELETE TO authenticated USING (empresa_id = public.current_empresa_id());
