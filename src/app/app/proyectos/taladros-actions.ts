"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function regenerarTaladrosArmario(proyectoId: string, armarioId: string) {
  const s = await createClient();
  // Coge todas las piezas del armario y llama al RPC para cada una.
  const { data: piezas } = await s
    .from("piezas_modulo")
    .select("id, modulos_armario!inner(armario_id)")
    .eq("modulos_armario.armario_id", armarioId);
  let total = 0;
  for (const p of piezas ?? []) {
    const { data } = await s.rpc("regenerar_puntos_taladro_pieza", { p_pieza_id: p.id });
    total += Number(data ?? 0);
  }
  revalidatePath(`/app/proyectos/${proyectoId}/armarios/${armarioId}/montaje`);
  redirect(`/app/proyectos/${proyectoId}/armarios/${armarioId}/montaje?ok=regenerados-${total}`);
}

export async function añadirPuntoTaladro(proyectoId: string, armarioId: string, fd: FormData) {
  const s = await createClient();
  const pieza_modulo_id = String(fd.get("pieza_modulo_id") ?? "").trim();
  if (!pieza_modulo_id) throw new Error("Pieza obligatoria");
  const { error } = await s.from("pieza_puntos_taladro").insert({
    pieza_modulo_id,
    tipo: String(fd.get("tipo") ?? "otro"),
    cara: String(fd.get("cara") ?? "frontal"),
    x_mm: Number(fd.get("x_mm") ?? 0),
    y_mm: Number(fd.get("y_mm") ?? 0),
    diametro_mm: Number(fd.get("diametro_mm") ?? 5),
    profundidad_mm: Number(fd.get("profundidad_mm") ?? 0) || null,
    pasante: fd.get("pasante") === "on",
    notas: String(fd.get("notas") ?? "").trim() || null,
    generado_auto: false,
  });
  if (error) redirect(`/app/proyectos/${proyectoId}/armarios/${armarioId}/montaje?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/app/proyectos/${proyectoId}/armarios/${armarioId}/montaje`);
  redirect(`/app/proyectos/${proyectoId}/armarios/${armarioId}/montaje?ok=anadido`);
}

export async function eliminarPuntoTaladro(proyectoId: string, armarioId: string, id: string) {
  const s = await createClient();
  await s.from("pieza_puntos_taladro").delete().eq("id", id);
  revalidatePath(`/app/proyectos/${proyectoId}/armarios/${armarioId}/montaje`);
  redirect(`/app/proyectos/${proyectoId}/armarios/${armarioId}/montaje?ok=eliminado`);
}
