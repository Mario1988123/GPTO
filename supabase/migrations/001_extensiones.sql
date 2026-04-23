-- 001_extensiones.sql
-- Extensiones base. Supabase suele traerlas activas, pero lo hacemos idempotente.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
