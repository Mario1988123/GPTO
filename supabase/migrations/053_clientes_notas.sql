-- 053_clientes_notas.sql
-- Capa 22 — Timeline de interacciones del cliente.
--
-- CAMBIO DE BD
-- - Qué cambia: nueva tabla cliente_interacciones (registro de llamadas, visitas,
--   emails, WhatsApp, reuniones, notas).
-- - Por qué: el CRM necesita historial cronológico de cada contacto para que
--   cualquiera del equipo sepa qué se ha hablado con el cliente.
-- - Riesgo: BAJO. Tabla nueva, no toca nada existente.

CREATE TABLE IF NOT EXISTS public.cliente_interacciones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  cliente_id      UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL CHECK (tipo IN ('nota','llamada','whatsapp','email','reunion','visita','presupuesto','otro')),
  titulo          TEXT NOT NULL,
  descripcion     TEXT,
  fecha           TIMESTAMPTZ NOT NULL DEFAULT now(),
  creado_por      UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  proyecto_id     UUID REFERENCES public.proyectos(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ci_cliente_idx   ON public.cliente_interacciones(cliente_id, fecha DESC);
CREATE INDEX IF NOT EXISTS ci_empresa_idx   ON public.cliente_interacciones(empresa_id);
CREATE INDEX IF NOT EXISTS ci_proyecto_idx  ON public.cliente_interacciones(proyecto_id);

DROP TRIGGER IF EXISTS ci_touch_updated_at ON public.cliente_interacciones;
CREATE TRIGGER ci_touch_updated_at BEFORE UPDATE ON public.cliente_interacciones
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS ci_autofill_empresa ON public.cliente_interacciones;
CREATE TRIGGER ci_autofill_empresa BEFORE INSERT ON public.cliente_interacciones
  FOR EACH ROW EXECUTE FUNCTION public.autofill_empresa_id();

ALTER TABLE public.cliente_interacciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ci_select ON public.cliente_interacciones;
DROP POLICY IF EXISTS ci_insert ON public.cliente_interacciones;
DROP POLICY IF EXISTS ci_update ON public.cliente_interacciones;
DROP POLICY IF EXISTS ci_delete ON public.cliente_interacciones;
CREATE POLICY ci_select ON public.cliente_interacciones FOR SELECT TO authenticated USING (empresa_id = public.current_empresa_id());
CREATE POLICY ci_insert ON public.cliente_interacciones FOR INSERT TO authenticated WITH CHECK (empresa_id = public.current_empresa_id());
CREATE POLICY ci_update ON public.cliente_interacciones FOR UPDATE TO authenticated USING (empresa_id = public.current_empresa_id()) WITH CHECK (empresa_id = public.current_empresa_id());
CREATE POLICY ci_delete ON public.cliente_interacciones FOR DELETE TO authenticated USING (empresa_id = public.current_empresa_id());

COMMENT ON TABLE public.cliente_interacciones IS 'Timeline de interacciones con cada cliente: llamadas, WhatsApp, emails, reuniones, notas.';
