"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CategoriaMaterial } from "@/lib/tipos/catalogo";

const BASE = "/app/catalogo/materiales";
const CATS = ["tablero", "madera_maciza", "dm", "melamina", "contrachapado", "otro"] as const;

function payload(fd: FormData) {
  const nombre = String(fd.get("nombre") ?? "").trim();
  if (!nombre) throw new Error("El nombre es obligatorio.");
  const categoria = String(fd.get("categoria") ?? "") as CategoriaMaterial;
  if (!CATS.includes(categoria)) throw new Error("Categoría inválida.");
  return {
    nombre,
    categoria,
    descripcion: String(fd.get("descripcion") ?? "").trim() || null,
    foto_url: String(fd.get("foto_url") ?? "").trim() || null,
  };
}

export async function crear(fd: FormData) {
  const s = await createClient();
  const { data, error } = await s.from("materiales").insert({ ...payload(fd), activo: true }).select("id").single();
  if (error) redirect(`${BASE}/nuevo?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE);
  redirect(`${BASE}/${data!.id}?ok=creado`);
}
export async function actualizar(id: string, fd: FormData) {
  const s = await createClient();
  const { error } = await s.from("materiales").update(payload(fd)).eq("id", id);
  if (error) redirect(`${BASE}/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE); revalidatePath(`${BASE}/${id}`);
  redirect(`${BASE}/${id}?ok=actualizado`);
}
export async function alternar(id: string, activar: boolean) {
  const s = await createClient();
  const { error } = await s.from("materiales").update({ activo: activar }).eq("id", id);
  if (error) redirect(`${BASE}/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE); revalidatePath(`${BASE}/${id}`);
  redirect(`${BASE}/${id}?ok=${activar ? "reactivado" : "desactivado"}`);
}
export async function eliminar(id: string) {
  const s = await createClient();
  const { error } = await s.from("materiales").delete().eq("id", id);
  if (error) redirect(`${BASE}/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE);
  redirect(`${BASE}?ok=eliminado`);
}
