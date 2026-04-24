-- Capa 19 — Cajones (y otros subelementos) con origen: fabricación propia o proveedor externo

ALTER TABLE modulo_subelementos
  ADD COLUMN IF NOT EXISTS es_propio BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS proveedor_nombre TEXT,
  ADD COLUMN IF NOT EXISTS precio_override_eur NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS ref_proveedor TEXT,
  ADD COLUMN IF NOT EXISTS fondo_mm INTEGER;

COMMENT ON COLUMN modulo_subelementos.es_propio IS 'TRUE = fabricación propia (se explosiona en piezas); FALSE = compra a proveedor externo, entra en presupuesto como línea suelta';
COMMENT ON COLUMN modulo_subelementos.proveedor_nombre IS 'Nombre del proveedor (solo si es_propio=false)';
COMMENT ON COLUMN modulo_subelementos.precio_override_eur IS 'Precio unitario en euros cuando es_propio=false; si null se deja 0 para revisar';
COMMENT ON COLUMN modulo_subelementos.ref_proveedor IS 'Referencia / código del proveedor del subelemento';
COMMENT ON COLUMN modulo_subelementos.fondo_mm IS 'Fondo específico del subelemento (p.ej. cajón con fondo menor que el módulo). NULL = usar fondo del módulo';
