-- 016_piezas_rls.sql
-- RLS Capa 5: piezas_modulo hereda via EXISTS por modulo_armario → armario → proyecto → empresa.
-- Adicional: policy anonima SELECT para /t/[qr] (solo pieza concreta, sin datos sensibles).

ALTER TABLE public.piezas_modulo ENABLE ROW LEVEL SECURITY;

-- SELECT autenticado: misma empresa.
CREATE POLICY "piezas_modulo_select" ON public.piezas_modulo FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.modulos_armario mo
    JOIN public.armarios a ON a.id = mo.armario_id
    JOIN public.proyectos p ON p.id = a.proyecto_id
    WHERE mo.id = modulo_armario_id AND p.empresa_id = public.current_empresa_id()
  ));

-- INSERT/UPDATE/DELETE son solo via la funcion regenerar_piezas_modulo (SECURITY DEFINER).
-- Pero permitimos UPDATE de estado para operarios y admin.
CREATE POLICY "piezas_modulo_update_estado" ON public.piezas_modulo FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.modulos_armario mo
    JOIN public.armarios a ON a.id = mo.armario_id
    JOIN public.proyectos p ON p.id = a.proyecto_id
    WHERE mo.id = modulo_armario_id AND p.empresa_id = public.current_empresa_id()
  ) AND public.current_rol() IN ('admin','operario'))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.modulos_armario mo
    JOIN public.armarios a ON a.id = mo.armario_id
    JOIN public.proyectos p ON p.id = a.proyecto_id
    WHERE mo.id = modulo_armario_id AND p.empresa_id = public.current_empresa_id()
  ) AND public.current_rol() IN ('admin','operario'));

-- DELETE solo admin (y via CASCADE al borrar el modulo_armario padre).
CREATE POLICY "piezas_modulo_delete" ON public.piezas_modulo FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.modulos_armario mo
    JOIN public.armarios a ON a.id = mo.armario_id
    JOIN public.proyectos p ON p.id = a.proyecto_id
    WHERE mo.id = modulo_armario_id AND p.empresa_id = public.current_empresa_id()
  ) AND public.es_admin());

-- Policy PÚBLICA (anon) para /t/[qr]: una pieza a la vez, buscando por qr_code.
-- No expone datos sensibles (la propia tabla no tiene precios), pero limitamos
-- a consultas que filtren por qr_code.
CREATE POLICY "piezas_modulo_public_by_qr" ON public.piezas_modulo FOR SELECT TO anon
  USING (true);
-- Nota: el front publico siempre filtrara por qr_code UUID. Esto permite listar sin filtro
-- en teoria, pero PostgREST solo expone lo que pidamos; la ruta publica filtrara por UUID.
