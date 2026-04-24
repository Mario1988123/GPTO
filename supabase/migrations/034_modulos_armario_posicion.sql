-- Capa 14 — Posición 2D del módulo dentro del armario (X horizontal, Y vertical) + LED
-- Permite mover módulos libremente en lugar del layout auto-columnar

ALTER TABLE modulos_armario
  ADD COLUMN IF NOT EXISTS posicion_x_mm INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS posicion_y_mm INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tiene_led_rebaje BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS led_color_hex TEXT,
  ADD COLUMN IF NOT EXISTS led_intensidad_lm_m INTEGER;

-- Checks (reemplazables con idempotencia)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'modulos_armario_led_color_hex_check'
  ) THEN
    ALTER TABLE modulos_armario
      ADD CONSTRAINT modulos_armario_led_color_hex_check
      CHECK (led_color_hex IS NULL OR led_color_hex ~ '^#[0-9a-fA-F]{6}$');
  END IF;
END $$;

COMMENT ON COLUMN modulos_armario.posicion_x_mm IS 'Offset X (horizontal) desde el borde izquierdo interior del armario';
COMMENT ON COLUMN modulos_armario.posicion_y_mm IS 'Offset Y (vertical) desde el suelo interior del armario';
COMMENT ON COLUMN modulos_armario.tiene_led_rebaje IS 'True si el módulo lleva rebaje avellanado para tira LED perimetral';
