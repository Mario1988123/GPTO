-- 058_seed_superadmin_mazor.sql (corregida)
-- Capa 26 — Seed: Mario superadmin (me.com) + Mario admin de MAZOR (gmail.com).
--
-- CORRECCIÓN: la tabla public.usuarios solo tiene id (FK a auth.users), nombre,
-- rol, empresa_id, activo. NO tiene columna email. Esta migración:
--  1) Añade public.usuarios.email TEXT (sincronizado desde auth.users vía trigger).
--  2) Relaja public.usuarios.nombre para que pueda ser NULL (los seeds y las
--     invitaciones por magic-link aún no tienen nombre cuando llegan).
--  3) Hace los seeds de Mario superadmin + MAZOR + Mario admin gmail
--     buscando primero el id en auth.users por email.
--
-- Si el usuario auth no existe todavía, esta migración no lo crea (los crea
-- Mario manualmente desde Supabase Dashboard → Auth → Users). La migración
-- no fallará — simplemente saltará ese paso y se podrá re-aplicar.

-- =========== AMPLIAR public.usuarios ===========
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS email TEXT;

-- nombre nullable (antes era NOT NULL)
ALTER TABLE public.usuarios
  ALTER COLUMN nombre DROP NOT NULL;

-- Sincronizar email desde auth.users (snapshot inicial).
UPDATE public.usuarios u
SET email = au.email
FROM auth.users au
WHERE au.id = u.id AND (u.email IS NULL OR u.email <> au.email);

-- Trigger: cuando cambia el email en auth.users, propagar a public.usuarios.
CREATE OR REPLACE FUNCTION public.sync_usuario_email() RETURNS TRIGGER LANGUAGE plpgsql AS $sync$
BEGIN
  UPDATE public.usuarios SET email = NEW.email WHERE id = NEW.id;
  RETURN NEW;
END;
$sync$;
DROP TRIGGER IF EXISTS auth_users_sync_email ON auth.users;
CREATE TRIGGER auth_users_sync_email
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_usuario_email();

-- =========== MARIO SUPERADMIN (me.com) ===========
DO $sa$
DECLARE
  v_auth_id UUID;
  v_existe  UUID;
BEGIN
  SELECT id INTO v_auth_id FROM auth.users WHERE email = 'mario.ortigueira@me.com' LIMIT 1;
  IF v_auth_id IS NULL THEN
    RAISE NOTICE 'Auth user mario.ortigueira@me.com NO existe. Crea el usuario en Auth → Users y re-ejecuta esta migración.';
    RETURN;
  END IF;

  SELECT id INTO v_existe FROM public.usuarios WHERE id = v_auth_id LIMIT 1;

  IF v_existe IS NULL THEN
    INSERT INTO public.usuarios (id, email, nombre, rol, es_superadmin, empresa_id, activo)
    VALUES (v_auth_id, 'mario.ortigueira@me.com', 'Mario Ortigueira (superadmin)', 'admin', TRUE, NULL, TRUE);
  ELSE
    UPDATE public.usuarios
    SET es_superadmin  = TRUE,
        empresa_id     = NULL,
        rol_empresa_id = NULL,
        nombre         = COALESCE(nombre, 'Mario Ortigueira (superadmin)'),
        email          = 'mario.ortigueira@me.com',
        activo         = TRUE
    WHERE id = v_auth_id;
  END IF;
END;
$sa$;

-- =========== EMPRESA MAZOR ===========
DO $emp$
DECLARE
  v_emp_id UUID;
BEGIN
  SELECT id INTO v_emp_id FROM public.empresas WHERE LOWER(nombre) = 'mazor' LIMIT 1;
  IF v_emp_id IS NULL THEN
    INSERT INTO public.empresas (nombre, estado, plan, fecha_alta)
    VALUES ('MAZOR', 'activa', 'taller', CURRENT_DATE)
    RETURNING id INTO v_emp_id;
  ELSE
    UPDATE public.empresas SET estado = 'activa' WHERE id = v_emp_id;
  END IF;

  -- Asegurar rol admin para MAZOR
  IF NOT EXISTS (SELECT 1 FROM public.roles_empresa WHERE empresa_id = v_emp_id AND es_admin = TRUE) THEN
    INSERT INTO public.roles_empresa (empresa_id, slug, nombre, descripcion, permisos, color, es_admin, es_default)
    VALUES (v_emp_id, 'admin', 'Administrador', 'Control total sobre la empresa.',
            ARRAY(SELECT slug FROM public.permisos_catalogo), '#0f172a', TRUE, FALSE);
  END IF;
END;
$emp$;

-- =========== MARIO ADMIN MAZOR (gmail.com) ===========
DO $ad$
DECLARE
  v_emp_id     UUID;
  v_rol_admin  UUID;
  v_auth_id    UUID;
  v_existe     UUID;
BEGIN
  SELECT id INTO v_emp_id FROM public.empresas WHERE LOWER(nombre) = 'mazor' LIMIT 1;
  IF v_emp_id IS NULL THEN
    RAISE NOTICE 'MAZOR no existe, salto admin';
    RETURN;
  END IF;

  SELECT id INTO v_rol_admin FROM public.roles_empresa WHERE empresa_id = v_emp_id AND es_admin = TRUE LIMIT 1;
  SELECT id INTO v_auth_id   FROM auth.users WHERE email = 'mario.ortigueira@gmail.com' LIMIT 1;

  IF v_auth_id IS NULL THEN
    RAISE NOTICE 'Auth user mario.ortigueira@gmail.com NO existe. Crea el usuario en Auth → Users y re-ejecuta esta migración.';
    RETURN;
  END IF;

  SELECT id INTO v_existe FROM public.usuarios WHERE id = v_auth_id LIMIT 1;

  IF v_existe IS NULL THEN
    INSERT INTO public.usuarios (id, email, nombre, rol, empresa_id, rol_empresa_id, es_superadmin, activo)
    VALUES (v_auth_id,
            'mario.ortigueira@gmail.com', 'Mario Ortigueira (admin MAZOR)', 'admin',
            v_emp_id, v_rol_admin, FALSE, TRUE);
  ELSE
    UPDATE public.usuarios
    SET empresa_id     = v_emp_id,
        rol_empresa_id = v_rol_admin,
        es_superadmin  = FALSE,
        activo         = TRUE,
        email          = 'mario.ortigueira@gmail.com',
        nombre         = COALESCE(nombre, 'Mario Ortigueira (admin MAZOR)')
    WHERE id = v_auth_id;
  END IF;
END;
$ad$;

-- =========== PLANTILLAS DE EMAIL POR DEFECTO PARA TODAS LAS EMPRESAS ===========
INSERT INTO public.plantillas_email (empresa_id, tipo, asunto, cuerpo_html)
SELECT e.id, t.tipo, t.asunto, t.cuerpo_html
FROM public.empresas e
CROSS JOIN (VALUES
  ('presupuesto_enviado',
   'Presupuesto {{numero}} - {{empresa}}',
   '<p>Hola {{cliente_nombre}},</p><p>Te adjunto el presupuesto <strong>{{numero}}</strong> de tu proyecto <em>{{proyecto}}</em>.</p><p>Importe total: <strong>{{total}}</strong></p><p>Cualquier duda, escríbeme.</p><p>Un saludo,<br>{{usuario_nombre}}</p>'),
  ('presupuesto_aceptado',
   'Confirmación presupuesto {{numero}} aceptado',
   '<p>Hola {{cliente_nombre}},</p><p>Confirmamos la aceptación del presupuesto <strong>{{numero}}</strong>. Empezamos con tu proyecto.</p><p>Te iremos informando del progreso.</p><p>Un saludo,<br>{{usuario_nombre}}</p>'),
  ('presupuesto_recordatorio',
   'Recordatorio presupuesto {{numero}}',
   '<p>Hola {{cliente_nombre}},</p><p>Pasaba a recordarte el presupuesto <strong>{{numero}}</strong> que te envié hace unos días. Si tienes cualquier duda o quieres ajustar algo, dime.</p><p>Un saludo,<br>{{usuario_nombre}}</p>'),
  ('pedido_confirmado',
   'Pedido {{numero}} confirmado',
   '<p>Hola {{cliente_nombre}},</p><p>Hemos recibido tu pedido <strong>{{numero}}</strong>. La fecha prevista de entrega es <strong>{{fecha_entrega}}</strong>.</p><p>Puedes seguir el progreso aquí: <a href="{{portal_url}}">{{portal_url}}</a></p><p>Un saludo,<br>{{usuario_nombre}}</p>'),
  ('pedido_listo',
   'Tu pedido {{numero}} está listo',
   '<p>Hola {{cliente_nombre}},</p><p>Tu pedido <strong>{{numero}}</strong> ya está listo. Coordinaremos la entrega contigo.</p><p>Un saludo,<br>{{usuario_nombre}}</p>'),
  ('albaran',
   'Albarán de entrega - {{numero}}',
   '<p>Hola {{cliente_nombre}},</p><p>Te adjunto el albarán <strong>{{numero}}</strong> de tu pedido.</p><p>Un saludo,<br>{{usuario_nombre}}</p>'),
  ('factura_enviada',
   'Factura {{numero}} - {{empresa}}',
   '<p>Hola {{cliente_nombre}},</p><p>Te adjunto la factura <strong>{{numero}}</strong>.</p><p>Importe: <strong>{{total}}</strong>. Vencimiento: <strong>{{fecha_vencimiento}}</strong>.</p><p>Un saludo,<br>{{usuario_nombre}}</p>'),
  ('recordatorio_pago',
   'Recordatorio pago factura {{numero}}',
   '<p>Hola {{cliente_nombre}},</p><p>Pasaba a recordarte el pago de la factura <strong>{{numero}}</strong> con vencimiento <strong>{{fecha_vencimiento}}</strong>.</p><p>Un saludo,<br>{{usuario_nombre}}</p>'),
  ('bienvenida_cliente',
   'Bienvenido a {{empresa}}',
   '<p>Hola {{cliente_nombre}},</p><p>Bienvenido a {{empresa}}. Estamos encantados de empezar contigo.</p><p>Un saludo,<br>{{usuario_nombre}}</p>'),
  ('cita_programada',
   'Cita programada: {{fecha}}',
   '<p>Hola {{cliente_nombre}},</p><p>Confirmo nuestra cita el <strong>{{fecha}}</strong>.</p><p>Si te surge un imprevisto, avísame.</p><p>Un saludo,<br>{{usuario_nombre}}</p>'),
  ('generico',
   '{{asunto}}',
   '<p>Hola {{cliente_nombre}},</p><p>{{cuerpo}}</p><p>Un saludo,<br>{{usuario_nombre}}</p>')
) AS t(tipo, asunto, cuerpo_html)
ON CONFLICT (empresa_id, tipo) DO NOTHING;
