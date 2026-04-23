-- 009_catalogo_rls.sql
-- RLS para las 6 tablas de Capa 2. Mismo patrón: aislamiento por empresa_id.
-- SELECT: cualquier authenticated de la empresa.
-- INSERT/UPDATE: admin u operario.
-- DELETE: solo admin (el flujo principal es soft delete con activo=false).

-- ============================== enable RLS ==============================
ALTER TABLE public.proveedores          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiales           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acabados             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referencias_tablero  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cantos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.herrajes             ENABLE ROW LEVEL SECURITY;

-- ============================== policies generator ==============================
-- 6 tablas × 4 policies (SELECT, INSERT, UPDATE, DELETE) = 24 policies. Idéntico patrón.

-- ---------- proveedores ----------
CREATE POLICY "proveedores_select" ON public.proveedores FOR SELECT TO authenticated
  USING (empresa_id = public.current_empresa_id());
CREATE POLICY "proveedores_insert" ON public.proveedores FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.current_empresa_id() AND public.current_rol() IN ('admin','operario'));
CREATE POLICY "proveedores_update" ON public.proveedores FOR UPDATE TO authenticated
  USING (empresa_id = public.current_empresa_id() AND public.current_rol() IN ('admin','operario'))
  WITH CHECK (empresa_id = public.current_empresa_id() AND public.current_rol() IN ('admin','operario'));
CREATE POLICY "proveedores_delete" ON public.proveedores FOR DELETE TO authenticated
  USING (empresa_id = public.current_empresa_id() AND public.es_admin());

-- ---------- materiales ----------
CREATE POLICY "materiales_select" ON public.materiales FOR SELECT TO authenticated
  USING (empresa_id = public.current_empresa_id());
CREATE POLICY "materiales_insert" ON public.materiales FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.current_empresa_id() AND public.current_rol() IN ('admin','operario'));
CREATE POLICY "materiales_update" ON public.materiales FOR UPDATE TO authenticated
  USING (empresa_id = public.current_empresa_id() AND public.current_rol() IN ('admin','operario'))
  WITH CHECK (empresa_id = public.current_empresa_id() AND public.current_rol() IN ('admin','operario'));
CREATE POLICY "materiales_delete" ON public.materiales FOR DELETE TO authenticated
  USING (empresa_id = public.current_empresa_id() AND public.es_admin());

-- ---------- acabados ----------
CREATE POLICY "acabados_select" ON public.acabados FOR SELECT TO authenticated
  USING (empresa_id = public.current_empresa_id());
CREATE POLICY "acabados_insert" ON public.acabados FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.current_empresa_id() AND public.current_rol() IN ('admin','operario'));
CREATE POLICY "acabados_update" ON public.acabados FOR UPDATE TO authenticated
  USING (empresa_id = public.current_empresa_id() AND public.current_rol() IN ('admin','operario'))
  WITH CHECK (empresa_id = public.current_empresa_id() AND public.current_rol() IN ('admin','operario'));
CREATE POLICY "acabados_delete" ON public.acabados FOR DELETE TO authenticated
  USING (empresa_id = public.current_empresa_id() AND public.es_admin());

-- ---------- referencias_tablero ----------
CREATE POLICY "referencias_tablero_select" ON public.referencias_tablero FOR SELECT TO authenticated
  USING (empresa_id = public.current_empresa_id());
CREATE POLICY "referencias_tablero_insert" ON public.referencias_tablero FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.current_empresa_id() AND public.current_rol() IN ('admin','operario'));
CREATE POLICY "referencias_tablero_update" ON public.referencias_tablero FOR UPDATE TO authenticated
  USING (empresa_id = public.current_empresa_id() AND public.current_rol() IN ('admin','operario'))
  WITH CHECK (empresa_id = public.current_empresa_id() AND public.current_rol() IN ('admin','operario'));
CREATE POLICY "referencias_tablero_delete" ON public.referencias_tablero FOR DELETE TO authenticated
  USING (empresa_id = public.current_empresa_id() AND public.es_admin());

-- ---------- cantos ----------
CREATE POLICY "cantos_select" ON public.cantos FOR SELECT TO authenticated
  USING (empresa_id = public.current_empresa_id());
CREATE POLICY "cantos_insert" ON public.cantos FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.current_empresa_id() AND public.current_rol() IN ('admin','operario'));
CREATE POLICY "cantos_update" ON public.cantos FOR UPDATE TO authenticated
  USING (empresa_id = public.current_empresa_id() AND public.current_rol() IN ('admin','operario'))
  WITH CHECK (empresa_id = public.current_empresa_id() AND public.current_rol() IN ('admin','operario'));
CREATE POLICY "cantos_delete" ON public.cantos FOR DELETE TO authenticated
  USING (empresa_id = public.current_empresa_id() AND public.es_admin());

-- ---------- herrajes ----------
CREATE POLICY "herrajes_select" ON public.herrajes FOR SELECT TO authenticated
  USING (empresa_id = public.current_empresa_id());
CREATE POLICY "herrajes_insert" ON public.herrajes FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.current_empresa_id() AND public.current_rol() IN ('admin','operario'));
CREATE POLICY "herrajes_update" ON public.herrajes FOR UPDATE TO authenticated
  USING (empresa_id = public.current_empresa_id() AND public.current_rol() IN ('admin','operario'))
  WITH CHECK (empresa_id = public.current_empresa_id() AND public.current_rol() IN ('admin','operario'));
CREATE POLICY "herrajes_delete" ON public.herrajes FOR DELETE TO authenticated
  USING (empresa_id = public.current_empresa_id() AND public.es_admin());
