-- Capa 19 — Grosores configurables de tableros y trasera por módulo + separación cajones

ALTER TABLE modulos_armario
  ADD COLUMN IF NOT EXISTS tableros_grosor_mm INTEGER,
  ADD COLUMN IF NOT EXISTS trasera_grosor_mm INTEGER,
  ADD COLUMN IF NOT EXISTS separacion_cajones_mm INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS mostrar_puertas BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN modulos_armario.tableros_grosor_mm IS 'Grosor en mm de los 4 tableros principales (suelo, techo, laterales). NULL = usar grosor de referencia_tablero_id';
COMMENT ON COLUMN modulos_armario.trasera_grosor_mm IS 'Grosor específico de la trasera. NULL = usar config_empresa.trasera_grosor_mm (default 10 mm)';
COMMENT ON COLUMN modulos_armario.separacion_cajones_mm IS 'Hueco entre frentes de cajón consecutivos, en mm. Default 2 mm';
COMMENT ON COLUMN modulos_armario.mostrar_puertas IS 'Si FALSE, el 3D renderiza sin puertas para ver el interior';
