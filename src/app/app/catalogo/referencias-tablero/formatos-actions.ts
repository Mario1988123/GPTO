"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function int(fd: FormData, k: string, def = 0): number {
  const v = String(fd.get(k) ?? "").trim();
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
}

function num(fd: FormData, k: string): number | null {
  const v = String(fd.get(k) ?? "").trim();
  if (!v) return null;
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

export async function crearFormato(referenciaId: string, fd: FormData) {
  const s = await createClient();
  const ancho_mm = int(fd, "ancho_mm");
  const alto_mm = int(fd, "alto_mm");
  const ancho_util_mm = int(fd, "ancho_util_mm", ancho_mm);
  const alto_util_mm = int(fd, "alto_util_mm", alto_mm);
  if (ancho_mm <= 0 || alto_mm <= 0) throw new Error("Dimensiones inválidas");

  const { error } = await s.from("referencia_tablero_formatos").insert({
    referencia_tablero_id: referenciaId,
    ancho_mm,
    alto_mm,
    ancho_util_mm,
    alto_util_mm,
    precio_unidad_eur: num(fd, "precio_unidad_eur"),
    notas: String(fd.get("notas") ?? "").trim() || null,
  });
  if (error) {
    redirect(`/app/catalogo/referencias-tablero/${referenciaId}?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath(`/app/catalogo/referencias-tablero/${referenciaId}`);
  redirect(`/app/catalogo/referencias-tablero/${referenciaId}?ok=creado`);
}

export async function eliminarFormato(referenciaId: string, formatoId: string) {
  const s = await createClient();
  await s.from("referencia_tablero_formatos").delete().eq("id", formatoId);
  revalidatePath(`/app/catalogo/referencias-tablero/${referenciaId}`);
  redirect(`/app/catalogo/referencias-tablero/${referenciaId}?ok=eliminado`);
}
