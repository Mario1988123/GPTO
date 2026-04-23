-- 018_nesting_rls.sql
-- RLS Capa 6.1.

ALTER TABLE public.tableros_corte     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.piezas_en_tablero  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recortes           ENABLE ROW LEVEL SECURITY;

-- tableros_corte (empresa directa)
CREATE POLICY "tableros_corte_select" ON public.tableros_corte FOR SELECT TO authenticated
  USING (empresa_id = public.current_empresa_id());
CREATE POLICY "tableros_corte_insert" ON public.tableros_corte FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.current_empresa_id() AND public.current_rol() IN ('admin','operario'));
CREATE POLICY "tableros_corte_update" ON public.tableros_corte FOR UPDATE TO authenticated
  USING (empresa_id = public.current_empresa_id() AND public.current_rol() IN ('admin','operario'))
  WITH CHECK (empresa_id = public.current_empresa_id() AND public.current_rol() IN ('admin','operario'));
CREATE POLICY "tableros_corte_delete" ON public.tableros_corte FOR DELETE TO authenticated
  USING (empresa_id = public.current_empresa_id() AND public.current_rol() IN ('admin','operario'));

-- piezas_en_tablero (via tableros_corte)
CREATE POLICY "piezas_en_tablero_select" ON public.piezas_en_tablero FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tableros_corte t WHERE t.id = tablero_corte_id AND t.empresa_id = public.current_empresa_id()));
CREATE POLICY "piezas_en_tablero_insert" ON public.piezas_en_tablero FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.tableros_corte t WHERE t.id = tablero_corte_id AND t.empresa_id = public.current_empresa_id()) AND public.current_rol() IN ('admin','operario'));
CREATE POLICY "piezas_en_tablero_update" ON public.piezas_en_tablero FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tableros_corte t WHERE t.id = tablero_corte_id AND t.empresa_id = public.current_empresa_id()) AND public.current_rol() IN ('admin','operario'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tableros_corte t WHERE t.id = tablero_corte_id AND t.empresa_id = public.current_empresa_id()) AND public.current_rol() IN ('admin','operario'));
CREATE POLICY "piezas_en_tablero_delete" ON public.piezas_en_tablero FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tableros_corte t WHERE t.id = tablero_corte_id AND t.empresa_id = public.current_empresa_id()) AND public.current_rol() IN ('admin','operario'));

-- recortes (empresa directa)
CREATE POLICY "recortes_select" ON public.recortes FOR SELECT TO authenticated
  USING (empresa_id = public.current_empresa_id());
CREATE POLICY "recortes_insert" ON public.recortes FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.current_empresa_id() AND public.current_rol() IN ('admin','operario'));
CREATE POLICY "recortes_update" ON public.recortes FOR UPDATE TO authenticated
  USING (empresa_id = public.current_empresa_id() AND public.current_rol() IN ('admin','operario'))
  WITH CHECK (empresa_id = public.current_empresa_id() AND public.current_rol() IN ('admin','operario'));
CREATE POLICY "recortes_delete" ON public.recortes FOR DELETE TO authenticated
  USING (empresa_id = public.current_empresa_id() AND public.es_admin());
