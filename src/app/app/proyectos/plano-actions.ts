"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function actualizarPlanoArmario(
  proyectoId: string,
  estanciaId: string,
  armarioId: string,
  fd: FormData,
) {
  const x = Number.parseInt(String(fd.get("plano_x_mm") ?? "0"), 10);
  const y = Number.parseInt(String(fd.get("plano_y_mm") ?? "0"), 10);
  const rotRaw = Number.parseInt(String(fd.get("plano_rotacion") ?? "0"), 10);
  const rot: 0 | 90 | 180 | 270 = [0, 90, 180, 270].includes(rotRaw) ? (rotRaw as 0 | 90 | 180 | 270) : 0;
  if (!Number.isFinite(x) || x < 0) throw new Error("X inválido");
  if (!Number.isFinite(y) || y < 0) throw new Error("Y inválido");

  const s = await createClient();
  const { error } = await s.from("armarios").update({
    plano_x_mm: x,
    plano_y_mm: y,
    plano_rotacion: rot,
  }).eq("id", armarioId);
  if (error) redirect(`/app/proyectos/${proyectoId}/estancias/${estanciaId}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/app/proyectos/${proyectoId}/estancias/${estanciaId}`);
  redirect(`/app/proyectos/${proyectoId}/estancias/${estanciaId}?ok=actualizado`);
}
