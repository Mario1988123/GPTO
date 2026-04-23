-- 027_estancias.sql
-- Capa 4.3: nuevo nivel Estancia entre Proyecto y Armarios.
-- Un proyecto puede tener varias estancias (vestidor, cocina, pasillo...).
-- Cada armario pasa a pertenecer a una estancia.
-- Ademas armarios gana tipo_instalacion (empotrado/suelto) + margen_tapeta_mm.

-- ============================== estancias ==============================
CREATE TABLE public.estancias (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  proyecto_id     UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL DEFAULT 'Principal',
  tipo            TEXT NOT NULL DEFAULT 'otro'
                   CHECK (tipo IN ('vestidor','armario_pasillo','cocina','comedor','dormitorio','bano','entrada','salon','despacho','otro')),
  orden           INTEGER NOT NULL DEFAULT 0,
  largo_mm        INTEGER CHECK (largo_mm IS NULL OR largo_mm > 0),
  ancho_mm        INTEGER CHECK (ancho_mm IS NULL OR ancho_mm > 0),
  alto_mm         INTEGER CHECK (alto_mm IS NULL OR alto_mm > 0),
  notas           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX estancias_proyecto_idx ON public.estancias(proyecto_id, orden);
CREATE INDEX estancias_empresa_idx  ON public.estancias(empresa_id);
CREATE TRIGGER estancias_touch_updated_at BEFORE UPDATE ON public.estancias
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER estancias_autofill_empresa BEFORE INSERT ON public.estancias
  FOR EACH ROW EXECUTE FUNCTION public.autofill_empresa_id();
COMMENT ON TABLE public.estancias IS
  'Agrupa armarios por sala/estancia dentro de un proyecto (vestidor, cocina, pasillo...). largo/ancho/alto son medidas de la estancia para el plano 2D futuro.';

-- ============================== armarios: nuevos campos ==============================
ALTER TABLE public.armarios
  ADD COLUMN estancia_id       UUID REFERENCES public.estancias(id) ON DELETE CASCADE,
  ADD COLUMN tipo_instalacion  TEXT NOT NULL DEFAULT 'suelto'
                                CHECK (tipo_instalacion IN ('empotrado','suelto')),
  ADD COLUMN margen_tapeta_mm  INTEGER NOT NULL DEFAULT 0
                                CHECK (margen_tapeta_mm >= 0 AND margen_tapeta_mm <= 50);

-- Migracion de datos: crear una estancia "Principal" por cada proyecto existente
-- y asignar los armarios del proyecto a esa estancia.
INSERT INTO public.estancias (empresa_id, proyecto_id, nombre, tipo, orden)
SELECT empresa_id, id, 'Principal', 'otro', 0
FROM public.proyectos;

UPDATE public.armarios a
SET estancia_id = (SELECT id FROM public.estancias e WHERE e.proyecto_id = a.proyecto_id LIMIT 1);

-- Ahora estancia_id puede ser NOT NULL.
ALTER TABLE public.armarios ALTER COLUMN estancia_id SET NOT NULL;

COMMENT ON COLUMN public.armarios.tipo_instalacion IS
  'empotrado = se instala en un hueco preexistente (necesita margen tapeta); suelto = mueble independiente.';
COMMENT ON COLUMN public.armarios.margen_tapeta_mm IS
  'Holgura perimetral para empotrados (tipico 3-10 mm). Ignorado en suelto. Resta al ancho/alto efectivos.';
