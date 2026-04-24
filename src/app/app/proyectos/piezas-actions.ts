"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { EstadoPieza } from "@/lib/tipos/piezas";

const ESTADOS: EstadoPieza[] = ["pendiente", "cortada", "producida", "entregada"];

export async function regenerarPiezasArmario(proyectoId: string, armarioId: string) {
  const s = await createClient();
  const { data: modulos, error: modErr } = await s
    .from("modulos_armario")
    .select("id")
    .eq("armario_id", armarioId);
  if (modErr) redirect(`/app/proyectos/${proyectoId}/armarios/${armarioId}?error=${encodeURIComponent(modErr.message)}`);

  let total = 0;
  for (const m of modulos ?? []) {
    const { data, error } = await s.rpc("regenerar_piezas_modulo", { p_modulo_armario_id: m.id });
    if (error) {
      redirect(`/app/proyectos/${proyectoId}/armarios/${armarioId}?error=${encodeURIComponent(error.message)}`);
    }
    total += (data as number) ?? 0;
  }
  revalidatePath(`/app/proyectos/${proyectoId}/armarios/${armarioId}`);
  redirect(`/app/proyectos/${proyectoId}/armarios/${armarioId}?ok=creado`);
}

/**
 * Regenera todas las piezas de TODOS los armarios del proyecto.
 * Útil cuando el usuario va a nesting o a presupuestar y olvidó explosionar.
 */
export async function regenerarPiezasProyecto(proyectoId: string) {
  const s = await createClient();

  const { data: armarios, error: armErr } = await s
    .from("armarios")
    .select("id")
    .eq("proyecto_id", proyectoId);
  if (armErr) throw new Error(armErr.message);

  let totalPiezas = 0;
  for (const a of armarios ?? []) {
    const { data: modulos, error: modErr } = await s
      .from("modulos_armario")
      .select("id")
      .eq("armario_id", (a as { id: string }).id);
    if (modErr) throw new Error(modErr.message);

    for (const m of modulos ?? []) {
      const { data, error } = await s.rpc("regenerar_piezas_modulo", {
        p_modulo_armario_id: (m as { id: string }).id,
      });
      if (error) throw new Error(error.message);
      totalPiezas += (data as number) ?? 0;
    }
  }

  revalidatePath(`/app/proyectos/${proyectoId}`);
  revalidatePath(`/app/proyectos/${proyectoId}/nesting`);
  return totalPiezas;
}

export async function regenerarPiezasProyectoYRedirect(
  proyectoId: string,
  redirectTo: string,
) {
  try {
    const total = await regenerarPiezasProyecto(proyectoId);
    redirect(`${redirectTo}?ok=creado&total=${total}`);
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e; // re-lanzar next/navigation redirect
    const msg = e instanceof Error ? e.message : "Error explosionando piezas";
    redirect(`${redirectTo}?error=${encodeURIComponent(msg)}`);
  }
}

export async function cambiarEstadoPieza(
  proyectoId: string,
  armarioId: string,
  piezaId: string,
  estado: EstadoPieza,
) {
  if (!ESTADOS.includes(estado)) throw new Error("Estado inválido.");
  const s = await createClient();
  const { error } = await s.from("piezas_modulo").update({ estado }).eq("id", piezaId);
  if (error) redirect(`/app/proyectos/${proyectoId}/armarios/${armarioId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/app/proyectos/${proyectoId}/armarios/${armarioId}`);
  redirect(`/app/proyectos/${proyectoId}/armarios/${armarioId}?ok=actualizado`);
}
