-- 017_nesting.sql
-- Capa 6.1: nesting automatico. 3 tablas: tableros_corte + piezas_en_tablero + recortes.

CREATE TABLE public.tableros_corte (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id             UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  proyecto_id            UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  referencia_tablero_id  UUID NOT NULL REFERENCES public.referencias_tablero(id) ON DELETE RESTRICT,
  numero                 INTEGER NOT NULL CHECK (numero > 0),
  ancho_mm               INTEGER NOT NULL CHECK (ancho_mm > 0),
  alto_mm                INTEGER NOT NULL CHECK (alto_mm > 0),
  area_ocupada_mm2       BIGINT NOT NULL DEFAULT 0 CHECK (area_ocupada_mm2 >= 0),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX tableros_corte_proyecto_idx ON public.tableros_corte(proyecto_id);
CREATE INDEX tableros_corte_empresa_idx  ON public.tableros_corte(empresa_id);
CREATE TRIGGER tableros_corte_touch_updated_at BEFORE UPDATE ON public.tableros_corte
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER tableros_corte_autofill_empresa BEFORE INSERT ON public.tableros_corte
  FOR EACH ROW EXECUTE FUNCTION public.autofill_empresa_id();
COMMENT ON TABLE public.tableros_corte IS
  'Tablero fisico que se va a cortar para un proyecto. Dimensiones = area util (240x120 por defecto).';

CREATE TABLE public.piezas_en_tablero (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tablero_corte_id    UUID NOT NULL REFERENCES public.tableros_corte(id) ON DELETE CASCADE,
  pieza_modulo_id     UUID NOT NULL REFERENCES public.piezas_modulo(id) ON DELETE CASCADE,
  ocurrencia          INTEGER NOT NULL DEFAULT 1 CHECK (ocurrencia > 0),
  x_mm                INTEGER NOT NULL CHECK (x_mm >= 0),
  y_mm                INTEGER NOT NULL CHECK (y_mm >= 0),
  largo_mm            INTEGER NOT NULL CHECK (largo_mm > 0),
  ancho_mm            INTEGER NOT NULL CHECK (ancho_mm > 0),
  rotada              BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pieza_modulo_id, ocurrencia)
);
CREATE INDEX piezas_en_tablero_tablero_idx ON public.piezas_en_tablero(tablero_corte_id);
CREATE INDEX piezas_en_tablero_pieza_idx   ON public.piezas_en_tablero(pieza_modulo_id);
CREATE TRIGGER piezas_en_tablero_touch_updated_at BEFORE UPDATE ON public.piezas_en_tablero
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
COMMENT ON TABLE public.piezas_en_tablero IS
  'Asignacion pieza -> tablero con posicion (x,y) y rotacion. ocurrencia indica copia N cuando pieza.cantidad>1.';

CREATE TABLE public.recortes (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id             UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  referencia_tablero_id  UUID NOT NULL REFERENCES public.referencias_tablero(id) ON DELETE RESTRICT,
  origen_tablero_id      UUID REFERENCES public.tableros_corte(id) ON DELETE SET NULL,
  largo_mm               INTEGER NOT NULL CHECK (largo_mm > 0),
  ancho_mm               INTEGER NOT NULL CHECK (ancho_mm > 0),
  estado                 TEXT NOT NULL DEFAULT 'pendiente'
                          CHECK (estado IN ('pendiente','conservado','descartado','usado')),
  notas                  TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX recortes_empresa_idx ON public.recortes(empresa_id);
CREATE INDEX recortes_estado_idx  ON public.recortes(empresa_id, estado);
CREATE INDEX recortes_ref_idx     ON public.recortes(referencia_tablero_id);
CREATE TRIGGER recortes_touch_updated_at BEFORE UPDATE ON public.recortes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER recortes_autofill_empresa BEFORE INSERT ON public.recortes
  FOR EACH ROW EXECUTE FUNCTION public.autofill_empresa_id();
COMMENT ON TABLE public.recortes IS
  'Retales de corte. Estado inicial pendiente -> operario decide conservado/descartado; al reutilizarse pasa a usado.';
