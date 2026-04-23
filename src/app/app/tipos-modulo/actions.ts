"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NINGUNA } from "@/lib/tipos/catalogo";
import type { FuenteDim, LadosCanto } from "@/lib/tipos/tipos_modulo";

const BASE = "/app/tipos-modulo";
const FUENTES: FuenteDim[] = ["ancho", "alto", "fondo", "fijo"];
const LADOS: LadosCanto[] = ["ninguno","1","2_opuestos","2_contiguos","3","4"];

// ============= TIPOS MÓDULO =============

function payloadTipo(fd: FormData) {
  const nombre = String(fd.get("nombre") ?? "").trim();
  if (!nombre) throw new Error("Nombre obligatorio.");
  const ancho = Number.parseInt(String(fd.get("ancho_default_mm") ?? ""), 10);
  const alto = Number.parseInt(String(fd.get("alto_default_mm") ?? ""), 10);
  const fondo = Number.parseInt(String(fd.get("fondo_default_mm") ?? ""), 10);
  if (!Number.isFinite(ancho) || ancho <= 0) throw new Error("Ancho inválido.");
  if (!Number.isFinite(alto) || alto <= 0) throw new Error("Alto inválido.");
  if (!Number.isFinite(fondo) || fondo <= 0) throw new Error("Fondo inválido.");
  const horas = Number.parseFloat(String(fd.get("horas_fabricacion_default") ?? "1"));
  if (!Number.isFinite(horas) || horas < 0) throw new Error("Horas inválidas.");
  const ref = String(fd.get("referencia_tablero_default_id") ?? "").trim();

  return {
    nombre,
    descripcion: String(fd.get("descripcion") ?? "").trim() || null,
    ancho_default_mm: ancho,
    alto_default_mm: alto,
    fondo_default_mm: fondo,
    referencia_tablero_default_id: ref && ref !== NINGUNA ? ref : null,
    horas_fabricacion_default: horas,
  };
}

export async function crearTipo(fd: FormData) {
  const s = await createClient();
  const { data, error } = await s.from("tipos_modulo").insert({ ...payloadTipo(fd), activo: true }).select("id").single();
  if (error) redirect(`${BASE}/nuevo?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE);
  redirect(`${BASE}/${data!.id}?ok=creado`);
}
export async function actualizarTipo(id: string, fd: FormData) {
  const s = await createClient();
  const { error } = await s.from("tipos_modulo").update(payloadTipo(fd)).eq("id", id);
  if (error) redirect(`${BASE}/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE); revalidatePath(`${BASE}/${id}`);
  redirect(`${BASE}/${id}?ok=actualizado`);
}
export async function alternarTipo(id: string, activar: boolean) {
  const s = await createClient();
  const { error } = await s.from("tipos_modulo").update({ activo: activar }).eq("id", id);
  if (error) redirect(`${BASE}/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE); revalidatePath(`${BASE}/${id}`);
  redirect(`${BASE}/${id}?ok=${activar ? "reactivado" : "desactivado"}`);
}
export async function eliminarTipo(id: string) {
  const s = await createClient();
  const { error } = await s.from("tipos_modulo").delete().eq("id", id);
  if (error) redirect(`${BASE}/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE);
  redirect(`${BASE}?ok=eliminado`);
}

// ============= PIEZAS =============

function payloadPieza(fd: FormData) {
  const nombre = String(fd.get("nombre") ?? "").trim();
  if (!nombre) throw new Error("Nombre pieza obligatorio.");
  const cantidad = Number.parseInt(String(fd.get("cantidad") ?? "1"), 10);
  const orden = Number.parseInt(String(fd.get("orden") ?? "0"), 10);
  if (!Number.isFinite(cantidad) || cantidad <= 0) throw new Error("Cantidad inválida.");

  const fuenteLargo = String(fd.get("fuente_largo") ?? "") as FuenteDim;
  const fuenteAncho = String(fd.get("fuente_ancho") ?? "") as FuenteDim;
  if (!FUENTES.includes(fuenteLargo)) throw new Error("fuente_largo inválida.");
  if (!FUENTES.includes(fuenteAncho)) throw new Error("fuente_ancho inválida.");

  const ajusteLargoMm = Number.parseInt(String(fd.get("ajuste_largo_mm") ?? "0"), 10);
  const ajusteLargoGrosores = Number.parseInt(String(fd.get("ajuste_largo_grosores") ?? "0"), 10);
  const ajusteAnchoMm = Number.parseInt(String(fd.get("ajuste_ancho_mm") ?? "0"), 10);
  const ajusteAnchoGrosores = Number.parseInt(String(fd.get("ajuste_ancho_grosores") ?? "0"), 10);

  const valorLargoFijoStr = String(fd.get("valor_largo_fijo_mm") ?? "").trim();
  const valorAnchoFijoStr = String(fd.get("valor_ancho_fijo_mm") ?? "").trim();
  let valorLargoFijo: number | null = null;
  let valorAnchoFijo: number | null = null;
  if (fuenteLargo === "fijo") {
    const v = Number.parseInt(valorLargoFijoStr, 10);
    if (!Number.isFinite(v) || v <= 0) throw new Error("Valor largo fijo requerido.");
    valorLargoFijo = v;
  }
  if (fuenteAncho === "fijo") {
    const v = Number.parseInt(valorAnchoFijoStr, 10);
    if (!Number.isFinite(v) || v <= 0) throw new Error("Valor ancho fijo requerido.");
    valorAnchoFijo = v;
  }

  const refTablero = String(fd.get("referencia_tablero_id") ?? "").trim();
  const canto = String(fd.get("canto_id") ?? "").trim();
  const lados = String(fd.get("lados_con_canto") ?? "ninguno") as LadosCanto;
  if (!LADOS.includes(lados)) throw new Error("lados_con_canto inválido.");

  return {
    nombre,
    orden,
    cantidad,
    fuente_largo: fuenteLargo,
    ajuste_largo_mm: ajusteLargoMm,
    ajuste_largo_grosores: ajusteLargoGrosores,
    valor_largo_fijo_mm: valorLargoFijo,
    fuente_ancho: fuenteAncho,
    ajuste_ancho_mm: ajusteAnchoMm,
    ajuste_ancho_grosores: ajusteAnchoGrosores,
    valor_ancho_fijo_mm: valorAnchoFijo,
    referencia_tablero_id: refTablero && refTablero !== NINGUNA ? refTablero : null,
    canto_id: canto && canto !== NINGUNA ? canto : null,
    lados_con_canto: lados,
    respeta_veta_override: null, // futuro
    notas: String(fd.get("notas") ?? "").trim() || null,
  };
}

export async function crearPieza(tipoId: string, fd: FormData) {
  const s = await createClient();
  const { error } = await s
    .from("tipo_modulo_piezas")
    .insert({ ...payloadPieza(fd), tipo_modulo_id: tipoId });
  if (error) redirect(`${BASE}/${tipoId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`${BASE}/${tipoId}`);
  redirect(`${BASE}/${tipoId}?ok=creado`);
}

export async function eliminarPieza(tipoId: string, piezaId: string) {
  const s = await createClient();
  const { error } = await s.from("tipo_modulo_piezas").delete().eq("id", piezaId);
  if (error) redirect(`${BASE}/${tipoId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`${BASE}/${tipoId}`);
  redirect(`${BASE}/${tipoId}?ok=eliminado`);
}

// ============= HERRAJES ASOCIADOS =============

export async function asociarHerraje(tipoId: string, fd: FormData) {
  const herraje_id = String(fd.get("herraje_id") ?? "").trim();
  const cantidad = Number.parseInt(String(fd.get("cantidad") ?? "1"), 10);
  if (!herraje_id) throw new Error("Herraje obligatorio.");
  if (!Number.isFinite(cantidad) || cantidad <= 0) throw new Error("Cantidad inválida.");

  const s = await createClient();
  const { error } = await s
    .from("tipo_modulo_herrajes")
    .insert({
      tipo_modulo_id: tipoId,
      herraje_id,
      cantidad,
      notas: String(fd.get("notas") ?? "").trim() || null,
    });
  if (error) redirect(`${BASE}/${tipoId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`${BASE}/${tipoId}`);
  redirect(`${BASE}/${tipoId}?ok=creado`);
}

export async function desasociarHerraje(tipoId: string, relId: string) {
  const s = await createClient();
  const { error } = await s.from("tipo_modulo_herrajes").delete().eq("id", relId);
  if (error) redirect(`${BASE}/${tipoId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`${BASE}/${tipoId}`);
  redirect(`${BASE}/${tipoId}?ok=eliminado`);
}
