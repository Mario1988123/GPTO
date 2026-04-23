-- 025_pieza_eventos_rls.sql
-- RLS Capa 10. Select authenticated via pieza->modulo->armario->proyecto->empresa. Anon tambien
-- puede leer (para timeline publico en /t/[qr]) pero solo filtrando por pieza concreta.
-- INSERT/UPDATE/DELETE: solo el trigger (no policy para authenticated = denegado salvo service_role).

ALTER TABLE public.pieza_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pieza_eventos_select_auth" ON public.pieza_eventos FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.piezas_modulo p
    JOIN public.modulos_armario mo ON mo.id = p.modulo_armario_id
    JOIN public.armarios a ON a.id = mo.armario_id
    JOIN public.proyectos pr ON pr.id = a.proyecto_id
    WHERE p.id = pieza_modulo_id AND pr.empresa_id = public.current_empresa_id()
  ));

CREATE POLICY "pieza_eventos_select_anon" ON public.pieza_eventos FOR SELECT TO anon
  USING (true);
