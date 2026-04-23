-- 004_rls.sql
-- Funciones helper de contexto y políticas RLS.
-- Todas las funciones son SQL puro (regla #9). SECURITY DEFINER donde hace falta
-- para evitar recursión al leer usuarios desde sus propias policies.

CREATE OR REPLACE FUNCTION public.current_empresa_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id FROM public.usuarios WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_rol()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rol FROM public.usuarios WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(public.current_rol() = 'admin', false);
$$;

-- Activar RLS en ambas tablas.
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- =========================== POLICIES: empresas ===========================
CREATE POLICY "empresas_select_propia"
ON public.empresas FOR SELECT TO authenticated
USING (id = public.current_empresa_id());

CREATE POLICY "empresas_update_admin"
ON public.empresas FOR UPDATE TO authenticated
USING (id = public.current_empresa_id() AND public.es_admin())
WITH CHECK (id = public.current_empresa_id() AND public.es_admin());

-- INSERT / DELETE en empresas: solo service_role (sin policy = authenticated denegado).

-- =========================== POLICIES: usuarios ===========================
CREATE POLICY "usuarios_select_misma_empresa"
ON public.usuarios FOR SELECT TO authenticated
USING (empresa_id = public.current_empresa_id());

CREATE POLICY "usuarios_insert_admin"
ON public.usuarios FOR INSERT TO authenticated
WITH CHECK (empresa_id = public.current_empresa_id() AND public.es_admin());

CREATE POLICY "usuarios_update_admin"
ON public.usuarios FOR UPDATE TO authenticated
USING (empresa_id = public.current_empresa_id() AND public.es_admin())
WITH CHECK (empresa_id = public.current_empresa_id() AND public.es_admin());

CREATE POLICY "usuarios_delete_admin"
ON public.usuarios FOR DELETE TO authenticated
USING (empresa_id = public.current_empresa_id() AND public.es_admin());
