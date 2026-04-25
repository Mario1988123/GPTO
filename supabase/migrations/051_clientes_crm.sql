-- 051_clientes_crm.sql
-- Capa 22 — Campos CRM para clientes: etiquetas, origen, recordatorio, foto.
--
-- CAMBIO DE BD
-- - Qué cambia: añade etiquetas (TEXT[]), origen (cómo nos conoció), foto_url
--   (avatar/logo), proximo_seguimiento (fecha de próximo contacto) a clientes.
-- - Por qué: para que la ficha del cliente funcione como CRM (filtrar VIP,
--   recordar próxima llamada, ver de dónde viene la oportunidad).
-- - Tablas afectadas: public.clientes (aditivo).
-- - Migración: la de abajo.
-- - Rollback: DROP COLUMN x4.
-- - Riesgo: BAJO. Aditivo, todo nullable.

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS etiquetas            TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS origen               TEXT,
  ADD COLUMN IF NOT EXISTS foto_url             TEXT,
  ADD COLUMN IF NOT EXISTS proximo_seguimiento  DATE;

CREATE INDEX IF NOT EXISTS clientes_etiquetas_idx ON public.clientes USING GIN (etiquetas);
CREATE INDEX IF NOT EXISTS clientes_seguimiento_idx ON public.clientes(empresa_id, proximo_seguimiento)
  WHERE proximo_seguimiento IS NOT NULL;

COMMENT ON COLUMN public.clientes.etiquetas           IS 'Etiquetas libres (VIP, recomendado por X, lead frío, etc.).';
COMMENT ON COLUMN public.clientes.origen              IS 'Cómo nos conoció: "instagram", "recomendación", "anuncio", "feria"...';
COMMENT ON COLUMN public.clientes.foto_url            IS 'Avatar / logo del cliente.';
COMMENT ON COLUMN public.clientes.proximo_seguimiento IS 'Fecha del próximo contacto previsto. Sale en el dashboard si vence pronto.';
