-- 019_particiones_verticales.sql
-- Capa 6.3: permitir apilar un módulo en N particiones verticales.
-- Un modulo_armario con particiones_verticales=2 se fabrica como 2 modulos fisicos apilados
-- de alto_mm/2 cada uno. Las piezas se generan como si fuese un modulo de alto_mm/2
-- pero multiplicando cantidad x particiones.

ALTER TABLE public.modulos_armario
  ADD COLUMN particiones_verticales INTEGER NOT NULL DEFAULT 1
  CHECK (particiones_verticales >= 1 AND particiones_verticales <= 10);

COMMENT ON COLUMN public.modulos_armario.particiones_verticales IS
  'Num de modulos fisicos apilados verticalmente. 1 = modulo entero. N>1 = se fabrica como N modulos de alto_mm/N cada uno.';

-- Reemplazar regenerar_piezas_modulo para aplicar particiones.
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
           -- Alto efectivo = alto_total / particiones. Cada particion se fabrica
           -- como un modulo independiente de este alto.
           (mod.alto_mm / mod.particiones_verticales)::INTEGER AS alto_mm,
           mod.fondo_mm,
           mod.particiones_verticales,
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
      -- Multiplicar cantidad por particiones: si un modulo lleva 2 laterales
      -- y tiene 3 particiones, son 6 laterales en total.
      (tp.cantidad * m.particiones_verticales)::INTEGER AS cantidad,
      tp.fuente_largo, tp.ajuste_largo_mm, tp.ajuste_largo_grosores, tp.valor_largo_fijo_mm,
      tp.fuente_ancho, tp.ajuste_ancho_mm, tp.ajuste_ancho_grosores, tp.valor_ancho_fijo_mm,
      COALESCE(tp.referencia_tablero_id, m.ref_modulo_id) AS ref_pieza_id,
      tp.canto_id, tp.lados_con_canto, tp.respeta_veta_override,
      m.ancho_mm, m.alto_mm, m.fondo_mm
    FROM m
    JOIN public.tipo_modulo_piezas tp ON tp.tipo_modulo_id = m.tipo_modulo_id
  ),
  piezas_resueltas AS (
    SELECT pc.*, COALESCE(rt.grosor_mm, 16) AS grosor,
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
