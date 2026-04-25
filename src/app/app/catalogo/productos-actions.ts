"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function num(fd: FormData, k: string, def: number | null = null): number | null {
  const v = String(fd.get(k) ?? "").trim();
  if (!v) return def;
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : def;
}

function int(fd: FormData, k: string, def: number | null = null): number | null {
  const v = String(fd.get(k) ?? "").trim();
  if (!v) return def;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
}

function str(fd: FormData, k: string): string | null {
  const v = String(fd.get(k) ?? "").trim();
  return v || null;
}

const BASE = "/app/catalogo";

// ================== PUERTAS DE PASO ==================

function payloadPuerta(fd: FormData) {
  const nombre = str(fd, "nombre");
  if (!nombre) throw new Error("Nombre obligatorio");
  return {
    nombre,
    tipo_apertura: str(fd, "tipo_apertura") ?? "abatible",
    ancho_mm: int(fd, "ancho_mm", 725) ?? 725,
    alto_mm: int(fd, "alto_mm", 2030) ?? 2030,
    grosor_hoja_mm: int(fd, "grosor_hoja_mm", 40) ?? 40,
    grosor_muro_mm: int(fd, "grosor_muro_mm", 100) ?? 100,
    material_cajon: str(fd, "material_cajon") ?? "pladur",
    lleva_tapeta: fd.get("lleva_tapeta") === "on" || fd.get("lleva_tapeta") === "true",
    ancho_tapeta_mm: int(fd, "ancho_tapeta_mm"),
    acabado: str(fd, "acabado"),
    color: str(fd, "color"),
    proveedor_id: str(fd, "proveedor_id"),
    referencia_proveedor: str(fd, "referencia_proveedor"),
    precio_coste_eur: num(fd, "precio_coste_eur", 0) ?? 0,
    precio_pvp_eur: num(fd, "precio_pvp_eur", 0) ?? 0,
    notas: str(fd, "notas"),
  };
}

export async function crearPuertaPaso(fd: FormData) {
  const s = await createClient();
  const { error } = await s.from("puertas_paso_catalogo").insert(payloadPuerta(fd));
  if (error) redirect(`${BASE}/puertas-paso?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`${BASE}/puertas-paso`);
  redirect(`${BASE}/puertas-paso?ok=creado`);
}

export async function actualizarPuertaPaso(id: string, fd: FormData) {
  const s = await createClient();
  const { error } = await s.from("puertas_paso_catalogo").update(payloadPuerta(fd)).eq("id", id);
  if (error) redirect(`${BASE}/puertas-paso?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`${BASE}/puertas-paso`);
  redirect(`${BASE}/puertas-paso?ok=actualizado`);
}

export async function eliminarPuertaPaso(id: string) {
  const s = await createClient();
  await s.from("puertas_paso_catalogo").delete().eq("id", id);
  revalidatePath(`${BASE}/puertas-paso`);
  redirect(`${BASE}/puertas-paso?ok=eliminado`);
}

// ================== SUELOS ==================

function payloadSuelo(fd: FormData) {
  const nombre = str(fd, "nombre");
  if (!nombre) throw new Error("Nombre obligatorio");
  return {
    nombre,
    tipo: str(fd, "tipo") ?? "laminado",
    clase_uso: str(fd, "clase_uso"),
    grosor_mm: int(fd, "grosor_mm", 8) ?? 8,
    ancho_lama_mm: int(fd, "ancho_lama_mm"),
    largo_lama_mm: int(fd, "largo_lama_mm"),
    acabado: str(fd, "acabado"),
    proveedor_id: str(fd, "proveedor_id"),
    referencia_proveedor: str(fd, "referencia_proveedor"),
    precio_coste_m2: num(fd, "precio_coste_m2", 0) ?? 0,
    precio_pvp_m2: num(fd, "precio_pvp_m2", 0) ?? 0,
    notas: str(fd, "notas"),
  };
}

export async function crearSuelo(fd: FormData) {
  const s = await createClient();
  const { error } = await s.from("suelos_catalogo").insert(payloadSuelo(fd));
  if (error) redirect(`${BASE}/suelos?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`${BASE}/suelos`);
  redirect(`${BASE}/suelos?ok=creado`);
}

export async function actualizarSuelo(id: string, fd: FormData) {
  const s = await createClient();
  const { error } = await s.from("suelos_catalogo").update(payloadSuelo(fd)).eq("id", id);
  if (error) redirect(`${BASE}/suelos?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`${BASE}/suelos`);
  redirect(`${BASE}/suelos?ok=actualizado`);
}

export async function eliminarSuelo(id: string) {
  const s = await createClient();
  await s.from("suelos_catalogo").delete().eq("id", id);
  revalidatePath(`${BASE}/suelos`);
  redirect(`${BASE}/suelos?ok=eliminado`);
}

// ================== RODAPIÉS ==================

function payloadRodapie(fd: FormData) {
  const nombre = str(fd, "nombre");
  if (!nombre) throw new Error("Nombre obligatorio");
  return {
    nombre,
    material: str(fd, "material") ?? "pvc",
    altura_mm: int(fd, "altura_mm", 70) ?? 70,
    grosor_mm: int(fd, "grosor_mm", 12) ?? 12,
    formato_m: num(fd, "formato_m", 2.4) ?? 2.4,
    lleva_led: fd.get("lleva_led") === "on" || fd.get("lleva_led") === "true",
    acabado: str(fd, "acabado"),
    proveedor_id: str(fd, "proveedor_id"),
    referencia_proveedor: str(fd, "referencia_proveedor"),
    precio_coste_ml: num(fd, "precio_coste_ml", 0) ?? 0,
    precio_pvp_ml: num(fd, "precio_pvp_ml", 0) ?? 0,
    notas: str(fd, "notas"),
  };
}

export async function crearRodapie(fd: FormData) {
  const s = await createClient();
  const { error } = await s.from("rodapies_catalogo").insert(payloadRodapie(fd));
  if (error) redirect(`${BASE}/rodapies?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`${BASE}/rodapies`);
  redirect(`${BASE}/rodapies?ok=creado`);
}

export async function actualizarRodapie(id: string, fd: FormData) {
  const s = await createClient();
  const { error } = await s.from("rodapies_catalogo").update(payloadRodapie(fd)).eq("id", id);
  if (error) redirect(`${BASE}/rodapies?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`${BASE}/rodapies`);
  redirect(`${BASE}/rodapies?ok=actualizado`);
}

export async function eliminarRodapie(id: string) {
  const s = await createClient();
  await s.from("rodapies_catalogo").delete().eq("id", id);
  revalidatePath(`${BASE}/rodapies`);
  redirect(`${BASE}/rodapies?ok=eliminado`);
}
