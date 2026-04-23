/**
 * MaxRects 2D bin-packing (Best Short Side Fit).
 *
 * Entrada: piezas con ancho/alto y flag de rotación permitida (=veta no respetada),
 *         tablero útil (W x H) y kerf (espacio entre cortes).
 * Salida: piezas colocadas con (x,y,rotada) + recortes residuales.
 *
 * El tablero se considera útil (ya descontada merma). Kerf se trata añadiendo
 * kerf_mm al ancho y largo de cada pieza al probar si cabe — así garantiza
 * separación real entre cortes.
 */

export type PiezaInput = {
  key: string;             // identifica la pieza (usaremos `${pieza_modulo_id}#${ocurrencia}`)
  w_mm: number;            // largo (dim 1)
  h_mm: number;            // ancho (dim 2)
  canRotate: boolean;      // true si respeta_veta == false
};

export type Coloc = {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotada: boolean;
};

export type Rect = { x: number; y: number; w: number; h: number };

export type Resultado = {
  colocadas: Coloc[];
  noColocadas: PiezaInput[];
  recortes: Rect[]; // rects libres al final (candidatos a recorte aprovechable)
};

/** Empaca un conjunto de piezas en un único tablero. */
export function empacarTablero(
  piezas: PiezaInput[],
  W: number,
  H: number,
  kerf_mm: number,
): Resultado {
  // Ordenar por el lado más largo (descendente) suele dar mejores resultados.
  const pendientes = [...piezas].sort((a, b) => Math.max(b.w_mm, b.h_mm) - Math.max(a.w_mm, a.h_mm));
  const libres: Rect[] = [{ x: 0, y: 0, w: W, h: H }];
  const colocadas: Coloc[] = [];
  const noColocadas: PiezaInput[] = [];

  for (const p of pendientes) {
    const elegida = elegirMejor(libres, p, kerf_mm);
    if (!elegida) {
      noColocadas.push(p);
      continue;
    }
    const { rectIdx, usarW, usarH, rotada } = elegida;
    const r = libres[rectIdx];
    // Espacio real que la pieza consume (incluye kerf).
    const efW = usarW + kerf_mm;
    const efH = usarH + kerf_mm;
    colocadas.push({
      key: p.key,
      x: r.x,
      y: r.y,
      w: usarW,
      h: usarH,
      rotada,
    });
    // Dividir el rect libre en dos (split guillotine horizontal+vertical).
    const sobrante_der: Rect = {
      x: r.x + efW,
      y: r.y,
      w: r.w - efW,
      h: efH,
    };
    const sobrante_abajo: Rect = {
      x: r.x,
      y: r.y + efH,
      w: r.w,
      h: r.h - efH,
    };
    libres.splice(rectIdx, 1);
    if (sobrante_der.w > 0 && sobrante_der.h > 0) libres.push(sobrante_der);
    if (sobrante_abajo.w > 0 && sobrante_abajo.h > 0) libres.push(sobrante_abajo);
    // Eliminar rects contenidos en otros (cleanup básico).
    eliminarContenidos(libres);
  }

  // Los rects que quedan son recortes. Filtramos los muy pequeños (< 50 mm cualquier lado).
  const recortes = libres.filter((r) => r.w >= 50 && r.h >= 50);

  return { colocadas, noColocadas, recortes };
}

function elegirMejor(
  libres: Rect[],
  p: PiezaInput,
  kerf: number,
): { rectIdx: number; usarW: number; usarH: number; rotada: boolean } | null {
  let mejor: { rectIdx: number; usarW: number; usarH: number; rotada: boolean; score: number } | null = null;

  for (let i = 0; i < libres.length; i++) {
    const r = libres[i];
    // Probar orientación 1: w x h
    const f1 = intenta(r, p.w_mm, p.h_mm, kerf);
    if (f1 !== null && (mejor === null || f1 < mejor.score)) {
      mejor = { rectIdx: i, usarW: p.w_mm, usarH: p.h_mm, rotada: false, score: f1 };
    }
    // Probar orientación 2: h x w (si permite rotación)
    if (p.canRotate) {
      const f2 = intenta(r, p.h_mm, p.w_mm, kerf);
      if (f2 !== null && (mejor === null || f2 < mejor.score)) {
        mejor = { rectIdx: i, usarW: p.h_mm, usarH: p.w_mm, rotada: true, score: f2 };
      }
    }
  }
  return mejor ? { rectIdx: mejor.rectIdx, usarW: mejor.usarW, usarH: mejor.usarH, rotada: mejor.rotada } : null;
}

function intenta(r: Rect, w: number, h: number, kerf: number): number | null {
  const efW = w + kerf;
  const efH = h + kerf;
  if (efW > r.w || efH > r.h) return null;
  // Best Short Side Fit: minimizar la diferencia del lado más corto.
  const leftoverH = r.w - efW;
  const leftoverV = r.h - efH;
  return Math.min(leftoverH, leftoverV);
}

function eliminarContenidos(rects: Rect[]) {
  for (let i = 0; i < rects.length; i++) {
    for (let j = 0; j < rects.length; j++) {
      if (i === j) continue;
      if (contiene(rects[j], rects[i])) {
        rects.splice(i, 1);
        i--;
        break;
      }
    }
  }
}

function contiene(big: Rect, small: Rect): boolean {
  return (
    small.x >= big.x &&
    small.y >= big.y &&
    small.x + small.w <= big.x + big.w &&
    small.y + small.h <= big.y + big.h
  );
}

/**
 * Empaca una lista de piezas en múltiples tableros del mismo tamaño.
 * Añade tableros según sea necesario hasta colocar todas (o marcarlas como no colocables).
 */
export function empacarMultiTablero(
  piezas: PiezaInput[],
  W: number,
  H: number,
  kerf_mm: number,
): { tableros: Resultado[]; noColocadas: PiezaInput[] } {
  const tableros: Resultado[] = [];
  let pendientes = [...piezas];
  let safety = 0;
  while (pendientes.length > 0 && safety < 100) {
    safety++;
    const res = empacarTablero(pendientes, W, H, kerf_mm);
    if (res.colocadas.length === 0) {
      // Ninguna pieza cupo → todas son no colocables (probablemente > tablero).
      return { tableros, noColocadas: pendientes };
    }
    tableros.push(res);
    pendientes = res.noColocadas;
  }
  return { tableros, noColocadas: pendientes };
}
