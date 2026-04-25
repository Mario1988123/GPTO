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
  const piezasInicial = await s
    .from("piezas_modulo")
    .select("id, cantidad, largo_mm, ancho_mm, grosor_mm, respeta_veta, referencia_tablero_id, modulos_armario!inner(armario_id, armarios!inner(proyecto_id))")
    .eq("modulos_armario.armarios.proyecto_id", proyectoId);
  let piezas = piezasInicial.data;
  const error = piezasInicial.error;
  if (error) {
    redirect(`/app/proyectos/${proyectoId}/nesting?error=${encodeURIComponent(error.message)}`);
  }

  // Si no hay piezas, auto-explosionamos antes de fallar (mejor UX)
  if (!piezas || piezas.length === 0) {
    try {
      const { regenerarPiezasProyecto } = await import("./piezas-actions");
      await regenerarPiezasProyecto(proyectoId);
    } catch (e) {
      redirect(`/app/proyectos/${proyectoId}/nesting?error=${encodeURIComponent(
        e instanceof Error
          ? `No hay piezas y falló la explosión automática: ${e.message}`
          : "No hay piezas ni módulos configurados",
      )}`);
    }
    const retry = await s
      .from("piezas_modulo")
      .select("id, cantidad, largo_mm, ancho_mm, grosor_mm, respeta_veta, referencia_tablero_id, modulos_armario!inner(armario_id, armarios!inner(proyecto_id))")
      .eq("modulos_armario.armarios.proyecto_id", proyectoId);
    piezas = retry.data;
    if (!piezas || piezas.length === 0) {
      redirect(`/app/proyectos/${proyectoId}/nesting?error=${encodeURIComponent("Sin piezas tras auto-explosión. Comprueba que los armarios tienen módulos con tipos de módulo que definan piezas.")}`);
    }
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

  // 5. Para cada grupo, empacar en memoria. Luego hacemos los inserts en batch
  //    (muchísimo más rápido que 1 insert por tablero / por pieza — cada round-trip
  //    a Supabase cuesta 50-200ms).
  type TableroPreInsert = {
    proyecto_id: string;
    referencia_tablero_id: string;
    numero: number;
    ancho_mm: number;
    alto_mm: number;
    area_ocupada_mm2: number;
    __piezas: {
      pieza_modulo_id: string;
      ocurrencia: number;
      x_mm: number;
      y_mm: number;
      largo_mm: number;
      ancho_mm: number;
      rotada: boolean;
    }[];
    __recortes: { largo_mm: number; ancho_mm: number }[];
  };

  const tablerosParaInsert: TableroPreInsert[] = [];

  for (const [refId, listaPiezas] of grupos.entries()) {
    const input: PiezaInput[] = [];
    for (const p of listaPiezas) {
      for (let occ = 1; occ <= p.cantidad; occ++) {
        input.push({
          key: `${p.id}#${occ}`,
          w_mm: p.largo_mm,
          h_mm: p.ancho_mm,
          canRotate: !p.respeta_veta,
        });
      }
    }

    const { tableros } = empacarMultiTablero(input, tableroUtilLargo, tableroUtilAncho, kerf);

    for (const res of tableros) {
      const areaOcupada = res.colocadas.reduce((acc, c) => acc + c.w * c.h, 0);
      tablerosParaInsert.push({
        proyecto_id: proyectoId,
        referencia_tablero_id: refId,
        numero: numeroGlobal++,
        ancho_mm: tableroUtilLargo,
        alto_mm: tableroUtilAncho,
        area_ocupada_mm2: areaOcupada,
        __piezas: res.colocadas.map((c) => {
          const [pieza_id, occStr] = c.key.split("#");
          return {
            pieza_modulo_id: pieza_id,
            ocurrencia: Number.parseInt(occStr, 10),
            x_mm: c.x,
            y_mm: c.y,
            largo_mm: c.rotada ? c.h : c.w,
            ancho_mm: c.rotada ? c.w : c.h,
            rotada: c.rotada,
          };
        }),
        __recortes: res.recortes.map((r) => ({
          largo_mm: Math.floor(r.w),
          ancho_mm: Math.floor(r.h),
        })),
      });
    }
  }

  // 5.BATCH — un solo insert para los tableros, luego uno para todas las piezas,
  //           y uno para todos los recortes. Reduce de O(tableros + piezas) a O(3).
  if (tablerosParaInsert.length > 0) {
    const rowsTableros = tablerosParaInsert.map(({ __piezas: _p, __recortes: _r, ...rest }) => {
      void _p; void _r;
      return rest;
    });
    const { data: tablerosInsertados, error: tabErr } = await s
      .from("tableros_corte")
      .insert(rowsTableros)
      .select("id, numero");
    if (tabErr || !tablerosInsertados) {
      redirect(`/app/proyectos/${proyectoId}/nesting?error=${encodeURIComponent(tabErr?.message ?? "Error creando tableros")}`);
    }

    // Mapear numero → id recién creado.
    const byNumero = new Map<number, string>();
    for (const t of tablerosInsertados) byNumero.set(t.numero as number, t.id as string);

    // Piezas en tablero: todas en un solo insert.
    const todasPiezas: Record<string, unknown>[] = [];
    const todosRecortes: Record<string, unknown>[] = [];
    for (const t of tablerosParaInsert) {
      const tabId = byNumero.get(t.numero);
      if (!tabId) continue;
      for (const p of t.__piezas) todasPiezas.push({ tablero_corte_id: tabId, ...p });
      for (const r of t.__recortes) {
        todosRecortes.push({
          referencia_tablero_id: t.referencia_tablero_id,
          origen_tablero_id: tabId,
          largo_mm: r.largo_mm,
          ancho_mm: r.ancho_mm,
        });
      }
    }

    if (todasPiezas.length > 0) {
      const { error: pErr } = await s.from("piezas_en_tablero").insert(todasPiezas);
      if (pErr) redirect(`/app/proyectos/${proyectoId}/nesting?error=${encodeURIComponent(pErr.message)}`);
      totalColocadas += todasPiezas.length;
    }
    if (todosRecortes.length > 0) {
      const { error: rErr } = await s.from("recortes").insert(todosRecortes);
      if (rErr) redirect(`/app/proyectos/${proyectoId}/nesting?error=${encodeURIComponent(rErr.message)}`);
      totalRecortes += todosRecortes.length;
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
