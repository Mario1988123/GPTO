-- 047_referencia_tablero_formatos.sql
-- Capa 22 — Formatos disponibles por referencia de tablero.
--
-- CAMBIO DE BD
-- - Qué cambia: nueva tabla referencia_tablero_formatos (N:1 con referencias_tablero).
-- - Por qué: Mario puede comprar la misma melamina en varios tamaños de tablero
--   (244×122, 305×122, 380×144). El nesting debe poder elegir el formato que
--   minimice el número de tableros usados.
-- - Tablas afectadas: nueva.
-- - Migración (SQL): la de abajo.
-- - Rollback: DROP TABLE referencia_tablero_formatos.
-- - Riesgo: BAJO. Empezará vacía. Mientras no haya formatos, el nesting usa el
--   tamaño configurado en config_empresa (244×122 útil 240×120) como antes.

CREATE TABLE IF NOT EXISTS public.referencia_tablero_formatos (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id             UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  referencia_tablero_id  UUID NOT NULL REFERENCES public.referencias_tablero(id) ON DELETE CASCADE,
  ancho_mm               INTEGER NOT NULL CHECK (ancho_mm > 0),
  alto_mm                INTEGER NOT NULL CHECK (alto_mm > 0),
  ancho_util_mm          INTEGER NOT NULL CHECK (ancho_util_mm > 0),
  alto_util_mm           INTEGER NOT NULL CHECK (alto_util_mm > 0),
  precio_unidad_eur      NUMERIC(10,2),
  notas                  TEXT,
  activo                 BOOLEAN NOT NULL DEFAULT TRUE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT util_menor_que_total CHECK (ancho_util_mm <= ancho_mm AND alto_util_mm <= alto_mm)
);
CREATE INDEX IF NOT EXISTS rtf_ref_idx ON public.referencia_tablero_formatos(referencia_tablero_id);
CREATE INDEX IF NOT EXISTS rtf_empresa_idx ON public.referencia_tablero_formatos(empresa_id);
DROP TRIGGER IF EXISTS rtf_touch_updated_at ON public.referencia_tablero_formatos;
CREATE TRIGGER rtf_touch_updated_at BEFORE UPDATE ON public.referencia_tablero_formatos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS rtf_autofill_empresa ON public.referencia_tablero_formatos;
CREATE TRIGGER rtf_autofill_empresa BEFORE INSERT ON public.referencia_tablero_formatos
  FOR EACH ROW EXECUTE FUNCTION public.autofill_empresa_id();

COMMENT ON TABLE public.referencia_tablero_formatos IS
  'Formatos físicos (ancho×alto) en los que la empresa compra cada referencia de tablero. Usado por el nesting para elegir el tamaño óptimo.';

ALTER TABLE public.referencia_tablero_formatos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rtf_select ON public.referencia_tablero_formatos;
DROP POLICY IF EXISTS rtf_insert ON public.referencia_tablero_formatos;
DROP POLICY IF EXISTS rtf_update ON public.referencia_tablero_formatos;
DROP POLICY IF EXISTS rtf_delete ON public.referencia_tablero_formatos;
CREATE POLICY rtf_select ON public.referencia_tablero_formatos FOR SELECT TO authenticated USING (empresa_id = public.current_empresa_id());
CREATE POLICY rtf_insert ON public.referencia_tablero_formatos FOR INSERT TO authenticated WITH CHECK (empresa_id = public.current_empresa_id());
CREATE POLICY rtf_update ON public.referencia_tablero_formatos FOR UPDATE TO authenticated USING (empresa_id = public.current_empresa_id()) WITH CHECK (empresa_id = public.current_empresa_id());
CREATE POLICY rtf_delete ON public.referencia_tablero_formatos FOR DELETE TO authenticated USING (empresa_id = public.current_empresa_id());
