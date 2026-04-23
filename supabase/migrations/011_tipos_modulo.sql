-- 011_tipos_modulo.sql
-- Capa 3: plantillas paramétricas de módulos + piezas + herrajes asociados.
-- Las fórmulas son estructuradas (no eval): pieza.dim = modulo[fuente] + ajuste_mm + ajuste_grosores*grosor_tablero_mm.

CREATE TABLE public.tipos_modulo (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id                    UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  nombre                        TEXT NOT NULL,
  descripcion                   TEXT,
  ancho_default_mm              INTEGER NOT NULL CHECK (ancho_default_mm > 0),
  alto_default_mm               INTEGER NOT NULL CHECK (alto_default_mm > 0),
  fondo_default_mm              INTEGER NOT NULL CHECK (fondo_default_mm > 0),
  referencia_tablero_default_id UUID REFERENCES public.referencias_tablero(id) ON DELETE SET NULL,
  horas_fabricacion_default     NUMERIC(5,2) NOT NULL DEFAULT 1 CHECK (horas_fabricacion_default >= 0),
  activo                        BOOLEAN NOT NULL DEFAULT true,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX tipos_modulo_empresa_idx ON public.tipos_modulo(empresa_id);
CREATE TRIGGER tipos_modulo_touch_updated_at BEFORE UPDATE ON public.tipos_modulo
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER tipos_modulo_autofill_empresa BEFORE INSERT ON public.tipos_modulo
  FOR EACH ROW EXECUTE FUNCTION public.autofill_empresa_id();

CREATE TABLE public.tipo_modulo_piezas (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_modulo_id            UUID NOT NULL REFERENCES public.tipos_modulo(id) ON DELETE CASCADE,
  nombre                    TEXT NOT NULL,
  orden                     INTEGER NOT NULL DEFAULT 0,
  cantidad                  INTEGER NOT NULL DEFAULT 1 CHECK (cantidad > 0),

  fuente_largo              TEXT NOT NULL CHECK (fuente_largo IN ('ancho','alto','fondo','fijo')),
  ajuste_largo_mm           INTEGER NOT NULL DEFAULT 0,
  ajuste_largo_grosores     INTEGER NOT NULL DEFAULT 0,
  valor_largo_fijo_mm       INTEGER CHECK (valor_largo_fijo_mm IS NULL OR valor_largo_fijo_mm > 0),

  fuente_ancho              TEXT NOT NULL CHECK (fuente_ancho IN ('ancho','alto','fondo','fijo')),
  ajuste_ancho_mm           INTEGER NOT NULL DEFAULT 0,
  ajuste_ancho_grosores     INTEGER NOT NULL DEFAULT 0,
  valor_ancho_fijo_mm       INTEGER CHECK (valor_ancho_fijo_mm IS NULL OR valor_ancho_fijo_mm > 0),

  referencia_tablero_id     UUID REFERENCES public.referencias_tablero(id) ON DELETE SET NULL,
  canto_id                  UUID REFERENCES public.cantos(id) ON DELETE SET NULL,
  lados_con_canto           TEXT NOT NULL DEFAULT 'ninguno'
                             CHECK (lados_con_canto IN ('ninguno','1','2_opuestos','2_contiguos','3','4')),
  respeta_veta_override     BOOLEAN,
  notas                     TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT largo_fijo_consistente
    CHECK ((fuente_largo = 'fijo') = (valor_largo_fijo_mm IS NOT NULL)),
  CONSTRAINT ancho_fijo_consistente
    CHECK ((fuente_ancho = 'fijo') = (valor_ancho_fijo_mm IS NOT NULL))
);
CREATE INDEX tipo_modulo_piezas_tipo_idx ON public.tipo_modulo_piezas(tipo_modulo_id);
CREATE TRIGGER tipo_modulo_piezas_touch_updated_at BEFORE UPDATE ON public.tipo_modulo_piezas
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.tipo_modulo_herrajes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_modulo_id  UUID NOT NULL REFERENCES public.tipos_modulo(id) ON DELETE CASCADE,
  herraje_id      UUID NOT NULL REFERENCES public.herrajes(id) ON DELETE RESTRICT,
  cantidad        INTEGER NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  notas           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tipo_modulo_id, herraje_id)
);
CREATE INDEX tipo_modulo_herrajes_tipo_idx ON public.tipo_modulo_herrajes(tipo_modulo_id);

COMMENT ON TABLE public.tipos_modulo IS 'Plantillas paramétricas de módulos (cajonera, colgador...).';
COMMENT ON TABLE public.tipo_modulo_piezas IS 'Fórmulas: pieza.dim = modulo[fuente] + ajuste_mm + ajuste_grosores*grosor_tablero.';
COMMENT ON TABLE public.tipo_modulo_herrajes IS 'Herrajes estándar del tipo (ej: 3 guías + 3 tiradores en cajonera 3 cajones).';
