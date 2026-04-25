"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const BASE = "/app/catalogo/acabados";

function payload(fd: FormData) {
  const nombre = String(fd.get("nombre") ?? "").trim();
  if (!nombre) throw new Error("El nombre es obligatorio.");
  return {
    nombre,
    codigo: String(fd.get("codigo") ?? "").trim() || null,
    color_hex: String(fd.get("color_hex") ?? "").trim() || null,
    textura: String(fd.get("textura") ?? "").trim() || null,
    foto_url: String(fd.get("foto_url") ?? "").trim() || null,
  };
}

export async function crear(fd: FormData) {
  const s = await createClient();
  const { data, error } = await s.from("acabados").insert({ ...payload(fd), activo: true }).select("id").single();
  if (error) redirect(`${BASE}/nuevo?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE);
  redirect(`${BASE}/${data!.id}?ok=creado`);
}
export async function actualizar(id: string, fd: FormData) {
  const s = await createClient();
  const { error } = await s.from("acabados").update(payload(fd)).eq("id", id);
  if (error) redirect(`${BASE}/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE); revalidatePath(`${BASE}/${id}`);
  redirect(`${BASE}/${id}?ok=actualizado`);
}
export async function alternar(id: string, activar: boolean) {
  const s = await createClient();
  const { error } = await s.from("acabados").update({ activo: activar }).eq("id", id);
  if (error) redirect(`${BASE}/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE); revalidatePath(`${BASE}/${id}`);
  redirect(`${BASE}/${id}?ok=${activar ? "reactivado" : "desactivado"}`);
}
export async function eliminar(id: string) {
  const s = await createClient();
  const { error } = await s.from("acabados").delete().eq("id", id);
  if (error) redirect(`${BASE}/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE);
  redirect(`${BASE}?ok=eliminado`);
}
