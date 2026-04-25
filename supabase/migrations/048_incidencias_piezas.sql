-- 048_incidencias_piezas.sql
-- Capa 22 — Incidencias por pieza recibida (del proveedor de corte).
--
-- CAMBIO DE BD
-- - Qué cambia: nueva tabla incidencias_piezas_recibidas.
-- - Por qué: al recibir el pedido cortado de tableros, el carpintero inspecciona
--   cada pieza y puede marcar: mal cortada, tocada/rayada, falta, sustituida.
--   Esto afecta al gantt de montaje (retrasos) y genera reclamación al proveedor.
-- - Tablas afectadas: nueva.
-- - Migración (SQL): la de abajo.
-- - Rollback: DROP TABLE.
-- - Riesgo: BAJO. Empieza vacía.

CREATE TABLE IF NOT EXISTS public.incidencias_piezas_recibidas (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id         UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  pieza_modulo_id    UUID NOT NULL REFERENCES public.piezas_modulo(id) ON DELETE CASCADE,
  ocurrencia         INTEGER NOT NULL DEFAULT 1 CHECK (ocurrencia > 0),
  tipo               TEXT NOT NULL CHECK (tipo IN (
                       'mal_cortada','tocada','rayada','falta','grosor_incorrecto',
                       'veta_incorrecta','canto_defectuoso','otro'
                     )),
  descripcion        TEXT,
  requiere_repeticion BOOLEAN NOT NULL DEFAULT TRUE,
  resuelto           BOOLEAN NOT NULL DEFAULT FALSE,
  resuelto_at        TIMESTAMPTZ,
  reportado_por      UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  foto_url           TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ipr_pieza_idx ON public.incidencias_piezas_recibidas(pieza_modulo_id);
CREATE INDEX IF NOT EXISTS ipr_empresa_idx ON public.incidencias_piezas_recibidas(empresa_id);
CREATE INDEX IF NOT EXISTS ipr_no_resuelto_idx ON public.incidencias_piezas_recibidas(empresa_id, resuelto) WHERE resuelto = FALSE;
DROP TRIGGER IF EXISTS ipr_touch_updated_at ON public.incidencias_piezas_recibidas;
CREATE TRIGGER ipr_touch_updated_at BEFORE UPDATE ON public.incidencias_piezas_recibidas
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS ipr_autofill_empresa ON public.incidencias_piezas_recibidas;
CREATE TRIGGER ipr_autofill_empresa BEFORE INSERT ON public.incidencias_piezas_recibidas
  FOR EACH ROW EXECUTE FUNCTION public.autofill_empresa_id();

COMMENT ON TABLE public.incidencias_piezas_recibidas IS
  'Incidencia por pieza al recibir el pedido del proveedor de corte. Registra qué hay que rehacer y por qué.';

ALTER TABLE public.incidencias_piezas_recibidas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ipr_select ON public.incidencias_piezas_recibidas;
DROP POLICY IF EXISTS ipr_insert ON public.incidencias_piezas_recibidas;
DROP POLICY IF EXISTS ipr_update ON public.incidencias_piezas_recibidas;
DROP POLICY IF EXISTS ipr_delete ON public.incidencias_piezas_recibidas;
CREATE POLICY ipr_select ON public.incidencias_piezas_recibidas FOR SELECT TO authenticated USING (empresa_id = public.current_empresa_id());
CREATE POLICY ipr_insert ON public.incidencias_piezas_recibidas FOR INSERT TO authenticated WITH CHECK (empresa_id = public.current_empresa_id());
CREATE POLICY ipr_update ON public.incidencias_piezas_recibidas FOR UPDATE TO authenticated USING (empresa_id = public.current_empresa_id()) WITH CHECK (empresa_id = public.current_empresa_id());
CREATE POLICY ipr_delete ON public.incidencias_piezas_recibidas FOR DELETE TO authenticated USING (empresa_id = public.current_empresa_id());
