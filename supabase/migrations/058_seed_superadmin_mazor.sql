-- 058_seed_superadmin_mazor.sql (definitiva)
-- Capa 26 — Seed completo: crea los auth.users si no existen + Mario superadmin
-- + empresa MAZOR + Mario admin gmail + plantillas email base.
--
-- Esta migración es idempotente y se puede re-ejecutar sin error:
-- - Si el auth.user ya existe, no lo recrea (solo refresca password).
-- - Si la empresa MAZOR existe, solo la activa.
-- - Si los usuarios públicos existen, los actualiza.
--
-- Hace falta pgcrypto (ya lo añade la 057).

-- =========== AMPLIAR public.usuarios CON email + nombre nullable ===========
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.usuarios ALTER COLUMN nombre DROP NOT NULL;

UPDATE public.usuarios u
SET email = au.email
FROM auth.users au
WHERE au.id = u.id AND (u.email IS NULL OR u.email <> au.email);

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

-- =========== HELPER: crear auth.user con password bcrypt ===========
CREATE OR REPLACE FUNCTION public.seed_auth_user(p_email TEXT, p_password TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $au$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id FROM auth.users WHERE email = p_email LIMIT 1;
  IF v_id IS NOT NULL THEN
    -- Ya existe: actualizar password.
    UPDATE auth.users
    SET encrypted_password = crypt(p_password, gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        updated_at         = now()
    WHERE id = v_id;
    RETURN v_id;
  END IF;

  -- Crear nuevo
  v_id := gen_random_uuid();
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_id,
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    jsonb_build_object('provider','email','providers',jsonb_build_array('email')),
    '{}'::jsonb,
    now(), now(), '', '', '', ''
  );

  -- Identity (necesaria para login con email/password en Supabase Auth)
  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  )
  VALUES (
    gen_random_uuid(), v_id, p_email,
    jsonb_build_object('sub', v_id::text, 'email', p_email, 'email_verified', true, 'provider', 'email'),
    'email', now(), now(), now()
  );

  RETURN v_id;
END;
$au$;

-- =========== CREAR / RESETEAR LOS DOS AUTH USERS DE MARIO ===========
SELECT public.seed_auth_user('mario.ortigueira@me.com',     'Mario.:123');
SELECT public.seed_auth_user('mario.ortigueira@gmail.com',  'Mario.:123');

-- =========== MARIO SUPERADMIN (me.com) ===========
DO $sa$
DECLARE
  v_auth_id UUID;
BEGIN
  SELECT id INTO v_auth_id FROM auth.users WHERE email = 'mario.ortigueira@me.com' LIMIT 1;
  IF v_auth_id IS NULL THEN RETURN; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = v_auth_id) THEN
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
-- IMPORTANTE: empresas.slug es NOT NULL UNIQUE. Generar 'mazor'.
DO $emp$
DECLARE
  v_emp_id UUID;
BEGIN
  SELECT id INTO v_emp_id FROM public.empresas WHERE slug = 'mazor' LIMIT 1;
  IF v_emp_id IS NULL THEN
    SELECT id INTO v_emp_id FROM public.empresas WHERE LOWER(nombre) = 'mazor' LIMIT 1;
  END IF;

  IF v_emp_id IS NULL THEN
    INSERT INTO public.empresas (nombre, slug, estado, plan, fecha_alta)
    VALUES ('MAZOR', 'mazor', 'activa', 'taller', CURRENT_DATE)
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
BEGIN
  SELECT id INTO v_emp_id FROM public.empresas WHERE slug = 'mazor' LIMIT 1;
  IF v_emp_id IS NULL THEN RETURN; END IF;

  SELECT id INTO v_rol_admin FROM public.roles_empresa WHERE empresa_id = v_emp_id AND es_admin = TRUE LIMIT 1;
  SELECT id INTO v_auth_id   FROM auth.users WHERE email = 'mario.ortigueira@gmail.com' LIMIT 1;
  IF v_auth_id IS NULL THEN RETURN; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = v_auth_id) THEN
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

-- =========== PLANTILLAS DE EMAIL POR DEFECTO ===========
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
