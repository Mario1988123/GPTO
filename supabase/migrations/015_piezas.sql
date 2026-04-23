-- 015_piezas.sql
-- Capa 5: tabla piezas_modulo (cache materializada al explosionar un módulo) + función regenerar.
-- Cada pieza tiene qr_code UUID único para trazabilidad pública via /t/[qr].

CREATE TABLE public.piezas_modulo (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo_armario_id      UUID NOT NULL REFERENCES public.modulos_armario(id) ON DELETE CASCADE,
  tipo_modulo_pieza_id   UUID REFERENCES public.tipo_modulo_piezas(id) ON DELETE SET NULL,
  nombre                 TEXT NOT NULL,
  orden                  INTEGER NOT NULL DEFAULT 0,
  cantidad               INTEGER NOT NULL CHECK (cantidad > 0),
  largo_mm               INTEGER NOT NULL CHECK (largo_mm > 0),
  ancho_mm               INTEGER NOT NULL CHECK (ancho_mm > 0),
  grosor_mm              INTEGER NOT NULL CHECK (grosor_mm > 0),
  referencia_tablero_id  UUID REFERENCES public.referencias_tablero(id) ON DELETE SET NULL,
  canto_id               UUID REFERENCES public.cantos(id) ON DELETE SET NULL,
  lados_con_canto        TEXT NOT NULL DEFAULT 'ninguno'
                          CHECK (lados_con_canto IN ('ninguno','1','2_opuestos','2_contiguos','3','4')),
  respeta_veta           BOOLEAN NOT NULL DEFAULT false,
  qr_code                UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  estado                 TEXT NOT NULL DEFAULT 'pendiente'
                          CHECK (estado IN ('pendiente','cortada','producida','entregada')),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX piezas_modulo_modulo_idx ON public.piezas_modulo(modulo_armario_id, orden);
CREATE INDEX piezas_modulo_estado_idx ON public.piezas_modulo(estado);
CREATE TRIGGER piezas_modulo_touch_updated_at BEFORE UPDATE ON public.piezas_modulo
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

COMMENT ON TABLE public.piezas_modulo IS
  'Cache materializada de piezas fisicas al explosionar un modulo. Cada pieza tiene QR para trazabilidad.';

-- Función: recalcula las piezas de un módulo aplicando las fórmulas del tipo_modulo.
-- SECURITY DEFINER para que las RLS no bloqueen INSERT/DELETE desde la función.
CREATE OR REPLACE FUNCTION public.regenerar_piezas_modulo(p_modulo_armario_id UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH borrado AS (
    DELETE FROM public.piezas_modulo WHERE modulo_armario_id = p_modulo_armario_id RETURNING 1
  ),
  m AS (
    SELECT mod.id, mod.tipo_modulo_id, mod.ancho_mm, mod.alto_mm, mod.fondo_mm,
           COALESCE(mod.referencia_tablero_id, tm.referencia_tablero_default_id) AS ref_modulo_id
    FROM public.modulos_armario mod
    JOIN public.tipos_modulo tm ON tm.id = mod.tipo_modulo_id
    WHERE mod.id = p_modulo_armario_id
  ),
  piezas_calc AS (
    SELECT
      tp.id AS tipo_pieza_id,
      tp.nombre, tp.orden, tp.cantidad,
      tp.fuente_largo, tp.ajuste_largo_mm, tp.ajuste_largo_grosores, tp.valor_largo_fijo_mm,
      tp.fuente_ancho, tp.ajuste_ancho_mm, tp.ajuste_ancho_grosores, tp.valor_ancho_fijo_mm,
      COALESCE(tp.referencia_tablero_id, m.ref_modulo_id) AS ref_pieza_id,
      tp.canto_id, tp.lados_con_canto, tp.respeta_veta_override,
      m.ancho_mm, m.alto_mm, m.fondo_mm
    FROM m
    JOIN public.tipo_modulo_piezas tp ON tp.tipo_modulo_id = m.tipo_modulo_id
  ),
  piezas_resueltas AS (
    SELECT
      pc.*,
      COALESCE(rt.grosor_mm, 16) AS grosor,
      rt.respeta_veta AS respeta_veta_ref
    FROM piezas_calc pc
    LEFT JOIN public.referencias_tablero rt ON rt.id = pc.ref_pieza_id
  )
  INSERT INTO public.piezas_modulo (
    modulo_armario_id, tipo_modulo_pieza_id, nombre, orden, cantidad,
    largo_mm, ancho_mm, grosor_mm,
    referencia_tablero_id, canto_id, lados_con_canto, respeta_veta
  )
  SELECT
    p_modulo_armario_id,
    pr.tipo_pieza_id,
    pr.nombre,
    pr.orden,
    pr.cantidad,
    (CASE pr.fuente_largo
        WHEN 'ancho' THEN pr.ancho_mm
        WHEN 'alto'  THEN pr.alto_mm
        WHEN 'fondo' THEN pr.fondo_mm
        WHEN 'fijo'  THEN pr.valor_largo_fijo_mm
     END
    ) + pr.ajuste_largo_mm + pr.ajuste_largo_grosores * pr.grosor,
    (CASE pr.fuente_ancho
        WHEN 'ancho' THEN pr.ancho_mm
        WHEN 'alto'  THEN pr.alto_mm
        WHEN 'fondo' THEN pr.fondo_mm
        WHEN 'fijo'  THEN pr.valor_ancho_fijo_mm
     END
    ) + pr.ajuste_ancho_mm + pr.ajuste_ancho_grosores * pr.grosor,
    pr.grosor,
    pr.ref_pieza_id,
    pr.canto_id,
    pr.lados_con_canto,
    COALESCE(pr.respeta_veta_override, pr.respeta_veta_ref, false)
  FROM (SELECT count(*) FROM borrado) b, piezas_resueltas pr
  ORDER BY pr.orden
  RETURNING 1
$$;

-- Nota: la función devuelve INTEGER pero con `RETURNING 1` en INSERT y `RETURNS INTEGER`
-- postgres devuelve el conteo. Si se usa el resultado como ROWCOUNT hay que envolver en CTE final.
-- Simplificación: si solo necesitamos el conteo, en lugar de RETURNING 1 hacemos SELECT count(*).

-- Versión que devuelve conteo garantizado:
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
    SELECT mod.id, mod.tipo_modulo_id, mod.ancho_mm, mod.alto_mm, mod.fondo_mm,
           COALESCE(mod.referencia_tablero_id, tm.referencia_tablero_default_id) AS ref_modulo_id
    FROM public.modulos_armario mod
    JOIN public.tipos_modulo tm ON tm.id = mod.tipo_modulo_id
    WHERE mod.id = p_modulo_armario_id
  ),
  piezas_calc AS (
    SELECT
      tp.id AS tipo_pieza_id,
      tp.nombre, tp.orden, tp.cantidad,
      tp.fuente_largo, tp.ajuste_largo_mm, tp.ajuste_largo_grosores, tp.valor_largo_fijo_mm,
      tp.fuente_ancho, tp.ajuste_ancho_mm, tp.ajuste_ancho_grosores, tp.valor_ancho_fijo_mm,
      COALESCE(tp.referencia_tablero_id, m.ref_modulo_id) AS ref_pieza_id,
      tp.canto_id, tp.lados_con_canto, tp.respeta_veta_override,
      m.ancho_mm, m.alto_mm, m.fondo_mm
    FROM m
    JOIN public.tipo_modulo_piezas tp ON tp.tipo_modulo_id = m.tipo_modulo_id
  ),
  piezas_resueltas AS (
    SELECT
      pc.*,
      COALESCE(rt.grosor_mm, 16) AS grosor,
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
  'Recalcula y persiste las piezas fisicas de un modulo aplicando las formulas del tipo_modulo.';
