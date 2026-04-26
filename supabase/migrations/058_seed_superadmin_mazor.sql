-- 058_seed_superadmin_mazor.sql
-- Capa 26 — Seed: Mario superadmin (me.com) + Mario admin de MAZOR (gmail.com).
--
-- IMPORTANTE: este seed asume que los usuarios ya existen en auth.users porque
-- Mario los creó manualmente desde Supabase Dashboard antes (o los creará).
-- Los emails y passwords los gestiona Supabase Auth aparte; aquí solo
-- conectamos la fila pública.usuarios con su rol.
--
-- Si el usuario auth todavía NO existe, este seed crea solo la fila de usuarios
-- aunque sin auth_id (NULL), y Mario debe crear el auth user después y
-- ejecutar este seed otra vez para que se enlacen.

-- =========== MARIO SUPERADMIN (me.com) ===========
DO $sa$
DECLARE
  v_auth_id UUID;
  v_existe  UUID;
BEGIN
  SELECT id INTO v_auth_id FROM auth.users WHERE email = 'mario.ortigueira@me.com' LIMIT 1;

  SELECT id INTO v_existe FROM public.usuarios WHERE email = 'mario.ortigueira@me.com' LIMIT 1;

  IF v_existe IS NULL THEN
    -- Crear nuevo usuario superadmin
    INSERT INTO public.usuarios (id, email, nombre, es_superadmin, empresa_id, activo)
    VALUES (COALESCE(v_auth_id, gen_random_uuid()), 'mario.ortigueira@me.com', 'Mario Ortigueira (superadmin)', TRUE, NULL, TRUE);
  ELSE
    -- Promocionar el existente a superadmin y soltarlo de empresa
    UPDATE public.usuarios
    SET es_superadmin = TRUE,
        empresa_id    = NULL,
        rol_empresa_id = NULL,
        nombre        = COALESCE(nombre, 'Mario Ortigueira (superadmin)'),
        activo        = TRUE
    WHERE id = v_existe;

    -- Si el auth_id ha cambiado, sincronizar
    IF v_auth_id IS NOT NULL AND v_auth_id <> v_existe THEN
      UPDATE public.usuarios SET id = v_auth_id WHERE id = v_existe;
    END IF;
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
  SELECT id INTO v_existe    FROM public.usuarios WHERE email = 'mario.ortigueira@gmail.com' LIMIT 1;

  IF v_existe IS NULL THEN
    INSERT INTO public.usuarios (id, email, nombre, empresa_id, rol_empresa_id, es_superadmin, activo)
    VALUES (COALESCE(v_auth_id, gen_random_uuid()),
            'mario.ortigueira@gmail.com', 'Mario Ortigueira (admin MAZOR)',
            v_emp_id, v_rol_admin, FALSE, TRUE);
  ELSE
    UPDATE public.usuarios
    SET empresa_id     = v_emp_id,
        rol_empresa_id = v_rol_admin,
        es_superadmin  = FALSE,
        activo         = TRUE,
        nombre         = COALESCE(nombre, 'Mario Ortigueira (admin MAZOR)')
    WHERE id = v_existe;

    IF v_auth_id IS NOT NULL AND v_auth_id <> v_existe THEN
      UPDATE public.usuarios SET id = v_auth_id WHERE id = v_existe;
    END IF;
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
