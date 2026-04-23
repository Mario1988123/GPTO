"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NINGUNA } from "@/lib/tipos/catalogo";
import type { TipoHerraje } from "@/lib/tipos/catalogo";

const BASE = "/app/catalogo/herrajes";
const TIPOS = ["bisagra","tirador","guia","cierre","patas","barra","otro"] as const;

function payload(fd: FormData) {
  const nombre = String(fd.get("nombre") ?? "").trim();
  if (!nombre) throw new Error("Nombre obligatorio.");
  const tipo = String(fd.get("tipo") ?? "") as TipoHerraje;
  if (!TIPOS.includes(tipo)) throw new Error("Tipo inválido.");

  const precioStr = String(fd.get("precio_unidad") ?? "").trim();
  const precio_unidad = Number.parseFloat(precioStr);
  if (!Number.isFinite(precio_unidad) || precio_unidad < 0) throw new Error("Precio inválido.");

  const stockStr = String(fd.get("stock_disponible") ?? "0").trim();
  const stock_disponible = Number.parseInt(stockStr || "0", 10);
  if (!Number.isFinite(stock_disponible) || stock_disponible < 0) throw new Error("Stock inválido.");

  const prov = String(fd.get("proveedor_id") ?? "").trim();
  return {
    tipo,
    nombre,
    referencia_proveedor: String(fd.get("referencia_proveedor") ?? "").trim() || null,
    proveedor_id: prov && prov !== NINGUNA ? prov : null,
    precio_unidad,
    stock_disponible,
    notas: String(fd.get("notas") ?? "").trim() || null,
  };
}

export async function crear(fd: FormData) {
  const s = await createClient();
  const { data, error } = await s.from("herrajes").insert({ ...payload(fd), activo: true }).select("id").single();
  if (error) redirect(`${BASE}/nuevo?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE);
  redirect(`${BASE}/${data!.id}?ok=creado`);
}
export async function actualizar(id: string, fd: FormData) {
  const s = await createClient();
  const { error } = await s.from("herrajes").update(payload(fd)).eq("id", id);
  if (error) redirect(`${BASE}/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE); revalidatePath(`${BASE}/${id}`);
  redirect(`${BASE}/${id}?ok=actualizado`);
}
export async function alternar(id: string, activar: boolean) {
  const s = await createClient();
  const { error } = await s.from("herrajes").update({ activo: activar }).eq("id", id);
  if (error) redirect(`${BASE}/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE); revalidatePath(`${BASE}/${id}`);
  redirect(`${BASE}/${id}?ok=${activar ? "reactivado" : "desactivado"}`);
}
export async function eliminar(id: string) {
  const s = await createClient();
  const { error } = await s.from("herrajes").delete().eq("id", id);
  if (error) redirect(`${BASE}/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE);
  redirect(`${BASE}?ok=eliminado`);
}
