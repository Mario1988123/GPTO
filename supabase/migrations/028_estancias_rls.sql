-- 028_estancias_rls.sql

ALTER TABLE public.estancias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "estancias_select" ON public.estancias FOR SELECT TO authenticated
  USING (empresa_id = public.current_empresa_id());
CREATE POLICY "estancias_insert" ON public.estancias FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.current_empresa_id() AND public.current_rol() IN ('admin','operario'));
CREATE POLICY "estancias_update" ON public.estancias FOR UPDATE TO authenticated
  USING (empresa_id = public.current_empresa_id() AND public.current_rol() IN ('admin','operario'))
  WITH CHECK (empresa_id = public.current_empresa_id() AND public.current_rol() IN ('admin','operario'));
CREATE POLICY "estancias_delete" ON public.estancias FOR DELETE TO authenticated
  USING (empresa_id = public.current_empresa_id() AND public.es_admin());
