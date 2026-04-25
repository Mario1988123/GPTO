-- 044_clientes_ampliados.sql
-- Capa 22 — Clientes con apellidos, empresa y personas de contacto.
--
-- CAMBIO DE BD
-- - Qué cambia: añade apellido1 / apellido2 / es_empresa / contacto_* a la tabla clientes.
-- - Por qué: en carpintería el cliente es casi siempre un particular (matrimonio con 2 contactos)
--   o una empresa con una persona física de referencia. El campo "nombre" actual no distingue.
-- - Tablas afectadas: public.clientes (aditivo).
-- - Migración (SQL): la de abajo.
-- - Rollback (SQL): ALTER TABLE ... DROP COLUMN ... por cada columna.
-- - Riesgo: BAJO. Solo añade columnas, no renombra ni borra nada existente. La aplicación
--   seguirá funcionando con la columna `nombre` como antes hasta que el frontend consuma los
--   nuevos campos.

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS apellido1              TEXT,
  ADD COLUMN IF NOT EXISTS apellido2              TEXT,
  ADD COLUMN IF NOT EXISTS es_empresa             BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS contacto_persona       TEXT,
  ADD COLUMN IF NOT EXISTS contacto_telefono      TEXT,
  ADD COLUMN IF NOT EXISTS contacto_email         TEXT,
  ADD COLUMN IF NOT EXISTS contacto2_persona      TEXT,
  ADD COLUMN IF NOT EXISTS contacto2_telefono     TEXT,
  ADD COLUMN IF NOT EXISTS contacto2_email        TEXT;

COMMENT ON COLUMN public.clientes.apellido1   IS 'Primer apellido. Obligatorio para particulares (CHECK en capa aplicación).';
COMMENT ON COLUMN public.clientes.apellido2   IS 'Segundo apellido (opcional).';
COMMENT ON COLUMN public.clientes.es_empresa  IS 'TRUE si es una empresa. En tal caso, contacto_persona es la persona física de referencia.';
COMMENT ON COLUMN public.clientes.contacto_persona  IS 'Nombre completo de la persona de contacto principal (obligatoria si es_empresa).';
COMMENT ON COLUMN public.clientes.contacto2_persona IS 'Contacto secundario (ej: pareja del particular, segundo responsable en empresa).';

-- Nota: la obligatoriedad condicional (apellido1 requerido si NO es_empresa, contacto_persona
-- requerido si es_empresa) se valida en la capa de aplicación. Evitamos CHECK aquí porque
-- habría que migrar los datos existentes primero y no queremos bloquearlos.
