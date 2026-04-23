-- 022_pedidos.sql
-- Capa 8: pedido generado al aceptar un presupuesto. Relacion 1:1 con presupuesto.
-- Estado propio de produccion.

CREATE TABLE public.pedidos (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id              UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  presupuesto_id          UUID NOT NULL UNIQUE REFERENCES public.presupuestos(id) ON DELETE RESTRICT,
  proyecto_id             UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE RESTRICT,
  numero                  TEXT UNIQUE,
  fecha_pedido            DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_entrega_prevista  DATE,
  importe_eur             NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (importe_eur >= 0),
  estado                  TEXT NOT NULL DEFAULT 'pendiente'
                           CHECK (estado IN ('pendiente','en_fabricacion','fabricado','entregado','cancelado')),
  notas                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX pedidos_empresa_idx      ON public.pedidos(empresa_id);
CREATE INDEX pedidos_proyecto_idx     ON public.pedidos(proyecto_id);
CREATE INDEX pedidos_estado_idx       ON public.pedidos(empresa_id, estado);
CREATE TRIGGER pedidos_touch_updated_at BEFORE UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER pedidos_autofill_empresa BEFORE INSERT ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.autofill_empresa_id();
COMMENT ON TABLE public.pedidos IS
  'Pedido = presupuesto aceptado. numero asignado al crear via get_next_sequence(PED).';
