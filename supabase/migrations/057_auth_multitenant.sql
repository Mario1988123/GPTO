-- 057_auth_multitenant.sql
-- Capa 26 — Auth multitenant con superadmin, admin, roles personalizados,
-- SMTP por empresa y por usuario, plantillas de email, plan de suscripción.
--
-- CAMBIO DE BD
-- - usuarios: es_superadmin BOOLEAN. Cuando es_superadmin=TRUE, empresa_id puede ser NULL.
-- - empresas: estado (activa/suspendida/cancelada) + plan + fecha_alta + fecha_baja.
-- - permisos_catalogo: catálogo cerrado de ~40 permisos del sistema.
-- - roles_empresa: roles definidos por cada empresa con conjunto de permisos.
-- - empresa_smtp + usuario_smtp: configuración SMTP cifrada con pgcrypto.
-- - plantillas_email: emails personalizables por tipo (presupuesto, factura, etc.).
-- - email_envios: log de cada email enviado.
-- - Funciones: is_superadmin(), tiene_permiso(slug).
-- - RLS: superadmin bypass + admin solo su empresa + usuarios solo lo permitido.
-- - Riesgo: MEDIO. Toca usuarios y RLS. Aditivo en lo posible.

-- pgcrypto para cifrar passwords SMTP
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ================== USUARIOS ==================
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS es_superadmin BOOLEAN NOT NULL DEFAULT FALSE;

-- empresa_id puede ser NULL si es_superadmin=TRUE.
ALTER TABLE public.usuarios ALTER COLUMN empresa_id DROP NOT NULL;
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_empresa_o_superadmin;
ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_empresa_o_superadmin
  CHECK (es_superadmin = TRUE OR empresa_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS usuarios_superadmin_idx ON public.usuarios(es_superadmin) WHERE es_superadmin = TRUE;

-- ================== EMPRESAS ==================
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS estado       TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa','suspendida','cancelada')),
  ADD COLUMN IF NOT EXISTS plan         TEXT NOT NULL DEFAULT 'autonomo' CHECK (plan IN ('autonomo','taller','empresa')),
  ADD COLUMN IF NOT EXISTS fecha_alta   DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS fecha_baja   DATE;

-- ================== PERMISOS_CATALOGO ==================
CREATE TABLE IF NOT EXISTS public.permisos_catalogo (
  slug         TEXT PRIMARY KEY,
  grupo        TEXT NOT NULL,
  nombre       TEXT NOT NULL,
  descripcion  TEXT,
  orden        INTEGER NOT NULL DEFAULT 0
);

INSERT INTO public.permisos_catalogo (slug, grupo, nombre, descripcion, orden) VALUES
  -- Clientes
  ('clientes.ver',       'Clientes', 'Ver clientes', 'Listado y detalle de clientes', 100),
  ('clientes.crear',     'Clientes', 'Crear clientes', NULL, 101),
  ('clientes.editar',    'Clientes', 'Editar clientes', NULL, 102),
  ('clientes.eliminar',  'Clientes', 'Eliminar clientes', NULL, 103),
  ('clientes.importar',  'Clientes', 'Importar/exportar CSV', NULL, 104),
  -- Proyectos
  ('proyectos.ver',      'Proyectos', 'Ver proyectos', NULL, 200),
  ('proyectos.crear',    'Proyectos', 'Crear proyectos', NULL, 201),
  ('proyectos.editar',   'Proyectos', 'Editar proyectos', NULL, 202),
  ('proyectos.eliminar', 'Proyectos', 'Eliminar proyectos', NULL, 203),
  ('proyectos.cerrar',   'Proyectos', 'Cerrar / reabrir proyectos', NULL, 204),
  ('proyectos.gastos',   'Proyectos', 'Ver/editar gastos y rentabilidad', NULL, 205),
  -- Presupuestos
  ('presupuestos.ver',     'Presupuestos', 'Ver presupuestos', NULL, 300),
  ('presupuestos.crear',   'Presupuestos', 'Crear presupuestos', NULL, 301),
  ('presupuestos.enviar',  'Presupuestos', 'Enviar al cliente', NULL, 302),
  ('presupuestos.aceptar', 'Presupuestos', 'Marcar aceptado/rechazado', NULL, 303),
  ('presupuestos.eliminar','Presupuestos', 'Eliminar presupuestos', NULL, 304),
  -- Facturas
  ('facturas.ver',         'Facturas', 'Ver facturas', NULL, 400),
  ('facturas.crear',       'Facturas', 'Crear facturas', NULL, 401),
  ('facturas.emitir',      'Facturas', 'Emitir factura (asignar nº)', NULL, 402),
  ('facturas.rectificar',  'Facturas', 'Crear rectificativa', NULL, 403),
  ('facturas.cobrar',      'Facturas', 'Marcar cobrada/anulada', NULL, 404),
  -- Almacenes y stock
  ('almacenes.ver',        'Almacenes', 'Ver almacenes y stock', NULL, 500),
  ('almacenes.administrar','Almacenes', 'Crear/editar almacenes y furgonetas', NULL, 501),
  ('movimientos.crear',    'Almacenes', 'Registrar movimientos', NULL, 502),
  ('tableros.administrar', 'Almacenes', 'Gestionar tableros físicos', NULL, 503),
  -- Catálogos
  ('catalogo.ver',         'Catálogos', 'Ver catálogos', NULL, 600),
  ('catalogo.editar',      'Catálogos', 'Editar catálogos', NULL, 601),
  ('catalogo.precios',     'Catálogos', 'Cambiar precios de proveedor/PVP', NULL, 602),
  ('tipos_modulo.editar',  'Catálogos', 'Editar tipos de módulo', NULL, 603),
  -- Producción
  ('produccion.ver',       'Producción', 'Ver tablero de producción', NULL, 700),
  ('produccion.cambiar_estado','Producción', 'Avanzar piezas en kanban', NULL, 701),
  ('produccion.recepcionar','Producción', 'Recepcionar pedido / incidencias', NULL, 702),
  ('produccion.montaje',   'Producción', 'Plano de montaje y taladros', NULL, 703),
  -- Informes
  ('informes.ver',         'Informes', 'Ver informes generales', NULL, 800),
  ('informes.financiero',  'Informes', 'Ver datos financieros / facturación', NULL, 801),
  ('informes.exportar',    'Informes', 'Exportar CSV / libros', NULL, 802),
  -- Ajustes (solo admin)
  ('ajustes.empresa',      'Ajustes', 'Configurar datos empresa', NULL, 900),
  ('ajustes.usuarios',     'Ajustes', 'Gestionar usuarios y roles', NULL, 901),
  ('ajustes.email',        'Ajustes', 'Configurar SMTP y plantillas', NULL, 902),
  ('ajustes.facturacion',  'Ajustes', 'Configurar series y datos fiscales', NULL, 903)
ON CONFLICT (slug) DO NOTHING;

-- ================== ROLES_EMPRESA ==================
CREATE TABLE IF NOT EXISTS public.roles_empresa (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  slug        TEXT NOT NULL,
  nombre      TEXT NOT NULL,
  descripcion TEXT,
  permisos    TEXT[] NOT NULL DEFAULT '{}',
  color       TEXT NOT NULL DEFAULT '#3b82f6',
  es_admin    BOOLEAN NOT NULL DEFAULT FALSE,
  es_default  BOOLEAN NOT NULL DEFAULT FALSE,
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, slug)
);
CREATE INDEX IF NOT EXISTS roles_empresa_empresa_idx ON public.roles_empresa(empresa_id);
DROP TRIGGER IF EXISTS roles_empresa_touch ON public.roles_empresa;
CREATE TRIGGER roles_empresa_touch BEFORE UPDATE ON public.roles_empresa
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS roles_empresa_autofill ON public.roles_empresa;
CREATE TRIGGER roles_empresa_autofill BEFORE INSERT ON public.roles_empresa
  FOR EACH ROW EXECUTE FUNCTION public.autofill_empresa_id();

-- Vincular usuarios a un rol_empresa.
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS rol_empresa_id UUID REFERENCES public.roles_empresa(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS usuarios_rol_empresa_idx ON public.usuarios(rol_empresa_id);

-- ================== EMPRESA SMTP ==================
CREATE TABLE IF NOT EXISTS public.empresa_smtp (
  empresa_id        UUID PRIMARY KEY REFERENCES public.empresas(id) ON DELETE CASCADE,
  proveedor         TEXT NOT NULL DEFAULT 'smtp' CHECK (proveedor IN ('smtp','gmail_oauth','icloud','ionos','outlook')),
  host              TEXT,
  port              INTEGER DEFAULT 587,
  usuario           TEXT,
  password_cifrada  TEXT,                                                   -- pgcrypto
  ssl               BOOLEAN NOT NULL DEFAULT TRUE,
  from_email        TEXT NOT NULL,
  from_nombre       TEXT,
  reply_to          TEXT,
  oauth_refresh_token TEXT,                                                 -- para gmail_oauth
  verificado        BOOLEAN NOT NULL DEFAULT FALSE,
  ultimo_test       TIMESTAMPTZ,
  ultimo_error      TEXT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS empresa_smtp_touch ON public.empresa_smtp;
CREATE TRIGGER empresa_smtp_touch BEFORE UPDATE ON public.empresa_smtp
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ================== USUARIO SMTP ==================
CREATE TABLE IF NOT EXISTS public.usuario_smtp (
  usuario_id        UUID PRIMARY KEY REFERENCES public.usuarios(id) ON DELETE CASCADE,
  empresa_id        UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  proveedor         TEXT NOT NULL DEFAULT 'smtp' CHECK (proveedor IN ('smtp','gmail_oauth','icloud','ionos','outlook')),
  host              TEXT,
  port              INTEGER DEFAULT 587,
  usuario           TEXT,
  password_cifrada  TEXT,
  ssl               BOOLEAN NOT NULL DEFAULT TRUE,
  from_email        TEXT NOT NULL,
  from_nombre       TEXT,
  reply_to          TEXT,
  oauth_refresh_token TEXT,
  verificado        BOOLEAN NOT NULL DEFAULT FALSE,
  ultimo_test       TIMESTAMPTZ,
  ultimo_error      TEXT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS usuario_smtp_empresa_idx ON public.usuario_smtp(empresa_id);
DROP TRIGGER IF EXISTS usuario_smtp_touch ON public.usuario_smtp;
CREATE TRIGGER usuario_smtp_touch BEFORE UPDATE ON public.usuario_smtp
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Función helper: cifrar/descifrar passwords SMTP usando una clave de aplicación
-- (que viene de env var GPTO_SMTP_KEY pasada como variable de sesión).
-- Si la clave no está configurada, devuelve NULL (no se puede usar SMTP).
CREATE OR REPLACE FUNCTION public.smtp_cifrar(plain TEXT) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE k TEXT;
BEGIN
  IF plain IS NULL OR plain = '' THEN RETURN NULL; END IF;
  k := current_setting('app.smtp_key', true);
  IF k IS NULL OR k = '' THEN RETURN NULL; END IF;
  RETURN encode(pgp_sym_encrypt(plain, k), 'base64');
END;
$$;

CREATE OR REPLACE FUNCTION public.smtp_descifrar(cipher TEXT) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE k TEXT;
BEGIN
  IF cipher IS NULL OR cipher = '' THEN RETURN NULL; END IF;
  k := current_setting('app.smtp_key', true);
  IF k IS NULL OR k = '' THEN RETURN NULL; END IF;
  RETURN pgp_sym_decrypt(decode(cipher, 'base64'), k);
END;
$$;

-- ================== PLANTILLAS EMAIL ==================
CREATE TABLE IF NOT EXISTS public.plantillas_email (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL CHECK (tipo IN (
                'presupuesto_enviado','presupuesto_aceptado','presupuesto_recordatorio',
                'pedido_confirmado','pedido_listo','albaran',
                'factura_enviada','recordatorio_pago',
                'bienvenida_cliente','cita_programada','generico'
              )),
  asunto      TEXT NOT NULL,
  cuerpo_html TEXT NOT NULL,
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, tipo)
);
CREATE INDEX IF NOT EXISTS plantillas_email_empresa_idx ON public.plantillas_email(empresa_id);
DROP TRIGGER IF EXISTS plantillas_email_touch ON public.plantillas_email;
CREATE TRIGGER plantillas_email_touch BEFORE UPDATE ON public.plantillas_email
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS plantillas_email_autofill ON public.plantillas_email;
CREATE TRIGGER plantillas_email_autofill BEFORE INSERT ON public.plantillas_email
  FOR EACH ROW EXECUTE FUNCTION public.autofill_empresa_id();

-- ================== EMAIL_ENVIOS ==================
CREATE TABLE IF NOT EXISTS public.email_envios (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  enviado_por   UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  destinatario  TEXT NOT NULL,
  asunto        TEXT NOT NULL,
  cuerpo_html   TEXT,
  tipo          TEXT,
  proyecto_id   UUID REFERENCES public.proyectos(id) ON DELETE SET NULL,
  presupuesto_id UUID REFERENCES public.presupuestos(id) ON DELETE SET NULL,
  factura_id    UUID REFERENCES public.facturas(id) ON DELETE SET NULL,
  exito         BOOLEAN NOT NULL DEFAULT TRUE,
  error_msg     TEXT,
  via           TEXT NOT NULL DEFAULT 'smtp_empresa' CHECK (via IN ('smtp_empresa','smtp_usuario','supabase_default')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_envios_empresa_idx ON public.email_envios(empresa_id, created_at DESC);
DROP TRIGGER IF EXISTS email_envios_autofill ON public.email_envios;
CREATE TRIGGER email_envios_autofill BEFORE INSERT ON public.email_envios
  FOR EACH ROW EXECUTE FUNCTION public.autofill_empresa_id();

-- ================== FUNCIONES RLS ==================
CREATE OR REPLACE FUNCTION public.is_superadmin() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE((SELECT es_superadmin FROM public.usuarios WHERE id = auth.uid()), FALSE);
$$;

CREATE OR REPLACE FUNCTION public.tiene_permiso(p_slug TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios u
    JOIN public.roles_empresa r ON r.id = u.rol_empresa_id
    WHERE u.id = auth.uid()
      AND (r.es_admin = TRUE OR p_slug = ANY(r.permisos))
  ) OR public.is_superadmin();
$$;

-- ================== RLS ==================
ALTER TABLE public.roles_empresa     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa_smtp      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuario_smtp      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plantillas_email  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_envios      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permisos_catalogo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS roles_empresa_all ON public.roles_empresa;
CREATE POLICY roles_empresa_all ON public.roles_empresa FOR ALL TO authenticated
  USING (empresa_id = public.current_empresa_id() OR public.is_superadmin())
  WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_superadmin());

DROP POLICY IF EXISTS empresa_smtp_all ON public.empresa_smtp;
CREATE POLICY empresa_smtp_all ON public.empresa_smtp FOR ALL TO authenticated
  USING (empresa_id = public.current_empresa_id() OR public.is_superadmin())
  WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_superadmin());

DROP POLICY IF EXISTS usuario_smtp_select ON public.usuario_smtp;
CREATE POLICY usuario_smtp_select ON public.usuario_smtp FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR public.is_superadmin());
DROP POLICY IF EXISTS usuario_smtp_modify ON public.usuario_smtp;
CREATE POLICY usuario_smtp_modify ON public.usuario_smtp FOR ALL TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

DROP POLICY IF EXISTS plantillas_email_all ON public.plantillas_email;
CREATE POLICY plantillas_email_all ON public.plantillas_email FOR ALL TO authenticated
  USING (empresa_id = public.current_empresa_id() OR public.is_superadmin())
  WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_superadmin());

DROP POLICY IF EXISTS email_envios_all ON public.email_envios;
CREATE POLICY email_envios_all ON public.email_envios FOR ALL TO authenticated
  USING (empresa_id = public.current_empresa_id() OR public.is_superadmin())
  WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_superadmin());

-- Catálogo de permisos: legible por todos los autenticados (no es secreto).
DROP POLICY IF EXISTS permisos_catalogo_select ON public.permisos_catalogo;
CREATE POLICY permisos_catalogo_select ON public.permisos_catalogo FOR SELECT TO authenticated USING (TRUE);

-- ================== SEED ROL ADMIN POR EMPRESA ==================
-- Por cada empresa existente sin rol admin, creamos uno con todos los permisos.
INSERT INTO public.roles_empresa (empresa_id, slug, nombre, descripcion, permisos, color, es_admin, es_default)
SELECT e.id, 'admin', 'Administrador',
       'Control total sobre la empresa.',
       ARRAY(SELECT slug FROM public.permisos_catalogo),
       '#0f172a', TRUE, FALSE
FROM public.empresas e
WHERE NOT EXISTS (
  SELECT 1 FROM public.roles_empresa r WHERE r.empresa_id = e.id AND r.es_admin = TRUE
);

COMMENT ON TABLE public.roles_empresa IS 'Roles personalizados por empresa con conjunto de permisos del catálogo.';
COMMENT ON FUNCTION public.is_superadmin() IS 'TRUE si el usuario actual es superadmin (gestiona empresas).';
COMMENT ON FUNCTION public.tiene_permiso(TEXT) IS 'TRUE si el usuario actual tiene el permiso indicado por slug, o es admin/superadmin.';
