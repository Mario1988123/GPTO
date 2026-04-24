-- Capa 14 — Subelementos internos del módulo
-- Permite dividir un módulo en cajones/puertas/baldas/barras/LEDs/espejos/etc. con tamaños independientes

CREATE TABLE IF NOT EXISTS modulo_subelementos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  modulo_id UUID NOT NULL REFERENCES modulos_armario(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'cajon',
    'balda_fija',
    'balda_regulable',
    'puerta_abatible',
    'puerta_corredera',
    'puerta_plegable',
    'barra_colgar',
    'hueco_abierto',
    'tapeta_ciega',
    'espejo',
    'led_rebaje',
    'zapatero',
    'cesto_extraible',
    'corbatero',
    'joyero',
    'portapantalones',
    'canaleta_tirador'
  )),
  -- Orden dentro del módulo (de abajo hacia arriba para horizontales; de izquierda a derecha para verticales)
  orden INTEGER NOT NULL DEFAULT 0,
  -- Dimensiones. Si NULL → hereda del hueco disponible en el módulo
  alto_mm INTEGER CHECK (alto_mm IS NULL OR alto_mm BETWEEN 10 AND 3000),
  ancho_mm INTEGER CHECK (ancho_mm IS NULL OR ancho_mm BETWEEN 10 AND 3000),
  -- Offset relativo al origen del módulo (útil para LEDs en canto o tiradores)
  offset_x_mm INTEGER NOT NULL DEFAULT 0,
  offset_y_mm INTEGER NOT NULL DEFAULT 0,
  offset_z_mm INTEGER NOT NULL DEFAULT 0,
  -- Config específica: tirador, acabado, color LED, intensidad, referencia_cajon, etc.
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  etiqueta TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_modulo_subelementos_modulo ON modulo_subelementos(modulo_id, orden);
CREATE INDEX IF NOT EXISTS idx_modulo_subelementos_empresa ON modulo_subelementos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_modulo_subelementos_tipo ON modulo_subelementos(tipo);

CREATE OR REPLACE TRIGGER trg_modulo_subelementos_updated
BEFORE UPDATE ON modulo_subelementos
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE OR REPLACE TRIGGER trg_modulo_subelementos_autofill
BEFORE INSERT ON modulo_subelementos
FOR EACH ROW EXECUTE FUNCTION autofill_empresa_id();

ALTER TABLE modulo_subelementos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ms_select ON modulo_subelementos;
CREATE POLICY ms_select ON modulo_subelementos FOR SELECT
  TO authenticated USING (empresa_id = current_empresa_id());

DROP POLICY IF EXISTS ms_insert ON modulo_subelementos;
CREATE POLICY ms_insert ON modulo_subelementos FOR INSERT
  TO authenticated WITH CHECK (
    (current_rol() IN ('admin', 'operario')) AND
    (empresa_id IS NULL OR empresa_id = current_empresa_id())
  );

DROP POLICY IF EXISTS ms_update ON modulo_subelementos;
CREATE POLICY ms_update ON modulo_subelementos FOR UPDATE
  TO authenticated USING (empresa_id = current_empresa_id())
  WITH CHECK (empresa_id = current_empresa_id());

DROP POLICY IF EXISTS ms_delete ON modulo_subelementos;
CREATE POLICY ms_delete ON modulo_subelementos FOR DELETE
  TO authenticated USING (empresa_id = current_empresa_id() AND current_rol() IN ('admin', 'operario'));

-- Lectura pública anon por cadena para portal cliente y traza QR
DROP POLICY IF EXISTS ms_select_anon ON modulo_subelementos;
CREATE POLICY ms_select_anon ON modulo_subelementos FOR SELECT
  TO anon USING (
    EXISTS (
      SELECT 1 FROM modulos_armario ma
      JOIN armarios a ON a.id = ma.armario_id
      JOIN proyectos p ON p.id = a.proyecto_id
      WHERE ma.id = modulo_subelementos.modulo_id
    )
  );
