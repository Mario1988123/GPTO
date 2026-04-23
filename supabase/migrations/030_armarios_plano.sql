-- 030_armarios_plano.sql
-- Capa 4.6: posicion del armario en el plano 2D de la estancia (vista superior).

ALTER TABLE public.armarios
  ADD COLUMN plano_x_mm       INTEGER NOT NULL DEFAULT 0 CHECK (plano_x_mm >= 0),
  ADD COLUMN plano_y_mm       INTEGER NOT NULL DEFAULT 0 CHECK (plano_y_mm >= 0),
  ADD COLUMN plano_rotacion   INTEGER NOT NULL DEFAULT 0 CHECK (plano_rotacion IN (0, 90, 180, 270));

COMMENT ON COLUMN public.armarios.plano_x_mm IS
  'Posicion X del armario en el plano de la estancia (mm desde esquina inf izq). Para vista superior.';
COMMENT ON COLUMN public.armarios.plano_y_mm IS
  'Posicion Y del armario en el plano de la estancia (mm desde esquina inf izq).';
COMMENT ON COLUMN public.armarios.plano_rotacion IS
  'Rotacion en grados (0/90/180/270) de como se apoya el armario en el plano.';
