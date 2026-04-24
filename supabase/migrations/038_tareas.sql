-- Capa 17 — Tareas de planificación (Gantt)

CREATE TABLE IF NOT EXISTS tareas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  estancia_id UUID REFERENCES estancias(id) ON DELETE SET NULL,
  armario_id UUID REFERENCES armarios(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  especialidad TEXT CHECK (especialidad IS NULL OR especialidad IN ('cocina', 'muebles', 'puertas', 'ventanas', 'parquet', 'cualquiera')),
  asignado_a UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  fecha_inicio_plan DATE NOT NULL,
  fecha_fin_plan DATE NOT NULL,
  fecha_inicio_real DATE,
  fecha_fin_real DATE,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_curso', 'completada', 'bloqueada', 'cancelada')),
  orden INTEGER NOT NULL DEFAULT 0,
  color_hex TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (fecha_fin_plan >= fecha_inicio_plan),
  CHECK (fecha_fin_real IS NULL OR fecha_inicio_real IS NULL OR fecha_fin_real >= fecha_inicio_real)
);

CREATE INDEX IF NOT EXISTS idx_tareas_proyecto ON tareas(proyecto_id, orden);
CREATE INDEX IF NOT EXISTS idx_tareas_empresa ON tareas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_tareas_asignado ON tareas(asignado_a);
CREATE INDEX IF NOT EXISTS idx_tareas_estado ON tareas(estado);
CREATE INDEX IF NOT EXISTS idx_tareas_fechas ON tareas(fecha_inicio_plan, fecha_fin_plan);

CREATE OR REPLACE TRIGGER trg_tareas_updated
BEFORE UPDATE ON tareas
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE OR REPLACE TRIGGER trg_tareas_autofill
BEFORE INSERT ON tareas
FOR EACH ROW EXECUTE FUNCTION autofill_empresa_id();

-- Tabla de dependencias (finish-to-start)
CREATE TABLE IF NOT EXISTS tarea_dependencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tarea_id UUID NOT NULL REFERENCES tareas(id) ON DELETE CASCADE,
  depende_de_tarea_id UUID NOT NULL REFERENCES tareas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'finish_to_start' CHECK (tipo IN ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish')),
  lag_dias INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tarea_id, depende_de_tarea_id),
  CHECK (tarea_id <> depende_de_tarea_id)
);

CREATE INDEX IF NOT EXISTS idx_tarea_dep_tarea ON tarea_dependencias(tarea_id);
CREATE INDEX IF NOT EXISTS idx_tarea_dep_depende ON tarea_dependencias(depende_de_tarea_id);

CREATE OR REPLACE TRIGGER trg_tarea_dep_autofill
BEFORE INSERT ON tarea_dependencias
FOR EACH ROW EXECUTE FUNCTION autofill_empresa_id();

-- RLS tareas
ALTER TABLE tareas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tareas_select ON tareas;
CREATE POLICY tareas_select ON tareas FOR SELECT
  TO authenticated USING (
    empresa_id = current_empresa_id()
    -- Interiorista ve tareas de sus proyectos
    OR EXISTS (
      SELECT 1 FROM proyectos p
      WHERE p.id = tareas.proyecto_id
      AND p.interiorista_usuario_id = auth.uid()
      AND current_rol() = 'interiorista'
    )
  );

DROP POLICY IF EXISTS tareas_insert ON tareas;
CREATE POLICY tareas_insert ON tareas FOR INSERT
  TO authenticated WITH CHECK (
    current_rol() IN ('admin', 'operario', 'montador') AND
    (empresa_id IS NULL OR empresa_id = current_empresa_id())
  );

DROP POLICY IF EXISTS tareas_update ON tareas;
CREATE POLICY tareas_update ON tareas FOR UPDATE
  TO authenticated USING (empresa_id = current_empresa_id())
  WITH CHECK (empresa_id = current_empresa_id());

DROP POLICY IF EXISTS tareas_delete ON tareas;
CREATE POLICY tareas_delete ON tareas FOR DELETE
  TO authenticated USING (empresa_id = current_empresa_id() AND current_rol() IN ('admin', 'operario'));

-- RLS tarea_dependencias
ALTER TABLE tarea_dependencias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS td_select ON tarea_dependencias;
CREATE POLICY td_select ON tarea_dependencias FOR SELECT
  TO authenticated USING (
    empresa_id = current_empresa_id()
    OR EXISTS (
      SELECT 1 FROM tareas t
      JOIN proyectos p ON p.id = t.proyecto_id
      WHERE t.id = tarea_dependencias.tarea_id
      AND p.interiorista_usuario_id = auth.uid()
      AND current_rol() = 'interiorista'
    )
  );

DROP POLICY IF EXISTS td_insert ON tarea_dependencias;
CREATE POLICY td_insert ON tarea_dependencias FOR INSERT
  TO authenticated WITH CHECK (
    current_rol() IN ('admin', 'operario') AND
    (empresa_id IS NULL OR empresa_id = current_empresa_id())
  );

DROP POLICY IF EXISTS td_delete ON tarea_dependencias;
CREATE POLICY td_delete ON tarea_dependencias FOR DELETE
  TO authenticated USING (empresa_id = current_empresa_id() AND current_rol() IN ('admin', 'operario'));
