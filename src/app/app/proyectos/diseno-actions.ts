"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Genera automáticamente módulos dentro de un armario a partir de una lista de
 * tipos + cantidades. Cada módulo toma ancho del tipo_default; alto y fondo se
 * ajustan al armario. Si el alto excede el tablero útil, se sugieren particiones.
 *
 * Reemplaza los módulos existentes del armario (borra y genera desde cero).
 */
export async function aplicarDisenoPropuesto(
  proyectoId: string,
  armarioId: string,
  payload: { items: { tipo_modulo_id: string; cantidad: number }[] },
) {
  const s = await createClient();

  // Datos del armario
  const { data: arm } = await s.from("armarios").select("*").eq("id", armarioId).maybeSingle();
  if (!arm) redirect(`/app/proyectos/${proyectoId}/armarios/${armarioId}?error=${encodeURIComponent("Armario no encontrado")}`);

  // Margen útil si empotrado
  const margen = arm!.tipo_instalacion === "empotrado" ? arm!.margen_tapeta_mm : 0;
  const anchoInterior = arm!.ancho_total_mm - 2 * margen;
  const altoInterior = arm!.alto_total_mm - 2 * margen;
  const fondoInterior = arm!.fondo_mm - margen;

  // Tablero útil para decidir particiones
  const { data: cfg } = await s.from("empresas").select("config_empresa").limit(1).maybeSingle<{ config_empresa: Record<string, number> }>();
  const tableroUtilAltoMm = Number(cfg?.config_empresa?.tablero_util_alto_cm ?? 120) * 10;
  const particionesCalculadas = Math.max(1, Math.ceil(altoInterior / tableroUtilAltoMm));

  // Traer los tipos seleccionados
  const tipoIds = payload.items.map((i) => i.tipo_modulo_id);
  const { data: tipos } = await s.from("tipos_modulo").select("id, nombre, ancho_default_mm").in("id", tipoIds);
  const mapTipos = new Map((tipos ?? []).map((t) => [t.id as string, t]));

  // Construir lista expandida en orden del input, respetando cantidades
  type Item = { tipo_modulo_id: string; ancho_mm: number };
  const itemsExpandidos: Item[] = [];
  for (const i of payload.items) {
    const t = mapTipos.get(i.tipo_modulo_id);
    if (!t) continue;
    for (let k = 0; k < i.cantidad; k++) {
      itemsExpandidos.push({ tipo_modulo_id: t.id as string, ancho_mm: t.ancho_default_mm as number });
    }
  }

  // Borrar módulos existentes del armario (CASCADE limpia piezas).
  await s.from("modulos_armario").delete().eq("armario_id", armarioId);

  // Insertar secuencialmente
  let orden = 0;
  let anchoAcumulado = 0;
  for (const item of itemsExpandidos) {
    if (anchoAcumulado + item.ancho_mm > anchoInterior) break; // no sobrepasar
    const { error: insErr } = await s.from("modulos_armario").insert({
      armario_id: armarioId,
      tipo_modulo_id: item.tipo_modulo_id,
      orden,
      ancho_mm: item.ancho_mm,
      alto_mm: altoInterior,
      fondo_mm: fondoInterior,
      particiones_verticales: particionesCalculadas,
    });
    if (insErr) {
      redirect(`/app/proyectos/${proyectoId}/armarios/${armarioId}?error=${encodeURIComponent(insErr.message)}`);
    }
    anchoAcumulado += item.ancho_mm;
    orden++;
  }

  revalidatePath(`/app/proyectos/${proyectoId}/armarios/${armarioId}`);
  redirect(`/app/proyectos/${proyectoId}/armarios/${armarioId}?ok=creado`);
}
