/**
 * Análisis determinista de optimización de dimensiones (Capa 6.5).
 * Dado el estado actual de un proyecto, detecta piezas que no caben en el tablero
 * útil y sugiere ajustes concretos (reducir dimensión del armario, aumentar
 * particiones, cambiar referencia_tablero).
 */

export type Sugerencia = {
  severidad: "critica" | "importante" | "menor";
  titulo: string;
  descripcion: string;
  acciones: string[];
};

export type PiezaAnalisis = {
  pieza_nombre: string;
  armario_nombre: string;
  largo_mm: number;
  ancho_mm: number;
  respeta_veta: boolean;
  particiones_verticales: number;
  alto_modulo_mm: number;
};

/**
 * Genera sugerencias a partir del estado actual del nesting y piezas.
 */
export function analizarOptimizacion(
  piezas: PiezaAnalisis[],
  tableroUtilLargoMm: number,
  tableroUtilAnchoMm: number,
): Sugerencia[] {
  const sug: Sugerencia[] = [];

  // 1. Piezas que no caben en ninguna orientación
  const noCaben = piezas.filter((p) => {
    const cabeSin = p.largo_mm <= tableroUtilLargoMm && p.ancho_mm <= tableroUtilAnchoMm;
    const cabeRot = !p.respeta_veta && p.largo_mm <= tableroUtilAnchoMm && p.ancho_mm <= tableroUtilLargoMm;
    return !cabeSin && !cabeRot;
  });

  if (noCaben.length > 0) {
    // Agrupar por armario para personalizar mensaje
    const porArm = new Map<string, PiezaAnalisis[]>();
    for (const p of noCaben) {
      const arr = porArm.get(p.armario_nombre) ?? [];
      arr.push(p);
      porArm.set(p.armario_nombre, arr);
    }

    for (const [arm, lista] of porArm.entries()) {
      const maxLargo = Math.max(...lista.map((p) => p.largo_mm));
      const maxAncho = Math.max(...lista.map((p) => p.ancho_mm));
      const excesoLargo = maxLargo - tableroUtilLargoMm;
      const excesoAncho = maxAncho - tableroUtilAnchoMm;

      const acciones: string[] = [];
      if (excesoLargo > 0 && excesoLargo < 200) {
        acciones.push(`Reducir el alto del armario "${arm}" en al menos ${excesoLargo} mm.`);
      }
      if (excesoAncho > 0 && excesoAncho < 200) {
        acciones.push(`Reducir el fondo del armario "${arm}" en al menos ${excesoAncho} mm.`);
      }
      // Sugerencia particiones: solo cuando alto_modulo_mm excede
      const maxAltoModulo = Math.max(...lista.map((p) => p.alto_modulo_mm));
      const particionesActuales = Math.max(...lista.map((p) => p.particiones_verticales));
      if (maxAltoModulo > tableroUtilLargoMm) {
        const partNecesarias = Math.ceil(maxAltoModulo / tableroUtilLargoMm);
        if (partNecesarias > particionesActuales) {
          acciones.push(`Aumentar "particiones verticales" de los módulos de ${particionesActuales} a ${partNecesarias} (se apilan).`);
        }
      }
      acciones.push("Alternativa: crear una referencia de tablero de mayor tamaño (ej: altura cocina 2750×1220 mm).");

      sug.push({
        severidad: "critica",
        titulo: `${lista.length} pieza(s) del armario "${arm}" no caben en el tablero útil`,
        descripcion: `La mayor supera el tablero ${tableroUtilLargoMm}×${tableroUtilAnchoMm} mm por ${Math.max(excesoLargo, excesoAncho)} mm.`,
        acciones,
      });
    }
  }

  // 2. Piezas justo al borde (excederían con kerf)
  const alBorde = piezas.filter((p) => {
    const f1 = Math.abs(p.largo_mm - tableroUtilLargoMm);
    const f2 = Math.abs(p.ancho_mm - tableroUtilAnchoMm);
    return (f1 < 20 && f1 > 0) || (f2 < 20 && f2 > 0);
  });
  if (alBorde.length > 0 && noCaben.length === 0) {
    sug.push({
      severidad: "importante",
      titulo: `${alBorde.length} pieza(s) al límite del tablero`,
      descripcion: `Quedan menos de 20 mm de margen respecto al tablero útil. Con el kerf o cualquier imprevisto podrían no caber.`,
      acciones: [
        "Aumentar el margen reduciendo un poco la dimensión del armario o módulo correspondiente.",
        "Validar con el proveedor que el tablero útil declarado es real.",
      ],
    });
  }

  // 3. Ajustes finos para optimización (placeholder - determinista completo iría aquí)
  if (noCaben.length === 0 && alBorde.length === 0 && piezas.length > 0) {
    sug.push({
      severidad: "menor",
      titulo: "Todo cabe correctamente 👍",
      descripcion: `Las ${piezas.length} pieza(s) analizadas caben en el tablero ${tableroUtilLargoMm}×${tableroUtilAnchoMm} mm. No se detectan optimizaciones críticas.`,
      acciones: [
        "Para análisis más profundo (ahorrar tableros probando ±10/20/30mm) se requiere una ejecución más intensiva. Disponible en futura versión.",
      ],
    });
  }

  return sug;
}
