-- 052_storage_fotos.sql
-- Capa 22 — Bucket público en Supabase Storage para fotos de catálogo y clientes.
--
-- CAMBIO DE BD
-- - Qué cambia: crea (si no existe) el bucket "fotos" en storage.buckets,
--   con política de lectura pública y escritura solo para usuarios autenticados.
-- - Por qué: los catálogos (clientes, materiales, acabados, herrajes, puertas...)
--   tienen foto_url. Hasta ahora era URL externa. Con este bucket se pueden
--   subir fotos directamente desde la app y obtener una URL pública estable.
-- - Tablas afectadas: storage.buckets + storage.objects (políticas).
-- - Migración: la de abajo.
-- - Rollback: DELETE FROM storage.buckets WHERE id='fotos' (Supabase rechaza si
--   tiene objetos; vaciar bucket primero).
-- - Riesgo: BAJO. Si el bucket ya existe se ignora.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fotos',
  'fotos',
  true,
  5242880,                     -- 5 MB por archivo
  ARRAY['image/jpeg','image/png','image/webp','image/avif']
)
ON CONFLICT (id) DO NOTHING;

-- Lectura pública del bucket
DROP POLICY IF EXISTS "fotos_public_read" ON storage.objects;
CREATE POLICY "fotos_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'fotos');

-- Escritura solo para autenticados, dentro de carpetas por empresa.
-- Estructura esperada: fotos/<empresa_id>/<categoria>/<archivo>
DROP POLICY IF EXISTS "fotos_authenticated_insert" ON storage.objects;
CREATE POLICY "fotos_authenticated_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'fotos');

DROP POLICY IF EXISTS "fotos_authenticated_update" ON storage.objects;
CREATE POLICY "fotos_authenticated_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'fotos')
  WITH CHECK (bucket_id = 'fotos');

DROP POLICY IF EXISTS "fotos_authenticated_delete" ON storage.objects;
CREATE POLICY "fotos_authenticated_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'fotos');
