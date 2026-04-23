-- 013_proyectos.sql
-- Capa 4.1: proyectos + armarios + modulos_armario.
-- Jerarquía: cliente → proyecto → armarios → módulos.
-- Estados del proyecto fijos vía CHECK.

CREATE TABLE public.proyectos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  cliente_id  UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  nombre      TEXT NOT NULL,
  estado      TEXT NOT NULL DEFAULT 'borrador'
              CHECK (estado IN ('borrador','presupuestado','confirmado','en_fabricacion','entregado','cancelado')),
  notas       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX proyectos_empresa_idx ON public.proyectos(empresa_id);
CREATE INDEX proyectos_cliente_idx ON public.proyectos(cliente_id);
CREATE INDEX proyectos_estado_idx  ON public.proyectos(empresa_id, estado);
CREATE TRIGGER proyectos_touch_updated_at BEFORE UPDATE ON public.proyectos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER proyectos_autofill_empresa BEFORE INSERT ON public.proyectos
  FOR EACH ROW EXECUTE FUNCTION public.autofill_empresa_id();
COMMENT ON TABLE public.proyectos IS
  'Proyecto: agrupa el trabajo para un cliente. Contiene 1+ armarios.';

CREATE TABLE public.armarios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id     UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL DEFAULT 'Armario',
  ancho_total_mm  INTEGER NOT NULL CHECK (ancho_total_mm > 0),
  alto_total_mm   INTEGER NOT NULL CHECK (alto_total_mm > 0),
  fondo_mm        INTEGER NOT NULL CHECK (fondo_mm > 0),
  orden           INTEGER NOT NULL DEFAULT 0,
  notas           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX armarios_proyecto_idx ON public.armarios(proyecto_id, orden);
CREATE TRIGGER armarios_touch_updated_at BEFORE UPDATE ON public.armarios
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
COMMENT ON TABLE public.armarios IS
  'Armario físico dentro de un proyecto. ancho_total_mm es el hueco disponible en el muro.';

CREATE TABLE public.modulos_armario (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  armario_id             UUID NOT NULL REFERENCES public.armarios(id) ON DELETE CASCADE,
  tipo_modulo_id         UUID NOT NULL REFERENCES public.tipos_modulo(id) ON DELETE RESTRICT,
  nombre_override        TEXT,
  orden                  INTEGER NOT NULL DEFAULT 0,
  ancho_mm               INTEGER NOT NULL CHECK (ancho_mm > 0),
  alto_mm                INTEGER NOT NULL CHECK (alto_mm > 0),
  fondo_mm               INTEGER NOT NULL CHECK (fondo_mm > 0),
  referencia_tablero_id  UUID REFERENCES public.referencias_tablero(id) ON DELETE SET NULL,
  notas                  TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX modulos_armario_armario_idx ON public.modulos_armario(armario_id, orden);
CREATE INDEX modulos_armario_tipo_idx    ON public.modulos_armario(tipo_modulo_id);
CREATE TRIGGER modulos_armario_touch_updated_at BEFORE UPDATE ON public.modulos_armario
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
COMMENT ON TABLE public.modulos_armario IS
  'Instancia de un tipo_modulo dentro de un armario con medidas reales (override de defaults).';
