-- 005_seed.sql
-- Fila inicial: la empresa de Mario.
-- El usuario admin se creará en Sub 0.4 (login + guards).
-- ID fijo para referenciarlo cómodamente en futuros seeds de dev.

INSERT INTO public.empresas (id, nombre, slug)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Carpintería MAZOR',
  'mazor'
)
ON CONFLICT (id) DO NOTHING;
