-- Capa 15 — Geometría de estancia (rectangular o polígono libre)

CREATE TABLE IF NOT EXISTS estancia_geometria (
  estancia_id UUID PRIMARY KEY REFERENCES estancias(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('rectangular', 'poligono')),
  -- Array de puntos [{x, y}] en mm, vista superior. Rectangular = 4 puntos. Polígono = N puntos.
  puntos JSONB NOT NULL DEFAULT '[]'::jsonb,
  alto_pared_mm INTEGER NOT NULL DEFAULT 2500 CHECK (alto_pared_mm BETWEEN 1000 AND 6000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_estancia_geometria_empresa ON estancia_geometria(empresa_id);

CREATE OR REPLACE TRIGGER trg_estancia_geometria_updated
BEFORE UPDATE ON estancia_geometria
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE OR REPLACE TRIGGER trg_estancia_geometria_autofill
BEFORE INSERT ON estancia_geometria
FOR EACH ROW EXECUTE FUNCTION autofill_empresa_id();

ALTER TABLE estancia_geometria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS eg_select ON estancia_geometria;
CREATE POLICY eg_select ON estancia_geometria FOR SELECT
  TO authenticated USING (empresa_id = current_empresa_id());

DROP POLICY IF EXISTS eg_insert ON estancia_geometria;
CREATE POLICY eg_insert ON estancia_geometria FOR INSERT
  TO authenticated WITH CHECK (
    (current_rol() IN ('admin', 'operario')) AND
    (empresa_id IS NULL OR empresa_id = current_empresa_id())
  );

DROP POLICY IF EXISTS eg_update ON estancia_geometria;
CREATE POLICY eg_update ON estancia_geometria FOR UPDATE
  TO authenticated USING (empresa_id = current_empresa_id())
  WITH CHECK (empresa_id = current_empresa_id());

DROP POLICY IF EXISTS eg_delete ON estancia_geometria;
CREATE POLICY eg_delete ON estancia_geometria FOR DELETE
  TO authenticated USING (empresa_id = current_empresa_id() AND es_admin());

-- Lectura pública anon por token del proyecto (portal cliente)
DROP POLICY IF EXISTS eg_select_anon ON estancia_geometria;
CREATE POLICY eg_select_anon ON estancia_geometria FOR SELECT
  TO anon USING (
    EXISTS (
      SELECT 1 FROM estancias e
      JOIN proyectos p ON p.id = e.proyecto_id
      WHERE e.id = estancia_geometria.estancia_id
    )
  );
