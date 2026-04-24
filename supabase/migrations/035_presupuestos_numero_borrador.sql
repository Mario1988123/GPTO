-- Capa 7.4 — Número legible para presupuestos en estado borrador

ALTER TABLE presupuestos
  ADD COLUMN IF NOT EXISTS numero_borrador TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_presupuestos_numero_borrador
  ON presupuestos(empresa_id, numero_borrador)
  WHERE numero_borrador IS NOT NULL;

COMMENT ON COLUMN presupuestos.numero_borrador IS 'Número temporal tipo BORR-2026-0001 asignado al crear. Al emitir el presupuesto, numero_borrador queda como histórico y numero recibe PRES-2026-0001';
