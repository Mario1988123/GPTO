-- 012_tipos_modulo_rls.sql
-- RLS Capa 3. tipos_modulo tiene empresa_id directo; las otras dos heredan via EXISTS.

ALTER TABLE public.tipos_modulo          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipo_modulo_piezas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipo_modulo_herrajes  ENABLE ROW LEVEL SECURITY;

-- tipos_modulo
CREATE POLICY "tipos_modulo_select" ON public.tipos_modulo FOR SELECT TO authenticated
  USING (empresa_id = public.current_empresa_id());
CREATE POLICY "tipos_modulo_insert" ON public.tipos_modulo FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.current_empresa_id() AND public.current_rol() IN ('admin','operario'));
CREATE POLICY "tipos_modulo_update" ON public.tipos_modulo FOR UPDATE TO authenticated
  USING (empresa_id = public.current_empresa_id() AND public.current_rol() IN ('admin','operario'))
  WITH CHECK (empresa_id = public.current_empresa_id() AND public.current_rol() IN ('admin','operario'));
CREATE POLICY "tipos_modulo_delete" ON public.tipos_modulo FOR DELETE TO authenticated
  USING (empresa_id = public.current_empresa_id() AND public.es_admin());

-- tipo_modulo_piezas (hereda empresa del tipo_modulo padre)
CREATE POLICY "tipo_modulo_piezas_select" ON public.tipo_modulo_piezas FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tipos_modulo tm WHERE tm.id = tipo_modulo_id AND tm.empresa_id = public.current_empresa_id()));
CREATE POLICY "tipo_modulo_piezas_insert" ON public.tipo_modulo_piezas FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.tipos_modulo tm WHERE tm.id = tipo_modulo_id AND tm.empresa_id = public.current_empresa_id())
    AND public.current_rol() IN ('admin','operario'));
CREATE POLICY "tipo_modulo_piezas_update" ON public.tipo_modulo_piezas FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tipos_modulo tm WHERE tm.id = tipo_modulo_id AND tm.empresa_id = public.current_empresa_id()) AND public.current_rol() IN ('admin','operario'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tipos_modulo tm WHERE tm.id = tipo_modulo_id AND tm.empresa_id = public.current_empresa_id()) AND public.current_rol() IN ('admin','operario'));
CREATE POLICY "tipo_modulo_piezas_delete" ON public.tipo_modulo_piezas FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tipos_modulo tm WHERE tm.id = tipo_modulo_id AND tm.empresa_id = public.current_empresa_id()) AND public.es_admin());

-- tipo_modulo_herrajes
CREATE POLICY "tipo_modulo_herrajes_select" ON public.tipo_modulo_herrajes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tipos_modulo tm WHERE tm.id = tipo_modulo_id AND tm.empresa_id = public.current_empresa_id()));
CREATE POLICY "tipo_modulo_herrajes_insert" ON public.tipo_modulo_herrajes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.tipos_modulo tm WHERE tm.id = tipo_modulo_id AND tm.empresa_id = public.current_empresa_id()) AND public.current_rol() IN ('admin','operario'));
CREATE POLICY "tipo_modulo_herrajes_update" ON public.tipo_modulo_herrajes FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tipos_modulo tm WHERE tm.id = tipo_modulo_id AND tm.empresa_id = public.current_empresa_id()) AND public.current_rol() IN ('admin','operario'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tipos_modulo tm WHERE tm.id = tipo_modulo_id AND tm.empresa_id = public.current_empresa_id()) AND public.current_rol() IN ('admin','operario'));
CREATE POLICY "tipo_modulo_herrajes_delete" ON public.tipo_modulo_herrajes FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tipos_modulo tm WHERE tm.id = tipo_modulo_id AND tm.empresa_id = public.current_empresa_id()) AND public.es_admin());
