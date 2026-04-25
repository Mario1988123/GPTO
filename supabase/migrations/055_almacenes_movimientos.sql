-- 055_almacenes_movimientos.sql
-- Capa 24 — Almacenes, furgonetas, movimientos de stock, tableros físicos,
-- gastos por proyecto y entregas parciales del pedido de corte.
--
-- CAMBIO DE BD
-- - Tablas nuevas:
--     almacenes, furgonetas, movimientos_stock, tableros_fisicos,
--     pedido_corte_entregas, gastos_proyecto.
-- - Ampliaciones:
--     · proveedores: hace_corte BOOLEAN, precio_m2_eur, precio_corte_ml_eur,
--                    precio_corte_minuto_eur, precio_canto_ml_eur.
--     · piezas_modulo: ubicacion_actual_id (FK a almacen) y ubicacion_tipo
--                      ('almacen','furgoneta','obra','proveedor','sin_ubicar').
--     · pedidos_tableros_corte: tipo_recogida ('recogida'|'envio') + direccion.
-- - Trigger: al insertar movimiento_stock, actualiza la ubicación actual de
--   la pieza/tablero automáticamente.
-- - Riesgo: BAJO. Aditivo. Las piezas existentes quedan con ubicacion_tipo='sin_ubicar'.

-- ================== AMPLIAR PROVEEDORES ==================
ALTER TABLE public.proveedores
  ADD COLUMN IF NOT EXISTS hace_corte                BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS precio_m2_eur             NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS precio_corte_ml_eur       NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS precio_corte_minuto_eur   NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS precio_canto_ml_eur       NUMERIC(10,4);
COMMENT ON COLUMN public.proveedores.hace_corte             IS 'TRUE si este proveedor corta tableros para nosotros.';
COMMENT ON COLUMN public.proveedores.precio_m2_eur          IS 'Precio €/m² del tablero base (cuando lo compramos cortado).';
COMMENT ON COLUMN public.proveedores.precio_corte_ml_eur    IS 'Precio €/ml de corte recto.';
COMMENT ON COLUMN public.proveedores.precio_corte_minuto_eur IS 'Precio €/minuto de máquina de corte (alternativa a €/ml).';
COMMENT ON COLUMN public.proveedores.precio_canto_ml_eur    IS 'Precio €/ml de cantear.';

-- ================== ALMACENES ==================
CREATE TABLE IF NOT EXISTS public.almacenes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  nombre        TEXT NOT NULL,
  direccion     TEXT,
  notas         TEXT,
  es_principal  BOOLEAN NOT NULL DEFAULT FALSE,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS almacenes_empresa_idx ON public.almacenes(empresa_id);
DROP TRIGGER IF EXISTS almacenes_touch_updated_at ON public.almacenes;
CREATE TRIGGER almacenes_touch_updated_at BEFORE UPDATE ON public.almacenes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS almacenes_autofill_empresa ON public.almacenes;
CREATE TRIGGER almacenes_autofill_empresa BEFORE INSERT ON public.almacenes
  FOR EACH ROW EXECUTE FUNCTION public.autofill_empresa_id();

-- ================== FURGONETAS ==================
CREATE TABLE IF NOT EXISTS public.furgonetas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  nombre        TEXT NOT NULL,
  matricula     TEXT,
  modelo        TEXT,
  conductor_usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  notas         TEXT,
  activa        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS furgonetas_empresa_idx ON public.furgonetas(empresa_id);
DROP TRIGGER IF EXISTS furgonetas_touch_updated_at ON public.furgonetas;
CREATE TRIGGER furgonetas_touch_updated_at BEFORE UPDATE ON public.furgonetas
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS furgonetas_autofill_empresa ON public.furgonetas;
CREATE TRIGGER furgonetas_autofill_empresa BEFORE INSERT ON public.furgonetas
  FOR EACH ROW EXECUTE FUNCTION public.autofill_empresa_id();

-- ================== TABLEROS FÍSICOS ==================
-- Cuando compramos tableros enteros (sin cortar) y los cortamos nosotros.
-- Cada fila = un tablero físico con su ID propio. Su consumo se traza vía
-- piezas_modulo.tablero_fisico_id (añadido también).
CREATE TABLE IF NOT EXISTS public.tableros_fisicos (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id              UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  referencia_tablero_id   UUID NOT NULL REFERENCES public.referencias_tablero(id) ON DELETE RESTRICT,
  ancho_mm                INTEGER NOT NULL CHECK (ancho_mm > 0),
  alto_mm                 INTEGER NOT NULL CHECK (alto_mm > 0),
  proveedor_id            UUID REFERENCES public.proveedores(id) ON DELETE SET NULL,
  pedido_corte_id         UUID,                  -- FK definida abajo (circular)
  ubicacion_almacen_id    UUID REFERENCES public.almacenes(id) ON DELETE SET NULL,
  ubicacion_furgoneta_id  UUID REFERENCES public.furgonetas(id) ON DELETE SET NULL,
  estado                  TEXT NOT NULL DEFAULT 'entero' CHECK (estado IN ('entero','en_corte','consumido','recorte','dañado','devuelto')),
  coste_eur               NUMERIC(10,2),
  notas                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tf_empresa_idx     ON public.tableros_fisicos(empresa_id);
CREATE INDEX IF NOT EXISTS tf_referencia_idx  ON public.tableros_fisicos(referencia_tablero_id);
CREATE INDEX IF NOT EXISTS tf_estado_idx      ON public.tableros_fisicos(empresa_id, estado);
DROP TRIGGER IF EXISTS tf_touch_updated_at ON public.tableros_fisicos;
CREATE TRIGGER tf_touch_updated_at BEFORE UPDATE ON public.tableros_fisicos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS tf_autofill_empresa ON public.tableros_fisicos;
CREATE TRIGGER tf_autofill_empresa BEFORE INSERT ON public.tableros_fisicos
  FOR EACH ROW EXECUTE FUNCTION public.autofill_empresa_id();

-- ================== UBICACIÓN DE PIEZAS ==================
-- Ampliar piezas_modulo con campos de ubicación actual (cache para queries rápidas;
-- la fuente de verdad cronológica es movimientos_stock).
ALTER TABLE public.piezas_modulo
  ADD COLUMN IF NOT EXISTS ubicacion_tipo         TEXT NOT NULL DEFAULT 'sin_ubicar' CHECK (ubicacion_tipo IN ('sin_ubicar','proveedor','almacen','furgoneta','obra','consumida')),
  ADD COLUMN IF NOT EXISTS ubicacion_almacen_id   UUID REFERENCES public.almacenes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ubicacion_furgoneta_id UUID REFERENCES public.furgonetas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ubicacion_proveedor_id UUID REFERENCES public.proveedores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tablero_fisico_id      UUID REFERENCES public.tableros_fisicos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ubicacion_actualizada  TIMESTAMPTZ;

-- ================== ENTREGAS PARCIALES PEDIDO DE CORTE ==================
-- Un pedido grande se puede dividir en N albaranes parciales: cada uno con su
-- fecha, proveedor confirma "te entrego estas piezas hoy".
ALTER TABLE public.pedidos_tableros_corte
  ADD COLUMN IF NOT EXISTS modo_recogida   TEXT NOT NULL DEFAULT 'recogida' CHECK (modo_recogida IN ('recogida','envio')),
  ADD COLUMN IF NOT EXISTS direccion_envio TEXT;

CREATE TABLE IF NOT EXISTS public.pedido_corte_entregas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id          UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  pedido_id           UUID NOT NULL REFERENCES public.pedidos_tableros_corte(id) ON DELETE CASCADE,
  numero              INTEGER NOT NULL DEFAULT 1,                   -- 1ª entrega, 2ª entrega...
  fecha_prevista      DATE,
  fecha_entregada     DATE,
  modo_recogida       TEXT NOT NULL DEFAULT 'recogida' CHECK (modo_recogida IN ('recogida','envio')),
  direccion_envio     TEXT,
  destino_almacen_id  UUID REFERENCES public.almacenes(id) ON DELETE SET NULL,
  destino_furgoneta_id UUID REFERENCES public.furgonetas(id) ON DELETE SET NULL,
  destino_obra        BOOLEAN NOT NULL DEFAULT FALSE,
  estado              TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','confirmada','recibida','incidencia')),
  coste_eur           NUMERIC(10,2),
  notas               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pce_pedido_idx   ON public.pedido_corte_entregas(pedido_id, numero);
CREATE INDEX IF NOT EXISTS pce_empresa_idx  ON public.pedido_corte_entregas(empresa_id);
DROP TRIGGER IF EXISTS pce_touch_updated_at ON public.pedido_corte_entregas;
CREATE TRIGGER pce_touch_updated_at BEFORE UPDATE ON public.pedido_corte_entregas
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS pce_autofill_empresa ON public.pedido_corte_entregas;
CREATE TRIGGER pce_autofill_empresa BEFORE INSERT ON public.pedido_corte_entregas
  FOR EACH ROW EXECUTE FUNCTION public.autofill_empresa_id();

-- Asignación de piezas a entregas parciales (qué piezas vienen en qué entrega).
CREATE TABLE IF NOT EXISTS public.pedido_corte_entrega_piezas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  entrega_id      UUID NOT NULL REFERENCES public.pedido_corte_entregas(id) ON DELETE CASCADE,
  pieza_modulo_id UUID NOT NULL REFERENCES public.piezas_modulo(id) ON DELETE CASCADE,
  ocurrencia      INTEGER NOT NULL DEFAULT 1,
  confirmada      BOOLEAN NOT NULL DEFAULT FALSE,
  con_incidencia  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entrega_id, pieza_modulo_id, ocurrencia)
);
CREATE INDEX IF NOT EXISTS pcep_entrega_idx ON public.pedido_corte_entrega_piezas(entrega_id);
DROP TRIGGER IF EXISTS pcep_autofill_empresa ON public.pedido_corte_entrega_piezas;
CREATE TRIGGER pcep_autofill_empresa BEFORE INSERT ON public.pedido_corte_entrega_piezas
  FOR EACH ROW EXECUTE FUNCTION public.autofill_empresa_id();

-- FK circular: tableros_fisicos.pedido_corte_id → pedidos_tableros_corte
DO $do_fk$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tableros_fisicos_pedido_corte_id_fkey'
  ) THEN
    ALTER TABLE public.tableros_fisicos
      ADD CONSTRAINT tableros_fisicos_pedido_corte_id_fkey
      FOREIGN KEY (pedido_corte_id) REFERENCES public.pedidos_tableros_corte(id) ON DELETE SET NULL;
  END IF;
END;
$do_fk$;

-- ================== MOVIMIENTOS DE STOCK ==================
-- Bitácora cronológica. Cada movimiento desplaza una pieza, tablero, herraje o
-- recorte de una ubicación a otra.
CREATE TABLE IF NOT EXISTS public.movimientos_stock (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id            UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,

  -- Qué se mueve (uno de estos)
  pieza_modulo_id       UUID REFERENCES public.piezas_modulo(id) ON DELETE CASCADE,
  ocurrencia            INTEGER,
  tablero_fisico_id     UUID REFERENCES public.tableros_fisicos(id) ON DELETE CASCADE,
  herraje_id            UUID REFERENCES public.herrajes(id) ON DELETE CASCADE,
  recorte_id            UUID REFERENCES public.recortes(id) ON DELETE CASCADE,
  cantidad              NUMERIC(10,3) NOT NULL DEFAULT 1,

  -- Origen (uno de estos)
  origen_tipo           TEXT NOT NULL CHECK (origen_tipo IN ('proveedor','almacen','furgoneta','obra','sin_ubicar')),
  origen_almacen_id     UUID REFERENCES public.almacenes(id) ON DELETE SET NULL,
  origen_furgoneta_id   UUID REFERENCES public.furgonetas(id) ON DELETE SET NULL,
  origen_proveedor_id   UUID REFERENCES public.proveedores(id) ON DELETE SET NULL,
  origen_proyecto_id    UUID REFERENCES public.proyectos(id) ON DELETE SET NULL,

  -- Destino (uno de estos)
  destino_tipo          TEXT NOT NULL CHECK (destino_tipo IN ('almacen','furgoneta','obra','consumida')),
  destino_almacen_id    UUID REFERENCES public.almacenes(id) ON DELETE SET NULL,
  destino_furgoneta_id  UUID REFERENCES public.furgonetas(id) ON DELETE SET NULL,
  destino_proyecto_id   UUID REFERENCES public.proyectos(id) ON DELETE SET NULL,

  motivo                TEXT,
  registrado_por        UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  fecha                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ms_empresa_idx  ON public.movimientos_stock(empresa_id, fecha DESC);
CREATE INDEX IF NOT EXISTS ms_pieza_idx    ON public.movimientos_stock(pieza_modulo_id);
CREATE INDEX IF NOT EXISTS ms_tablero_idx  ON public.movimientos_stock(tablero_fisico_id);
DROP TRIGGER IF EXISTS ms_autofill_empresa ON public.movimientos_stock;
CREATE TRIGGER ms_autofill_empresa BEFORE INSERT ON public.movimientos_stock
  FOR EACH ROW EXECUTE FUNCTION public.autofill_empresa_id();

-- Trigger: al insertar un movimiento, actualiza la ubicación actual de la pieza/tablero.
CREATE OR REPLACE FUNCTION public.aplicar_movimiento_stock() RETURNS TRIGGER LANGUAGE plpgsql AS $func$
BEGIN
  IF NEW.pieza_modulo_id IS NOT NULL THEN
    UPDATE public.piezas_modulo SET
      ubicacion_tipo         = NEW.destino_tipo,
      ubicacion_almacen_id   = NEW.destino_almacen_id,
      ubicacion_furgoneta_id = NEW.destino_furgoneta_id,
      ubicacion_proveedor_id = NULL,
      ubicacion_actualizada  = NEW.fecha
    WHERE id = NEW.pieza_modulo_id;
  END IF;
  IF NEW.tablero_fisico_id IS NOT NULL THEN
    UPDATE public.tableros_fisicos SET
      ubicacion_almacen_id    = NEW.destino_almacen_id,
      ubicacion_furgoneta_id  = NEW.destino_furgoneta_id,
      updated_at              = NEW.fecha
    WHERE id = NEW.tablero_fisico_id;
  END IF;
  RETURN NEW;
END;
$func$;
DROP TRIGGER IF EXISTS ms_aplicar ON public.movimientos_stock;
CREATE TRIGGER ms_aplicar AFTER INSERT ON public.movimientos_stock
  FOR EACH ROW EXECUTE FUNCTION public.aplicar_movimiento_stock();

-- ================== GASTOS DEL PROYECTO ==================
CREATE TABLE IF NOT EXISTS public.gastos_proyecto (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  proyecto_id     UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  categoria       TEXT NOT NULL CHECK (categoria IN (
                    'madera','herraje','corte','canto','transporte','mano_obra_externa',
                    'subcontrata','suelos','puertas_paso','rodapies','otros'
                  )),
  descripcion     TEXT NOT NULL,
  importe_eur     NUMERIC(12,2) NOT NULL CHECK (importe_eur >= 0),
  proveedor_id    UUID REFERENCES public.proveedores(id) ON DELETE SET NULL,
  pedido_corte_id UUID REFERENCES public.pedidos_tableros_corte(id) ON DELETE SET NULL,
  fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
  factura_recibida_url TEXT,
  notas           TEXT,
  registrado_por  UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gp_proyecto_idx   ON public.gastos_proyecto(proyecto_id, fecha DESC);
CREATE INDEX IF NOT EXISTS gp_empresa_idx    ON public.gastos_proyecto(empresa_id);
CREATE INDEX IF NOT EXISTS gp_categoria_idx  ON public.gastos_proyecto(empresa_id, categoria);
DROP TRIGGER IF EXISTS gp_touch_updated_at ON public.gastos_proyecto;
CREATE TRIGGER gp_touch_updated_at BEFORE UPDATE ON public.gastos_proyecto
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS gp_autofill_empresa ON public.gastos_proyecto;
CREATE TRIGGER gp_autofill_empresa BEFORE INSERT ON public.gastos_proyecto
  FOR EACH ROW EXECUTE FUNCTION public.autofill_empresa_id();

-- ================== RLS ==================
ALTER TABLE public.almacenes                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.furgonetas                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tableros_fisicos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_stock             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_corte_entregas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_corte_entrega_piezas   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos_proyecto               ENABLE ROW LEVEL SECURITY;

-- Política estándar: ven y editan lo de su empresa.
DROP POLICY IF EXISTS almacenes_all ON public.almacenes;
CREATE POLICY almacenes_all ON public.almacenes FOR ALL TO authenticated USING (empresa_id = public.current_empresa_id()) WITH CHECK (empresa_id = public.current_empresa_id());

DROP POLICY IF EXISTS furgonetas_all ON public.furgonetas;
CREATE POLICY furgonetas_all ON public.furgonetas FOR ALL TO authenticated USING (empresa_id = public.current_empresa_id()) WITH CHECK (empresa_id = public.current_empresa_id());

DROP POLICY IF EXISTS tableros_fisicos_all ON public.tableros_fisicos;
CREATE POLICY tableros_fisicos_all ON public.tableros_fisicos FOR ALL TO authenticated USING (empresa_id = public.current_empresa_id()) WITH CHECK (empresa_id = public.current_empresa_id());

DROP POLICY IF EXISTS movimientos_stock_all ON public.movimientos_stock;
CREATE POLICY movimientos_stock_all ON public.movimientos_stock FOR ALL TO authenticated USING (empresa_id = public.current_empresa_id()) WITH CHECK (empresa_id = public.current_empresa_id());

DROP POLICY IF EXISTS pedido_corte_entregas_all ON public.pedido_corte_entregas;
CREATE POLICY pedido_corte_entregas_all ON public.pedido_corte_entregas FOR ALL TO authenticated USING (empresa_id = public.current_empresa_id()) WITH CHECK (empresa_id = public.current_empresa_id());

DROP POLICY IF EXISTS pedido_corte_entrega_piezas_all ON public.pedido_corte_entrega_piezas;
CREATE POLICY pedido_corte_entrega_piezas_all ON public.pedido_corte_entrega_piezas FOR ALL TO authenticated USING (empresa_id = public.current_empresa_id()) WITH CHECK (empresa_id = public.current_empresa_id());

DROP POLICY IF EXISTS gastos_proyecto_all ON public.gastos_proyecto;
CREATE POLICY gastos_proyecto_all ON public.gastos_proyecto FOR ALL TO authenticated USING (empresa_id = public.current_empresa_id()) WITH CHECK (empresa_id = public.current_empresa_id());
