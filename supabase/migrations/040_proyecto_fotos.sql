-- Capa 18 — Galería de fotos por proyecto (Storage gestionado desde Supabase)

CREATE TABLE IF NOT EXISTS proyecto_fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  armario_id UUID REFERENCES armarios(id) ON DELETE SET NULL,
  tarea_id UUID REFERENCES tareas(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  nombre_original TEXT,
  tamano_bytes INTEGER,
  descripcion TEXT,
  subido_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proyecto_fotos_proyecto ON proyecto_fotos(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_proyecto_fotos_empresa ON proyecto_fotos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_proyecto_fotos_armario ON proyecto_fotos(armario_id);

CREATE OR REPLACE TRIGGER trg_proyecto_fotos_autofill
BEFORE INSERT ON proyecto_fotos
FOR EACH ROW EXECUTE FUNCTION autofill_empresa_id();

ALTER TABLE proyecto_fotos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pf_select ON proyecto_fotos;
CREATE POLICY pf_select ON proyecto_fotos FOR SELECT
  TO authenticated USING (
    empresa_id = current_empresa_id()
    OR EXISTS (
      SELECT 1 FROM proyectos p
      WHERE p.id = proyecto_fotos.proyecto_id
      AND p.interiorista_usuario_id = auth.uid()
      AND current_rol() = 'interiorista'
    )
  );

DROP POLICY IF EXISTS pf_insert ON proyecto_fotos;
CREATE POLICY pf_insert ON proyecto_fotos FOR INSERT
  TO authenticated WITH CHECK (
    current_rol() IN ('admin', 'operario', 'montador') AND
    (empresa_id IS NULL OR empresa_id = current_empresa_id())
  );

DROP POLICY IF EXISTS pf_delete ON proyecto_fotos;
CREATE POLICY pf_delete ON proyecto_fotos FOR DELETE
  TO authenticated USING (empresa_id = current_empresa_id() AND current_rol() IN ('admin', 'operario'));

DROP POLICY IF EXISTS pf_update ON proyecto_fotos;
CREATE POLICY pf_update ON proyecto_fotos FOR UPDATE
  TO authenticated USING (empresa_id = current_empresa_id() AND current_rol() IN ('admin', 'operario'))
  WITH CHECK (empresa_id = current_empresa_id());
