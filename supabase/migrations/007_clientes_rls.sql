-- 007_clientes_rls.sql
-- RLS para clientes. Mismo patrón que empresas/usuarios: aislamiento por empresa_id.
-- SELECT: cualquier miembro de la empresa.
-- INSERT / UPDATE: admin u operario.
-- DELETE: solo admin (aunque el flujo principal es soft delete con activo=false).

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clientes_select_misma_empresa"
ON public.clientes FOR SELECT TO authenticated
USING (empresa_id = public.current_empresa_id());

CREATE POLICY "clientes_insert_admin_operario"
ON public.clientes FOR INSERT TO authenticated
WITH CHECK (
  empresa_id = public.current_empresa_id()
  AND public.current_rol() IN ('admin', 'operario')
);

CREATE POLICY "clientes_update_admin_operario"
ON public.clientes FOR UPDATE TO authenticated
USING (
  empresa_id = public.current_empresa_id()
  AND public.current_rol() IN ('admin', 'operario')
)
WITH CHECK (
  empresa_id = public.current_empresa_id()
  AND public.current_rol() IN ('admin', 'operario')
);

CREATE POLICY "clientes_delete_admin"
ON public.clientes FOR DELETE TO authenticated
USING (empresa_id = public.current_empresa_id() AND public.es_admin());
