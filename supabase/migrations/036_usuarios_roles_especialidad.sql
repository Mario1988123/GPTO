-- Capa 17 — Ampliar roles con interiorista + añadir especialidades de montador

-- El CHECK actual solo permite admin/operario/cliente_final. Lo ampliamos.
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE usuarios
  ADD CONSTRAINT usuarios_rol_check
  CHECK (rol IN ('admin', 'operario', 'montador', 'interiorista', 'cliente_final'));

-- Array de especialidades de montador (puede tener varias)
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS especialidades TEXT[] NOT NULL DEFAULT '{}';

-- Validamos cada elemento del array
CREATE OR REPLACE FUNCTION public.validar_especialidades(esp TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM unnest(esp) AS e
    WHERE e NOT IN ('cocina', 'muebles', 'puertas', 'ventanas', 'parquet')
  );
$$;

ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_especialidades_check;
ALTER TABLE usuarios
  ADD CONSTRAINT usuarios_especialidades_check
  CHECK (public.validar_especialidades(especialidades));

COMMENT ON COLUMN usuarios.especialidades IS 'Array de especialidades del montador: cocina, muebles, puertas, ventanas, parquet';
