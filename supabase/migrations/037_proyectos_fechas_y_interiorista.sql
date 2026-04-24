-- Capa 17 — Fechas de entrega + interiorista asignado + cierre automático

ALTER TABLE proyectos
  ADD COLUMN IF NOT EXISTS fecha_entrega_comprometida DATE,
  ADD COLUMN IF NOT EXISTS fecha_entrega_actual DATE,
  ADD COLUMN IF NOT EXISTS cerrado_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS interiorista_usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_proyectos_interiorista ON proyectos(interiorista_usuario_id);

COMMENT ON COLUMN proyectos.fecha_entrega_comprometida IS 'Fecha de entrega pactada con el cliente al aceptar el presupuesto (no cambia salvo negociación)';
COMMENT ON COLUMN proyectos.fecha_entrega_actual IS 'Fecha de entrega recalculada dinámicamente según retrasos del Gantt';
COMMENT ON COLUMN proyectos.cerrado_at IS 'Timestamp cuando todas las tareas pasaron a completada. NULL si sigue abierto';
COMMENT ON COLUMN proyectos.interiorista_usuario_id IS 'Interiorista/arquitecto externo con acceso de solo lectura al proyecto';

-- Policy adicional: interiorista ve los proyectos donde está asignado
DROP POLICY IF EXISTS proyectos_interiorista_select ON proyectos;
CREATE POLICY proyectos_interiorista_select ON proyectos FOR SELECT
  TO authenticated USING (
    current_rol() = 'interiorista' AND interiorista_usuario_id = auth.uid()
  );
