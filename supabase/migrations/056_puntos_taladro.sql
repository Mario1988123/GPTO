-- 056_puntos_taladro.sql
-- Capa 25 — Plano de montaje con puntos de taladro por pieza.
--
-- CAMBIO DE BD
-- - Tabla nueva: pieza_puntos_taladro.
-- - Cada pieza_modulo puede tener N puntos de taladro definidos por (x_mm, y_mm)
--   en su sistema de coordenadas local (esquina inf-izq de la pieza = 0,0).
-- - Tipo: bornes (montaje del módulo), balda (atornillar balda fija), tope_balda
--   (apoyos regulables), barra (soporte de barra de colgar), bisagra, tirador,
--   guia_cajon, otro.
-- - cara: "frontal" o "trasera" o "lateral" (qué cara de la pieza se taladra).
-- - profundidad_mm para taladros pasantes vs ciegos.
-- - Riesgo: BAJO. Tabla nueva, no toca nada.

CREATE TABLE IF NOT EXISTS public.pieza_puntos_taladro (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  pieza_modulo_id UUID NOT NULL REFERENCES public.piezas_modulo(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL CHECK (tipo IN (
                    'union_modulo','balda','tope_balda','barra','bisagra',
                    'tirador','guia_cajon','led','otro'
                  )),
  cara            TEXT NOT NULL DEFAULT 'frontal' CHECK (cara IN ('frontal','trasera','lateral_izq','lateral_dcho','superior','inferior')),
  x_mm            NUMERIC(8,2) NOT NULL,
  y_mm            NUMERIC(8,2) NOT NULL,
  diametro_mm     NUMERIC(5,2) NOT NULL DEFAULT 5,
  profundidad_mm  NUMERIC(5,2),
  pasante         BOOLEAN NOT NULL DEFAULT FALSE,
  notas           TEXT,
  generado_auto   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ppt_pieza_idx   ON public.pieza_puntos_taladro(pieza_modulo_id);
CREATE INDEX IF NOT EXISTS ppt_empresa_idx ON public.pieza_puntos_taladro(empresa_id);

DROP TRIGGER IF EXISTS ppt_touch_updated_at ON public.pieza_puntos_taladro;
CREATE TRIGGER ppt_touch_updated_at BEFORE UPDATE ON public.pieza_puntos_taladro
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS ppt_autofill_empresa ON public.pieza_puntos_taladro;
CREATE TRIGGER ppt_autofill_empresa BEFORE INSERT ON public.pieza_puntos_taladro
  FOR EACH ROW EXECUTE FUNCTION public.autofill_empresa_id();

ALTER TABLE public.pieza_puntos_taladro ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ppt_all ON public.pieza_puntos_taladro;
CREATE POLICY ppt_all ON public.pieza_puntos_taladro FOR ALL TO authenticated
  USING (empresa_id = public.current_empresa_id())
  WITH CHECK (empresa_id = public.current_empresa_id());

COMMENT ON TABLE public.pieza_puntos_taladro IS
  'Puntos de taladro de cada pieza para el plano de montaje. Coordenadas en mm desde la esquina inferior-izquierda de la pieza.';

-- Función auxiliar: genera puntos de taladro estándar para una pieza según su nombre y subelementos.
-- Heurística sencilla: piezas tipo "Lateral" reciben taladros para suelo/techo y para cada subelemento
-- (balda, barra) que lo requiera. La idea es que el carpintero pueda aceptar/ajustar/borrar manualmente.
CREATE OR REPLACE FUNCTION public.regenerar_puntos_taladro_pieza(p_pieza_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_pieza RECORD;
  v_modulo RECORD;
  v_total INTEGER := 0;
  v_sub RECORD;
  v_y NUMERIC;
BEGIN
  SELECT pm.id, pm.nombre, pm.largo_mm, pm.ancho_mm, pm.modulo_armario_id, pm.tipo_modulo_pieza_id,
         tmp.es_trasera
    INTO v_pieza
    FROM piezas_modulo pm
    LEFT JOIN tipo_modulo_piezas tmp ON tmp.id = pm.tipo_modulo_pieza_id
   WHERE pm.id = p_pieza_id;
  IF v_pieza IS NULL THEN RETURN 0; END IF;

  SELECT m.id, m.alto_mm, m.ancho_mm, m.fondo_mm, m.tableros_grosor_mm
    INTO v_modulo
    FROM modulos_armario m
   WHERE m.id = v_pieza.modulo_armario_id;
  IF v_modulo IS NULL THEN RETURN 0; END IF;

  -- Borrar los generados auto previos (se respetan los manuales)
  DELETE FROM pieza_puntos_taladro WHERE pieza_modulo_id = p_pieza_id AND generado_auto = TRUE;

  -- Si la pieza es Lateral: añadir taladros para suelo y techo (sistema 32mm) + subelementos.
  IF lower(v_pieza.nombre) LIKE '%lateral%' THEN
    -- Suelo y techo: 2 taladros cada uno a 32mm de los bordes superior e inferior.
    INSERT INTO pieza_puntos_taladro (pieza_modulo_id, tipo, cara, x_mm, y_mm, diametro_mm, profundidad_mm, generado_auto)
    VALUES
      (p_pieza_id, 'union_modulo', 'lateral_izq', 50,  32, 5, 13, TRUE),
      (p_pieza_id, 'union_modulo', 'lateral_izq', GREATEST(v_pieza.ancho_mm - 50, 50), 32, 5, 13, TRUE),
      (p_pieza_id, 'union_modulo', 'lateral_izq', 50,  GREATEST(v_pieza.largo_mm - 32, 32), 5, 13, TRUE),
      (p_pieza_id, 'union_modulo', 'lateral_izq', GREATEST(v_pieza.ancho_mm - 50, 50), GREATEST(v_pieza.largo_mm - 32, 32), 5, 13, TRUE);
    v_total := v_total + 4;

    -- Por cada balda/barra del módulo añadir un par de taladros a la altura correspondiente.
    FOR v_sub IN
      SELECT tipo, alto_mm, orden
        FROM modulo_subelementos
       WHERE modulo_id = v_modulo.id
         AND tipo IN ('balda_fija','balda_regulable','barra_colgar')
       ORDER BY orden
    LOOP
      -- Estimación de altura acumulada (simplificada: suma alto_mm de los previos).
      SELECT COALESCE(SUM(alto_mm), 0) INTO v_y
        FROM modulo_subelementos
       WHERE modulo_id = v_modulo.id AND orden < v_sub.orden;
      v_y := COALESCE(v_y, 0) + COALESCE(v_sub.alto_mm, 0) / 2;

      IF v_sub.tipo = 'balda_fija' THEN
        INSERT INTO pieza_puntos_taladro (pieza_modulo_id, tipo, cara, x_mm, y_mm, diametro_mm, profundidad_mm, generado_auto)
        VALUES
          (p_pieza_id, 'balda', 'lateral_izq', 50,  v_y, 5, 13, TRUE),
          (p_pieza_id, 'balda', 'lateral_izq', GREATEST(v_pieza.ancho_mm - 50, 50), v_y, 5, 13, TRUE);
        v_total := v_total + 2;
      ELSIF v_sub.tipo = 'balda_regulable' THEN
        -- 4 topes para balda regulable
        INSERT INTO pieza_puntos_taladro (pieza_modulo_id, tipo, cara, x_mm, y_mm, diametro_mm, profundidad_mm, generado_auto)
        VALUES
          (p_pieza_id, 'tope_balda', 'lateral_izq', 50,  v_y - 30, 5, 13, TRUE),
          (p_pieza_id, 'tope_balda', 'lateral_izq', 50,  v_y + 30, 5, 13, TRUE),
          (p_pieza_id, 'tope_balda', 'lateral_izq', GREATEST(v_pieza.ancho_mm - 50, 50), v_y - 30, 5, 13, TRUE),
          (p_pieza_id, 'tope_balda', 'lateral_izq', GREATEST(v_pieza.ancho_mm - 50, 50), v_y + 30, 5, 13, TRUE);
        v_total := v_total + 4;
      ELSIF v_sub.tipo = 'barra_colgar' THEN
        INSERT INTO pieza_puntos_taladro (pieza_modulo_id, tipo, cara, x_mm, y_mm, diametro_mm, profundidad_mm, generado_auto)
        VALUES
          (p_pieza_id, 'barra', 'lateral_izq', v_pieza.ancho_mm / 2, v_y, 25, 15, TRUE);
        v_total := v_total + 1;
      END IF;
    END LOOP;
  END IF;

  RETURN v_total;
END;
$func$;

COMMENT ON FUNCTION public.regenerar_puntos_taladro_pieza IS
  'Heurística simple para pre-generar puntos de taladro de una pieza Lateral según los subelementos del módulo. El carpintero ajusta manualmente.';
