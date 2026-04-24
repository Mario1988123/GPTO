-- 043_piezas_grosor_override.sql
-- Capa 19: los módulos pueden sobreescribir el grosor de sus tableros y trasera.
-- Esta migración:
--   1) añade flag es_trasera en tipo_modulo_piezas para distinguir la pieza trasera
--      del resto (que van con tableros_grosor_mm).
--   2) marca como trasera cualquier pieza existente cuyo nombre contenga "trasera".
--   3) reemplaza regenerar_piezas_modulo para aplicar la jerarquía:
--        - si es_trasera=true y mod.trasera_grosor_mm NOT NULL → ese grosor
--        - si mod.tableros_grosor_mm NOT NULL → ese grosor (resto de piezas)
--        - si no → grosor de la referencia_tablero (comportamiento anterior)

ALTER TABLE public.tipo_modulo_piezas
  ADD COLUMN IF NOT EXISTS es_trasera BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.tipo_modulo_piezas.es_trasera IS
  'TRUE si esta pieza es la trasera del módulo. Permite aplicar trasera_grosor_mm del módulo.';

-- Marcar como trasera las piezas existentes por nombre.
UPDATE public.tipo_modulo_piezas
SET es_trasera = TRUE
WHERE LOWER(nombre) LIKE '%trasera%'
  AND es_trasera = FALSE;

-- Reemplazar la función para aplicar los overrides de grosor del módulo.
CREATE OR REPLACE FUNCTION public.regenerar_piezas_modulo(p_modulo_armario_id UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH borrado AS (
    DELETE FROM public.piezas_modulo WHERE modulo_armario_id = p_modulo_armario_id RETURNING 1
  ),
  _ AS (SELECT count(*) FROM borrado),
  m AS (
    SELECT mod.id, mod.tipo_modulo_id,
           mod.ancho_mm,
           (mod.alto_mm / mod.particiones_verticales)::INTEGER AS alto_mm,
           mod.fondo_mm,
           mod.particiones_verticales,
           mod.tableros_grosor_mm,
           mod.trasera_grosor_mm,
           COALESCE(mod.referencia_tablero_id, tm.referencia_tablero_default_id) AS ref_modulo_id
    FROM public.modulos_armario mod
    JOIN public.tipos_modulo tm ON tm.id = mod.tipo_modulo_id
    WHERE mod.id = p_modulo_armario_id
  ),
  piezas_calc AS (
    SELECT
      tp.id AS tipo_pieza_id,
      tp.nombre,
      tp.orden,
      (tp.cantidad * m.particiones_verticales)::INTEGER AS cantidad,
      tp.fuente_largo, tp.ajuste_largo_mm, tp.ajuste_largo_grosores, tp.valor_largo_fijo_mm,
      tp.fuente_ancho, tp.ajuste_ancho_mm, tp.ajuste_ancho_grosores, tp.valor_ancho_fijo_mm,
      COALESCE(tp.referencia_tablero_id, m.ref_modulo_id) AS ref_pieza_id,
      tp.canto_id, tp.lados_con_canto, tp.respeta_veta_override,
      tp.es_trasera,
      m.ancho_mm, m.alto_mm, m.fondo_mm,
      m.tableros_grosor_mm, m.trasera_grosor_mm
    FROM m
    JOIN public.tipo_modulo_piezas tp ON tp.tipo_modulo_id = m.tipo_modulo_id
  ),
  piezas_resueltas AS (
    SELECT pc.*,
           -- Jerarquía de grosor:
           -- 1) trasera_grosor_mm del módulo si es pieza trasera
           -- 2) tableros_grosor_mm del módulo si no es trasera
           -- 3) grosor_mm de la referencia_tablero
           -- 4) 16 mm por defecto
           COALESCE(
             CASE WHEN pc.es_trasera THEN pc.trasera_grosor_mm END,
             CASE WHEN NOT pc.es_trasera THEN pc.tableros_grosor_mm END,
             rt.grosor_mm,
             16
           ) AS grosor,
           rt.respeta_veta AS respeta_veta_ref
    FROM piezas_calc pc
    LEFT JOIN public.referencias_tablero rt ON rt.id = pc.ref_pieza_id
  ),
  insertadas AS (
    INSERT INTO public.piezas_modulo (
      modulo_armario_id, tipo_modulo_pieza_id, nombre, orden, cantidad,
      largo_mm, ancho_mm, grosor_mm,
      referencia_tablero_id, canto_id, lados_con_canto, respeta_veta
    )
    SELECT
      p_modulo_armario_id,
      pr.tipo_pieza_id, pr.nombre, pr.orden, pr.cantidad,
      (CASE pr.fuente_largo
          WHEN 'ancho' THEN pr.ancho_mm
          WHEN 'alto'  THEN pr.alto_mm
          WHEN 'fondo' THEN pr.fondo_mm
          WHEN 'fijo'  THEN pr.valor_largo_fijo_mm
       END) + pr.ajuste_largo_mm + pr.ajuste_largo_grosores * pr.grosor,
      (CASE pr.fuente_ancho
          WHEN 'ancho' THEN pr.ancho_mm
          WHEN 'alto'  THEN pr.alto_mm
          WHEN 'fondo' THEN pr.fondo_mm
          WHEN 'fijo'  THEN pr.valor_ancho_fijo_mm
       END) + pr.ajuste_ancho_mm + pr.ajuste_ancho_grosores * pr.grosor,
      pr.grosor,
      pr.ref_pieza_id,
      pr.canto_id,
      pr.lados_con_canto,
      COALESCE(pr.respeta_veta_override, pr.respeta_veta_ref, false)
    FROM piezas_resueltas pr
    ORDER BY pr.orden
    RETURNING 1
  )
  SELECT count(*)::integer FROM insertadas;
$$;

COMMENT ON FUNCTION public.regenerar_piezas_modulo(UUID) IS
  'Regenera piezas_modulo aplicando jerarquía de grosor: trasera_grosor_mm / tableros_grosor_mm (override por módulo) → grosor_mm de la referencia_tablero.';
