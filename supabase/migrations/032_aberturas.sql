-- Capa 15 — Puertas y ventanas en la estancia

CREATE TABLE IF NOT EXISTS aberturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  estancia_id UUID NOT NULL REFERENCES estancias(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('puerta', 'ventana')),
  -- Índice de la pared: 0..N-1 referido al array de puntos (pared 0 = punto[0]→punto[1], etc.)
  pared_idx INTEGER NOT NULL CHECK (pared_idx >= 0),
  -- Offset en mm desde el vértice inicial de la pared hasta el borde izquierdo de la abertura
  x_en_pared_mm INTEGER NOT NULL CHECK (x_en_pared_mm >= 0),
  ancho_mm INTEGER NOT NULL CHECK (ancho_mm BETWEEN 100 AND 6000),
  alto_mm INTEGER NOT NULL CHECK (alto_mm BETWEEN 100 AND 4000),
  -- Altura del antepecho (solo ventanas; puertas = 0)
  antepecho_mm INTEGER NOT NULL DEFAULT 0 CHECK (antepecho_mm >= 0),
  etiqueta TEXT,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aberturas_estancia ON aberturas(estancia_id);
CREATE INDEX IF NOT EXISTS idx_aberturas_empresa ON aberturas(empresa_id);

CREATE OR REPLACE TRIGGER trg_aberturas_updated
BEFORE UPDATE ON aberturas
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE OR REPLACE TRIGGER trg_aberturas_autofill
BEFORE INSERT ON aberturas
FOR EACH ROW EXECUTE FUNCTION autofill_empresa_id();

ALTER TABLE aberturas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ab_select ON aberturas;
CREATE POLICY ab_select ON aberturas FOR SELECT
  TO authenticated USING (empresa_id = current_empresa_id());

DROP POLICY IF EXISTS ab_insert ON aberturas;
CREATE POLICY ab_insert ON aberturas FOR INSERT
  TO authenticated WITH CHECK (
    (current_rol() IN ('admin', 'operario')) AND
    (empresa_id IS NULL OR empresa_id = current_empresa_id())
  );

DROP POLICY IF EXISTS ab_update ON aberturas;
CREATE POLICY ab_update ON aberturas FOR UPDATE
  TO authenticated USING (empresa_id = current_empresa_id())
  WITH CHECK (empresa_id = current_empresa_id());

DROP POLICY IF EXISTS ab_delete ON aberturas;
CREATE POLICY ab_delete ON aberturas FOR DELETE
  TO authenticated USING (empresa_id = current_empresa_id() AND es_admin());

DROP POLICY IF EXISTS ab_select_anon ON aberturas;
CREATE POLICY ab_select_anon ON aberturas FOR SELECT
  TO anon USING (
    EXISTS (
      SELECT 1 FROM estancias e
      JOIN proyectos p ON p.id = e.proyecto_id
      WHERE e.id = aberturas.estancia_id
    )
  );
