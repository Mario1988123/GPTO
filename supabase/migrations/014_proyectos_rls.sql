-- 014_proyectos_rls.sql
-- RLS Capa 4.1. proyectos tiene empresa_id directo; armarios y modulos_armario heredan via EXISTS.

ALTER TABLE public.proyectos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.armarios        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modulos_armario ENABLE ROW LEVEL SECURITY;

-- proyectos
CREATE POLICY "proyectos_select" ON public.proyectos FOR SELECT TO authenticated
  USING (empresa_id = public.current_empresa_id());
CREATE POLICY "proyectos_insert" ON public.proyectos FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.current_empresa_id() AND public.current_rol() IN ('admin','operario'));
CREATE POLICY "proyectos_update" ON public.proyectos FOR UPDATE TO authenticated
  USING (empresa_id = public.current_empresa_id() AND public.current_rol() IN ('admin','operario'))
  WITH CHECK (empresa_id = public.current_empresa_id() AND public.current_rol() IN ('admin','operario'));
CREATE POLICY "proyectos_delete" ON public.proyectos FOR DELETE TO authenticated
  USING (empresa_id = public.current_empresa_id() AND public.es_admin());

-- armarios (hereda empresa del proyecto)
CREATE POLICY "armarios_select" ON public.armarios FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.proyectos p WHERE p.id = proyecto_id AND p.empresa_id = public.current_empresa_id()));
CREATE POLICY "armarios_insert" ON public.armarios FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.proyectos p WHERE p.id = proyecto_id AND p.empresa_id = public.current_empresa_id()) AND public.current_rol() IN ('admin','operario'));
CREATE POLICY "armarios_update" ON public.armarios FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.proyectos p WHERE p.id = proyecto_id AND p.empresa_id = public.current_empresa_id()) AND public.current_rol() IN ('admin','operario'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.proyectos p WHERE p.id = proyecto_id AND p.empresa_id = public.current_empresa_id()) AND public.current_rol() IN ('admin','operario'));
CREATE POLICY "armarios_delete" ON public.armarios FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.proyectos p WHERE p.id = proyecto_id AND p.empresa_id = public.current_empresa_id()) AND public.es_admin());

-- modulos_armario (hereda empresa del armario → proyecto)
CREATE POLICY "modulos_armario_select" ON public.modulos_armario FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.armarios a
    JOIN public.proyectos p ON p.id = a.proyecto_id
    WHERE a.id = armario_id AND p.empresa_id = public.current_empresa_id()));
CREATE POLICY "modulos_armario_insert" ON public.modulos_armario FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.armarios a
    JOIN public.proyectos p ON p.id = a.proyecto_id
    WHERE a.id = armario_id AND p.empresa_id = public.current_empresa_id()) AND public.current_rol() IN ('admin','operario'));
CREATE POLICY "modulos_armario_update" ON public.modulos_armario FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.armarios a
    JOIN public.proyectos p ON p.id = a.proyecto_id
    WHERE a.id = armario_id AND p.empresa_id = public.current_empresa_id()) AND public.current_rol() IN ('admin','operario'))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.armarios a
    JOIN public.proyectos p ON p.id = a.proyecto_id
    WHERE a.id = armario_id AND p.empresa_id = public.current_empresa_id()) AND public.current_rol() IN ('admin','operario'));
CREATE POLICY "modulos_armario_delete" ON public.modulos_armario FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.armarios a
    JOIN public.proyectos p ON p.id = a.proyecto_id
    WHERE a.id = armario_id AND p.empresa_id = public.current_empresa_id()) AND public.es_admin());
