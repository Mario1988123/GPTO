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

  // Clamp a las dimensiones de la estancia (el armario no puede salirse del recinto)
  const [{ data: armario }, { data: estancia }] = await Promise.all([
    s.from("armarios").select("ancho_total_mm, fondo_mm").eq("id", armarioId).maybeSingle<{ ancho_total_mm: number; fondo_mm: number }>(),
    s.from("estancias").select("largo_mm, ancho_mm").eq("id", estanciaId).maybeSingle<{ largo_mm: number | null; ancho_mm: number | null }>(),
  ]);

  let xClamped = x;
  let yClamped = y;
  if (armario && estancia?.largo_mm && estancia?.ancho_mm) {
    const isRotated = rot % 180 !== 0;
    const W = isRotated ? armario.fondo_mm : armario.ancho_total_mm;
    const H = isRotated ? armario.ancho_total_mm : armario.fondo_mm;
    xClamped = Math.max(0, Math.min(estancia.largo_mm - W, x));
    yClamped = Math.max(0, Math.min(estancia.ancho_mm - H, y));
  }

  const { error } = await s.from("armarios").update({
    plano_x_mm: xClamped,
    plano_y_mm: yClamped,
    plano_rotacion: rot,
  }).eq("id", armarioId);
  if (error) redirect(`/app/proyectos/${proyectoId}/estancias/${estanciaId}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/app/proyectos/${proyectoId}/estancias/${estanciaId}`);
  redirect(`/app/proyectos/${proyectoId}/estancias/${estanciaId}?ok=actualizado`);
}
