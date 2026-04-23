-- 002_empresas.sql
-- Tabla raíz del multitenant. Cada fila = un cliente del SaaS.
-- MVP: solo una fila (Carpintería MAZOR).

CREATE TABLE public.empresas (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre         TEXT NOT NULL,
  slug           TEXT NOT NULL UNIQUE,
  config_empresa JSONB NOT NULL DEFAULT jsonb_build_object(
    'tablero_ancho_cm',       244,
    'tablero_alto_cm',        122,
    'tablero_util_ancho_cm',  240,
    'tablero_util_alto_cm',   120,
    'trasera_grosor_mm',      10,
    'fondo_armario_cm',       61,
    'kerf_mm',                3,
    'iva_porcentaje',         21
  ),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX empresas_slug_idx ON public.empresas(slug);

-- Trigger genérico para updated_at (se reutilizará en todas las tablas).
-- Excepción justificada a la regla "sin plpgsql": los triggers BEFORE que
-- modifican NEW no se pueden escribir en SQL puro.
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER empresas_touch_updated_at
BEFORE UPDATE ON public.empresas
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

COMMENT ON TABLE public.empresas IS
  'Cada fila = un cliente del SaaS GPTO. MVP monocliente (Carpintería MAZOR).';
COMMENT ON COLUMN public.empresas.config_empresa IS
  'Config por defecto: tablero 244x122 util 240x120, trasera 10mm, fondo 61cm, kerf 3mm, IVA 21%.';
