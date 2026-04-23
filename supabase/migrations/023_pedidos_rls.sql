-- 023_pedidos_rls.sql

ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pedidos_select" ON public.pedidos FOR SELECT TO authenticated
  USING (empresa_id = public.current_empresa_id());
CREATE POLICY "pedidos_insert" ON public.pedidos FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.current_empresa_id() AND public.current_rol() IN ('admin','operario'));
CREATE POLICY "pedidos_update" ON public.pedidos FOR UPDATE TO authenticated
  USING (empresa_id = public.current_empresa_id() AND public.current_rol() IN ('admin','operario'))
  WITH CHECK (empresa_id = public.current_empresa_id() AND public.current_rol() IN ('admin','operario'));
CREATE POLICY "pedidos_delete" ON public.pedidos FOR DELETE TO authenticated
  USING (empresa_id = public.current_empresa_id() AND public.es_admin());
