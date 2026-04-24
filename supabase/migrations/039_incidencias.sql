-- Capa 17 — Incidencias de retraso en proyectos

CREATE TABLE IF NOT EXISTS incidencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  tarea_id UUID REFERENCES tareas(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('retraso', 'material_pendiente', 'incidencia_montaje', 'revision_cliente', 'otro')),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  dias_impacto INTEGER NOT NULL DEFAULT 0,
  resuelta BOOLEAN NOT NULL DEFAULT FALSE,
  resuelta_at TIMESTAMPTZ,
  avisado_cliente BOOLEAN NOT NULL DEFAULT FALSE,
  avisado_cliente_at TIMESTAMPTZ,
  creada_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incidencias_proyecto ON incidencias(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_incidencias_tarea ON incidencias(tarea_id);
CREATE INDEX IF NOT EXISTS idx_incidencias_empresa ON incidencias(empresa_id);
CREATE INDEX IF NOT EXISTS idx_incidencias_resuelta ON incidencias(resuelta);

CREATE OR REPLACE TRIGGER trg_incidencias_updated
BEFORE UPDATE ON incidencias
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE OR REPLACE TRIGGER trg_incidencias_autofill
BEFORE INSERT ON incidencias
FOR EACH ROW EXECUTE FUNCTION autofill_empresa_id();

ALTER TABLE incidencias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS incidencias_select ON incidencias;
CREATE POLICY incidencias_select ON incidencias FOR SELECT
  TO authenticated USING (
    empresa_id = current_empresa_id()
    OR EXISTS (
      SELECT 1 FROM proyectos p
      WHERE p.id = incidencias.proyecto_id
      AND p.interiorista_usuario_id = auth.uid()
      AND current_rol() = 'interiorista'
    )
  );

DROP POLICY IF EXISTS incidencias_insert ON incidencias;
CREATE POLICY incidencias_insert ON incidencias FOR INSERT
  TO authenticated WITH CHECK (
    current_rol() IN ('admin', 'operario', 'montador') AND
    (empresa_id IS NULL OR empresa_id = current_empresa_id())
  );

DROP POLICY IF EXISTS incidencias_update ON incidencias;
CREATE POLICY incidencias_update ON incidencias FOR UPDATE
  TO authenticated USING (empresa_id = current_empresa_id())
  WITH CHECK (empresa_id = current_empresa_id());

DROP POLICY IF EXISTS incidencias_delete ON incidencias;
CREATE POLICY incidencias_delete ON incidencias FOR DELETE
  TO authenticated USING (empresa_id = current_empresa_id() AND current_rol() IN ('admin', 'operario'));
