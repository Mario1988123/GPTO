"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function payload(fd: FormData) {
  const nombre = String(fd.get("nombre") ?? "").trim();
  if (!nombre) throw new Error("El nombre es obligatorio.");
  return {
    nombre,
    contacto: String(fd.get("contacto") ?? "").trim() || null,
    telefono: String(fd.get("telefono") ?? "").trim() || null,
    email: String(fd.get("email") ?? "").trim() || null,
    notas: String(fd.get("notas") ?? "").trim() || null,
  };
}

const BASE = "/app/catalogo/proveedores";

export async function crear(fd: FormData) {
  const s = await createClient();
  const { data, error } = await s
    .from("proveedores")
    .insert({ ...payload(fd), activo: true })
    .select("id")
    .single();
  if (error) redirect(`${BASE}/nuevo?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE);
  redirect(`${BASE}/${data!.id}?ok=creado`);
}

export async function actualizar(id: string, fd: FormData) {
  const s = await createClient();
  const { error } = await s.from("proveedores").update(payload(fd)).eq("id", id);
  if (error) redirect(`${BASE}/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE);
  revalidatePath(`${BASE}/${id}`);
  redirect(`${BASE}/${id}?ok=actualizado`);
}

export async function alternar(id: string, activar: boolean) {
  const s = await createClient();
  const { error } = await s.from("proveedores").update({ activo: activar }).eq("id", id);
  if (error) redirect(`${BASE}/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE);
  revalidatePath(`${BASE}/${id}`);
  redirect(`${BASE}/${id}?ok=${activar ? "reactivado" : "desactivado"}`);
}

export async function eliminar(id: string) {
  const s = await createClient();
  const { error } = await s.from("proveedores").delete().eq("id", id);
  if (error) redirect(`${BASE}/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE);
  redirect(`${BASE}?ok=eliminado`);
}
