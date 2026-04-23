"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NINGUNA } from "@/lib/tipos/catalogo";

const BASE = "/app/catalogo/referencias-tablero";

function payload(fd: FormData) {
  const material_id = String(fd.get("material_id") ?? "").trim();
  const acabado_id = String(fd.get("acabado_id") ?? "").trim();
  if (!material_id) throw new Error("Material obligatorio.");
  if (!acabado_id) throw new Error("Acabado obligatorio.");

  const grosorStr = String(fd.get("grosor_mm") ?? "").trim();
  const precioStr = String(fd.get("precio_m2") ?? "").trim();
  const grosor_mm = Number.parseInt(grosorStr, 10);
  const precio_m2 = Number.parseFloat(precioStr);
  if (!Number.isFinite(grosor_mm) || grosor_mm <= 0) throw new Error("Grosor inválido.");
  if (!Number.isFinite(precio_m2) || precio_m2 < 0) throw new Error("Precio inválido.");

  const prov = String(fd.get("proveedor_id") ?? "").trim();
  return {
    material_id,
    acabado_id,
    proveedor_id: prov && prov !== NINGUNA ? prov : null,
    grosor_mm,
    precio_m2,
    respeta_veta: fd.get("respeta_veta") === "on",
    referencia_proveedor:
      String(fd.get("referencia_proveedor") ?? "").trim() || null,
    notas: String(fd.get("notas") ?? "").trim() || null,
  };
}

export async function crear(fd: FormData) {
  const s = await createClient();
  const { data, error } = await s
    .from("referencias_tablero")
    .insert({ ...payload(fd), activo: true })
    .select("id")
    .single();
  if (error) redirect(`${BASE}/nuevo?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE);
  redirect(`${BASE}/${data!.id}?ok=creado`);
}
export async function actualizar(id: string, fd: FormData) {
  const s = await createClient();
  const { error } = await s.from("referencias_tablero").update(payload(fd)).eq("id", id);
  if (error) redirect(`${BASE}/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE); revalidatePath(`${BASE}/${id}`);
  redirect(`${BASE}/${id}?ok=actualizado`);
}
export async function alternar(id: string, activar: boolean) {
  const s = await createClient();
  const { error } = await s.from("referencias_tablero").update({ activo: activar }).eq("id", id);
  if (error) redirect(`${BASE}/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE); revalidatePath(`${BASE}/${id}`);
  redirect(`${BASE}/${id}?ok=${activar ? "reactivado" : "desactivado"}`);
}
export async function eliminar(id: string) {
  const s = await createClient();
  const { error } = await s.from("referencias_tablero").delete().eq("id", id);
  if (error) redirect(`${BASE}/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE);
  redirect(`${BASE}?ok=eliminado`);
}
