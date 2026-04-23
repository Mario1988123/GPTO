"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { empacarMultiTablero, type PiezaInput } from "@/lib/nesting/max-rects";
import type { EstadoRecorte } from "@/lib/tipos/nesting";

const ESTADOS: EstadoRecorte[] = ["pendiente", "conservado", "descartado", "usado"];

/**
 * Ejecuta nesting automático sobre TODO el proyecto:
 * - Toma todas las piezas_modulo cuyos modulos_armario pertenezcan al proyecto.
 * - Agrupa por referencia_tablero_id (mismo material+acabado+grosor).
 * - Empaca cada grupo con MaxRects en tableros útiles sucesivos.
 * - Borra resultado previo del proyecto y persiste uno nuevo.
 */
export async function ejecutarNesting(proyectoId: string) {
  const s = await createClient();

  // 1. Obtener config_empresa para kerf y dimensiones tablero útil
  const { data: emp } = await s
    .from("empresas")
    .select("config_empresa")
    .limit(1)
    .maybeSingle<{ config_empresa: Record<string, number> }>();
  const cfg = emp?.config_empresa ?? {};
  const tableroUtilLargo = Number(cfg.tablero_util_ancho_cm ?? 240) * 10;
  const tableroUtilAncho = Number(cfg.tablero_util_alto_cm ?? 120) * 10;
  const kerf = Number(cfg.kerf_mm ?? 3);

  // 2. Todas las piezas del proyecto (via modulo -> armario -> proyecto).
  const { data: piezas, error } = await s
    .from("piezas_modulo")
    .select("id, cantidad, largo_mm, ancho_mm, grosor_mm, respeta_veta, referencia_tablero_id, modulos_armario!inner(armario_id, armarios!inner(proyecto_id))")
    .eq("modulos_armario.armarios.proyecto_id", proyectoId);
  if (error) {
    redirect(`/app/proyectos/${proyectoId}/nesting?error=${encodeURIComponent(error.message)}`);
  }

  if (!piezas || piezas.length === 0) {
    redirect(`/app/proyectos/${proyectoId}/nesting?error=${encodeURIComponent("No hay piezas. Explosiona primero desde cada armario.")}`);
  }

  // 3. Borrar resultados previos del proyecto.
  // Por FK CASCADE: borrar tableros_corte borra piezas_en_tablero automáticamente.
  const { data: prevTableros } = await s.from("tableros_corte").select("id").eq("proyecto_id", proyectoId);
  const prevIds = (prevTableros ?? []).map((t) => t.id);
  if (prevIds.length) {
    await s.from("recortes").delete().in("origen_tablero_id", prevIds);
    await s.from("tableros_corte").delete().eq("proyecto_id", proyectoId);
  }

  // 4. Agrupar piezas por referencia_tablero_id (las que no tienen, saltar).
  type PiezaP = {
    id: string;
    cantidad: number;
    largo_mm: number;
    ancho_mm: number;
    respeta_veta: boolean;
    referencia_tablero_id: string | null;
  };
  const grupos = new Map<string, PiezaP[]>();
  for (const p of piezas as unknown as PiezaP[]) {
    const key = p.referencia_tablero_id;
    if (!key) continue;
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key)!.push(p);
  }

  let numeroGlobal = 1;
  let totalColocadas = 0;
  let totalRecortes = 0;

  // 5. Para cada grupo, empacar.
  for (const [refId, listaPiezas] of grupos.entries()) {
    // Expandir cantidad → ocurrencias.
    const input: PiezaInput[] = [];
    const expandidas: { pieza_id: string; ocurrencia: number; w: number; h: number; canRotate: boolean }[] = [];
    for (const p of listaPiezas) {
      for (let occ = 1; occ <= p.cantidad; occ++) {
        input.push({
          key: `${p.id}#${occ}`,
          w_mm: p.largo_mm,
          h_mm: p.ancho_mm,
          canRotate: !p.respeta_veta,
        });
        expandidas.push({
          pieza_id: p.id,
          ocurrencia: occ,
          w: p.largo_mm,
          h: p.ancho_mm,
          canRotate: !p.respeta_veta,
        });
      }
    }

    const { tableros } = empacarMultiTablero(input, tableroUtilLargo, tableroUtilAncho, kerf);

    for (const res of tableros) {
      // 5a. Crear tablero_corte
      const areaOcupada = res.colocadas.reduce((acc, c) => acc + c.w * c.h, 0);
      const { data: tab, error: tabErr } = await s
        .from("tableros_corte")
        .insert({
          proyecto_id: proyectoId,
          referencia_tablero_id: refId,
          numero: numeroGlobal++,
          ancho_mm: tableroUtilLargo,
          alto_mm: tableroUtilAncho,
          area_ocupada_mm2: areaOcupada,
        })
        .select("id")
        .single();
      if (tabErr || !tab) {
        redirect(`/app/proyectos/${proyectoId}/nesting?error=${encodeURIComponent(tabErr?.message ?? "Error creando tablero")}`);
      }

      // 5b. Insertar piezas colocadas
      const rows = res.colocadas.map((c) => {
        const [pieza_id, occStr] = c.key.split("#");
        return {
          tablero_corte_id: tab.id,
          pieza_modulo_id: pieza_id,
          ocurrencia: Number.parseInt(occStr, 10),
          x_mm: c.x,
          y_mm: c.y,
          largo_mm: c.rotada ? c.h : c.w,  // sin rotar: w=largo, h=ancho
          ancho_mm: c.rotada ? c.w : c.h,
          rotada: c.rotada,
        };
      });
      if (rows.length > 0) {
        const { error: inErr } = await s.from("piezas_en_tablero").insert(rows);
        if (inErr) {
          redirect(`/app/proyectos/${proyectoId}/nesting?error=${encodeURIComponent(inErr.message)}`);
        }
      }
      totalColocadas += rows.length;

      // 5c. Recortes residuales (estado pendiente, esperan validación del operario)
      const recortesRows = res.recortes.map((r) => ({
        referencia_tablero_id: refId,
        origen_tablero_id: tab.id,
        largo_mm: Math.floor(r.w),
        ancho_mm: Math.floor(r.h),
      }));
      if (recortesRows.length > 0) {
        const { error: rErr } = await s.from("recortes").insert(recortesRows);
        if (rErr) {
          redirect(`/app/proyectos/${proyectoId}/nesting?error=${encodeURIComponent(rErr.message)}`);
        }
      }
      totalRecortes += recortesRows.length;
    }
  }

  revalidatePath(`/app/proyectos/${proyectoId}/nesting`);
  revalidatePath("/app/recortes");
  redirect(`/app/proyectos/${proyectoId}/nesting?ok=creado`);
}

export async function moverPiezaEnTablero(payload: { id: string; x_mm: number; y_mm: number }) {
  const s = await createClient();
  const { error } = await s.from("piezas_en_tablero").update({
    x_mm: Math.max(0, Math.floor(payload.x_mm)),
    y_mm: Math.max(0, Math.floor(payload.y_mm)),
  }).eq("id", payload.id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/proyectos");
}

export async function cambiarEstadoRecorte(
  recorteId: string,
  estado: EstadoRecorte,
  returnTo: string,
) {
  if (!ESTADOS.includes(estado)) throw new Error("Estado inválido.");
  const s = await createClient();
  const { error } = await s.from("recortes").update({ estado }).eq("id", recorteId);
  if (error) redirect(`${returnTo}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(returnTo);
  revalidatePath("/app/recortes");
  redirect(`${returnTo}?ok=actualizado`);
}
