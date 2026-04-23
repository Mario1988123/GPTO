"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NINGUNA } from "@/lib/tipos/catalogo";

const BASE = "/app/catalogo/cantos";

function payload(fd: FormData) {
  const nombre = String(fd.get("nombre") ?? "").trim();
  if (!nombre) throw new Error("Nombre obligatorio.");
  const precioStr = String(fd.get("precio_ml") ?? "").trim();
  const precio_ml = Number.parseFloat(precioStr);
  if (!Number.isFinite(precio_ml) || precio_ml < 0) throw new Error("Precio inválido.");

  const acabado = String(fd.get("acabado_id") ?? "").trim();
  const prov = String(fd.get("proveedor_id") ?? "").trim();
  const grosorStr = String(fd.get("grosor_mm") ?? "").trim();
  let grosor_mm: number | null = null;
  if (grosorStr) {
    const g = Number.parseInt(grosorStr, 10);
    if (!Number.isFinite(g) || g <= 0) throw new Error("Grosor inválido.");
    grosor_mm = g;
  }

  return {
    nombre,
    acabado_id: acabado && acabado !== NINGUNA ? acabado : null,
    grosor_mm,
    proveedor_id: prov && prov !== NINGUNA ? prov : null,
    precio_ml,
    referencia_proveedor: String(fd.get("referencia_proveedor") ?? "").trim() || null,
    notas: String(fd.get("notas") ?? "").trim() || null,
  };
}

export async function crear(fd: FormData) {
  const s = await createClient();
  const { data, error } = await s.from("cantos").insert({ ...payload(fd), activo: true }).select("id").single();
  if (error) redirect(`${BASE}/nuevo?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE);
  redirect(`${BASE}/${data!.id}?ok=creado`);
}
export async function actualizar(id: string, fd: FormData) {
  const s = await createClient();
  const { error } = await s.from("cantos").update(payload(fd)).eq("id", id);
  if (error) redirect(`${BASE}/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE); revalidatePath(`${BASE}/${id}`);
  redirect(`${BASE}/${id}?ok=actualizado`);
}
export async function alternar(id: string, activar: boolean) {
  const s = await createClient();
  const { error } = await s.from("cantos").update({ activo: activar }).eq("id", id);
  if (error) redirect(`${BASE}/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE); revalidatePath(`${BASE}/${id}`);
  redirect(`${BASE}/${id}?ok=${activar ? "reactivado" : "desactivado"}`);
}
export async function eliminar(id: string) {
  const s = await createClient();
  const { error } = await s.from("cantos").delete().eq("id", id);
  if (error) redirect(`${BASE}/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE);
  redirect(`${BASE}?ok=eliminado`);
}
