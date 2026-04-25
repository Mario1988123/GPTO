-- 050_foto_url_catalogos.sql
-- Capa 22 — Miniaturas de fotografía en los catálogos para los selectores con modal.
--
-- CAMBIO DE BD
-- - Qué cambia: añade columna foto_url TEXT a 8 tablas de catálogo.
-- - Por qué: Mario quiere ver miniatura de la fotografía cuando elige un material,
--   acabado, tirador, puerta de paso, suelo, rodapié, etc. Es URL libre (puede ser
--   Supabase Storage o externa).
-- - Tablas afectadas: acabados, materiales, herrajes, referencias_tablero,
--   puertas_paso_catalogo, suelos_catalogo, aislantes_catalogo, rodapies_catalogo.
-- - Migración (SQL): la de abajo.
-- - Rollback: ALTER TABLE ... DROP COLUMN foto_url por cada tabla.
-- - Riesgo: BAJO. Aditivo y nullable.

ALTER TABLE public.acabados                ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE public.materiales              ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE public.herrajes                ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE public.referencias_tablero     ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE public.puertas_paso_catalogo   ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE public.suelos_catalogo         ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE public.aislantes_catalogo      ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE public.rodapies_catalogo       ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE public.tipos_modulo            ADD COLUMN IF NOT EXISTS foto_url TEXT;

COMMENT ON COLUMN public.acabados.foto_url             IS 'URL de la fotografía del acabado (color/textura).';
COMMENT ON COLUMN public.materiales.foto_url           IS 'URL de la fotografía del material.';
COMMENT ON COLUMN public.herrajes.foto_url             IS 'URL de la fotografía del herraje (tirador, bisagra...).';
COMMENT ON COLUMN public.referencias_tablero.foto_url  IS 'URL de la fotografía de la referencia (tablero+acabado).';
COMMENT ON COLUMN public.puertas_paso_catalogo.foto_url IS 'URL de la fotografía de la puerta.';
COMMENT ON COLUMN public.suelos_catalogo.foto_url      IS 'URL de la fotografía del suelo.';
COMMENT ON COLUMN public.aislantes_catalogo.foto_url   IS 'URL de la fotografía del aislante.';
COMMENT ON COLUMN public.rodapies_catalogo.foto_url    IS 'URL de la fotografía del rodapié.';
COMMENT ON COLUMN public.tipos_modulo.foto_url         IS 'URL de la fotografía del tipo de módulo (renderizado o producto).';
