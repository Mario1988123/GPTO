-- 046_piezas_ajuste_trasera.sql
-- Capa 22 — Fórmula dinámica de laterales/suelos/techos: restar el grosor real de la
-- trasera del módulo (no un valor hardcodeado de 10mm).
--
-- CAMBIO DE BD
-- - Qué cambia: añade ajuste_largo_trasera_grosores e ajuste_ancho_trasera_grosores
--   a tipo_modulo_piezas, y reemplaza regenerar_piezas_modulo para aplicarlos.
-- - Por qué: Mario reportó que un módulo 600×600 con trasera 10mm debe generar
--   laterales con fondo 590, y si la trasera es 16mm deben quedar en 584. La versión
--   anterior solo permitía restar múltiplos del grosor de los tableros, no de la trasera.
-- - Tablas afectadas: tipo_modulo_piezas (aditivo, default 0) + función regenerar_piezas_modulo.
-- - Migración (SQL): la de abajo.
-- - Rollback (SQL): DROP COLUMN + restaurar función 043.
-- - Riesgo: BAJO. Aditivo con default 0, no altera comportamiento existente hasta que
--   se re-ejecute el seed para usar los nuevos campos.

ALTER TABLE public.tipo_modulo_piezas
  ADD COLUMN IF NOT EXISTS ajuste_largo_trasera_grosores INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ajuste_ancho_trasera_grosores INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.tipo_modulo_piezas.ajuste_largo_trasera_grosores IS
  'Nº de grosores de trasera a sumar/restar al largo de la pieza. Ej: -1 en Lateral para restar 1 grosor de trasera del fondo.';
COMMENT ON COLUMN public.tipo_modulo_piezas.ajuste_ancho_trasera_grosores IS
  'Nº de grosores de trasera a sumar/restar al ancho de la pieza.';

-- Reemplazar regenerar_piezas_modulo para aplicar también estos ajustes.
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
      tp.ajuste_largo_trasera_grosores,
      tp.fuente_ancho, tp.ajuste_ancho_mm, tp.ajuste_ancho_grosores, tp.valor_ancho_fijo_mm,
      tp.ajuste_ancho_trasera_grosores,
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
           COALESCE(
             CASE WHEN pc.es_trasera THEN pc.trasera_grosor_mm END,
             CASE WHEN NOT pc.es_trasera THEN pc.tableros_grosor_mm END,
             rt.grosor_mm,
             16
           ) AS grosor,
           -- Grosor efectivo de la trasera (para los ajustes _trasera_grosores).
           -- Si el módulo no lo define, asumimos 10mm (valor tradicional de trasera en armario).
           COALESCE(pc.trasera_grosor_mm, 10) AS grosor_trasera,
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
       END)
       + pr.ajuste_largo_mm
       + pr.ajuste_largo_grosores * pr.grosor
       + pr.ajuste_largo_trasera_grosores * pr.grosor_trasera,
      (CASE pr.fuente_ancho
          WHEN 'ancho' THEN pr.ancho_mm
          WHEN 'alto'  THEN pr.alto_mm
          WHEN 'fondo' THEN pr.fondo_mm
          WHEN 'fijo'  THEN pr.valor_ancho_fijo_mm
       END)
       + pr.ajuste_ancho_mm
       + pr.ajuste_ancho_grosores * pr.grosor
       + pr.ajuste_ancho_trasera_grosores * pr.grosor_trasera,
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
  'Regenera piezas_modulo aplicando jerarquía de grosor y ajustes por grosor de trasera. Ver 046_piezas_ajuste_trasera.sql.';
