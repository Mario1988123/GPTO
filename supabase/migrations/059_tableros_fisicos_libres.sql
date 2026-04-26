-- 059_tableros_fisicos_libres.sql
-- Capa 24.1 — Tableros físicos editables sin depender de referencias_tablero.
--
-- CAMBIO DE BD
-- - tableros_fisicos:
--     · referencia_tablero_id pasa a NULLABLE (antes era NOT NULL)
--     · descripcion TEXT
--     · material_tipo TEXT (libre, ej: 'aglomerado', 'dm', 'madera_natural'...)
--     · grosor_mm INTEGER (alternativa a la referencia para tableros sin SKU)
-- - tipos_material_tablero: catálogo abierto de tipos comunes (sólo sugerencias).
-- - Riesgo: BAJO. Aditivo. Los tableros existentes siguen funcionando.

-- Aflojar la FK a referencia_tablero_id
ALTER TABLE public.tableros_fisicos
  ALTER COLUMN referencia_tablero_id DROP NOT NULL;

-- Nuevos campos
ALTER TABLE public.tableros_fisicos
  ADD COLUMN IF NOT EXISTS descripcion    TEXT,
  ADD COLUMN IF NOT EXISTS material_tipo  TEXT,
  ADD COLUMN IF NOT EXISTS grosor_mm      INTEGER CHECK (grosor_mm IS NULL OR grosor_mm > 0);

COMMENT ON COLUMN public.tableros_fisicos.descripcion   IS 'Descripción libre del tablero (ej: "Roble Egger H1146" o referencia interna).';
COMMENT ON COLUMN public.tableros_fisicos.material_tipo IS 'Tipo de material en texto libre. Sugerencias en public.tipos_material_tablero.';
COMMENT ON COLUMN public.tableros_fisicos.grosor_mm     IS 'Grosor del tablero en mm. Alternativa a la referencia cuando el tablero no está catalogado.';

-- Catálogo de sugerencias para material_tipo. Empresa-agnostic (compartido).
CREATE TABLE IF NOT EXISTS public.tipos_material_tablero (
  slug      TEXT PRIMARY KEY,
  nombre    TEXT NOT NULL,
  descripcion TEXT
);

INSERT INTO public.tipos_material_tablero (slug, nombre, descripcion) VALUES
  ('aglomerado',    'Aglomerado / Conglomerado', 'Tablero de partículas. El más común en cocinas y armarios económicos.'),
  ('aglomerado_hidrofugo', 'Aglomerado hidrófugo', 'Aglomerado tratado para zonas húmedas (baños, fregaderos).'),
  ('dm',            'DM / MDF',                  'Fibra de densidad media. Lacable, sin veta.'),
  ('mdf_hidrofugo', 'MDF hidrófugo',             'MDF tratado para humedad.'),
  ('contrachapado', 'Contrachapado',             'Láminas cruzadas. Mayor resistencia mecánica.'),
  ('madera_natural','Madera maciza natural',     'Roble, haya, pino, nogal... maciza sin chapado.'),
  ('chapa_natural', 'Chapado de madera natural', 'Soporte (DM/aglomerado) con chapa fina de madera natural.'),
  ('melamina',      'Melamina',                  'Aglomerado o DM con recubrimiento melamínico decorativo.'),
  ('hpl',           'HPL / Compacto',            'Laminado de alta presión. Muy resistente.'),
  ('polyboard',     'Polyboard / OSB',           'Tablero de virutas orientadas.'),
  ('contrachapado_marino', 'Contrachapado marino','Resistente a la humedad permanente.'),
  ('listones',      'Listones / alma hueca',     'Estructura ligera para puertas o paneles grandes.')
ON CONFLICT (slug) DO NOTHING;

-- Nadie escribe esta tabla, todos pueden leerla.
ALTER TABLE public.tipos_material_tablero ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tipos_material_tablero_select ON public.tipos_material_tablero;
CREATE POLICY tipos_material_tablero_select ON public.tipos_material_tablero
  FOR SELECT TO authenticated USING (TRUE);

COMMENT ON TABLE public.tipos_material_tablero IS
  'Catálogo de tipos de material de tablero (sugerencias). Mario puede escribir cualquier valor libre en tableros_fisicos.material_tipo.';
