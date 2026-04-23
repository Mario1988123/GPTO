-- 021_presupuestos_rls.sql

ALTER TABLE public.secuencias           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presupuestos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presupuestos_lineas  ENABLE ROW LEVEL SECURITY;

-- secuencias: se tocan solo via la funcion SECURITY DEFINER get_next_sequence.
-- Permitimos SELECT para inspeccion, nada mas.
CREATE POLICY "secuencias_select" ON public.secuencias FOR SELECT TO authenticated
  USING (empresa_id = public.current_empresa_id());

-- presupuestos
CREATE POLICY "presupuestos_select" ON public.presupuestos FOR SELECT TO authenticated
  USING (empresa_id = public.current_empresa_id());
CREATE POLICY "presupuestos_insert" ON public.presupuestos FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.current_empresa_id() AND public.current_rol() IN ('admin','operario'));
CREATE POLICY "presupuestos_update" ON public.presupuestos FOR UPDATE TO authenticated
  USING (empresa_id = public.current_empresa_id() AND public.current_rol() IN ('admin','operario'))
  WITH CHECK (empresa_id = public.current_empresa_id() AND public.current_rol() IN ('admin','operario'));
CREATE POLICY "presupuestos_delete" ON public.presupuestos FOR DELETE TO authenticated
  USING (empresa_id = public.current_empresa_id() AND public.es_admin());

-- presupuestos_lineas (hereda via EXISTS presupuesto -> empresa)
CREATE POLICY "presupuestos_lineas_select" ON public.presupuestos_lineas FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.presupuestos p WHERE p.id = presupuesto_id AND p.empresa_id = public.current_empresa_id()));
CREATE POLICY "presupuestos_lineas_insert" ON public.presupuestos_lineas FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.presupuestos p WHERE p.id = presupuesto_id AND p.empresa_id = public.current_empresa_id()) AND public.current_rol() IN ('admin','operario'));
CREATE POLICY "presupuestos_lineas_update" ON public.presupuestos_lineas FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.presupuestos p WHERE p.id = presupuesto_id AND p.empresa_id = public.current_empresa_id()) AND public.current_rol() IN ('admin','operario'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.presupuestos p WHERE p.id = presupuesto_id AND p.empresa_id = public.current_empresa_id()) AND public.current_rol() IN ('admin','operario'));
CREATE POLICY "presupuestos_lineas_delete" ON public.presupuestos_lineas FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.presupuestos p WHERE p.id = presupuesto_id AND p.empresa_id = public.current_empresa_id()) AND public.current_rol() IN ('admin','operario'));
