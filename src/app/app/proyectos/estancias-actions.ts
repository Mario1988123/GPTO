"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { TipoEstancia } from "@/lib/tipos/estancias";

const TIPOS: TipoEstancia[] = ["vestidor", "armario_pasillo", "cocina", "comedor", "dormitorio", "bano", "entrada", "salon", "despacho", "otro"];

function payload(fd: FormData) {
  const nombre = String(fd.get("nombre") ?? "").trim();
  if (!nombre) throw new Error("Nombre obligatorio.");
  const tipo = String(fd.get("tipo") ?? "otro") as TipoEstancia;
  if (!TIPOS.includes(tipo)) throw new Error("Tipo inválido.");

  // Nota: largo_mm, ancho_mm, alto_mm ya no se editan en este formulario.
  // Se sincronizan desde estancia_geometria cuando el usuario guarda el plano.
  const parseOpt = (k: string): number | null => {
    const v = String(fd.get(k) ?? "").trim();
    if (!v) return null;
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const payload: Record<string, unknown> = {
    nombre,
    tipo,
    notas: String(fd.get("notas") ?? "").trim() || null,
  };
  // Mantenemos retrocompatibilidad: si vienen valores explícitos los aceptamos
  if (fd.has("largo_mm")) payload.largo_mm = parseOpt("largo_mm");
  if (fd.has("ancho_mm")) payload.ancho_mm = parseOpt("ancho_mm");
  if (fd.has("alto_mm")) payload.alto_mm = parseOpt("alto_mm");
  return payload;
}

export async function crearEstancia(proyectoId: string, fd: FormData) {
  const s = await createClient();
  const { data: max } = await s.from("estancias").select("orden").eq("proyecto_id", proyectoId).order("orden", { ascending: false }).limit(1).maybeSingle();
  const orden = ((max?.orden ?? -1) as number) + 1;

  const { data, error } = await s.from("estancias").insert({ ...payload(fd), proyecto_id: proyectoId, orden }).select("id").single();
  if (error) redirect(`/app/proyectos/${proyectoId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/app/proyectos/${proyectoId}`);
  redirect(`/app/proyectos/${proyectoId}/estancias/${data!.id}?ok=creado`);
}

export async function actualizarEstancia(proyectoId: string, estanciaId: string, fd: FormData) {
  const s = await createClient();
  const { error } = await s.from("estancias").update(payload(fd)).eq("id", estanciaId);
  if (error) redirect(`/app/proyectos/${proyectoId}/estancias/${estanciaId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/app/proyectos/${proyectoId}`);
  revalidatePath(`/app/proyectos/${proyectoId}/estancias/${estanciaId}`);
  redirect(`/app/proyectos/${proyectoId}/estancias/${estanciaId}?ok=actualizado`);
}

export async function eliminarEstancia(proyectoId: string, estanciaId: string) {
  const s = await createClient();
  const { error } = await s.from("estancias").delete().eq("id", estanciaId);
  if (error) redirect(`/app/proyectos/${proyectoId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/app/proyectos/${proyectoId}`);
  redirect(`/app/proyectos/${proyectoId}?ok=eliminado`);
}

export async function crearArmarioEnEstancia(proyectoId: string, estanciaId: string, fd: FormData) {
  const s = await createClient();

  const nombre = String(fd.get("nombre") ?? "").trim() || "Armario";
  const ancho = Number.parseInt(String(fd.get("ancho_total_mm") ?? ""), 10);
  const alto = Number.parseInt(String(fd.get("alto_total_mm") ?? ""), 10);
  const fondo = Number.parseInt(String(fd.get("fondo_mm") ?? ""), 10);
  const tipoInst = String(fd.get("tipo_instalacion") ?? "suelto");
  const margen = Number.parseInt(String(fd.get("margen_tapeta_mm") ?? "0"), 10);
  if (!Number.isFinite(ancho) || ancho <= 0) throw new Error("Ancho inválido.");
  if (!Number.isFinite(alto) || alto <= 0) throw new Error("Alto inválido.");
  if (!Number.isFinite(fondo) || fondo <= 0) throw new Error("Fondo inválido.");

  // Obtener orden
  const { data: max } = await s.from("armarios").select("orden").eq("estancia_id", estanciaId).order("orden", { ascending: false }).limit(1).maybeSingle();
  const orden = ((max?.orden ?? -1) as number) + 1;

  const { data, error } = await s.from("armarios").insert({
    proyecto_id: proyectoId,
    estancia_id: estanciaId,
    nombre,
    ancho_total_mm: ancho,
    alto_total_mm: alto,
    fondo_mm: fondo,
    tipo_instalacion: tipoInst,
    margen_tapeta_mm: tipoInst === "empotrado" ? margen : 0,
    orden,
  }).select("id").single();
  if (error) redirect(`/app/proyectos/${proyectoId}/estancias/${estanciaId}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/app/proyectos/${proyectoId}/estancias/${estanciaId}`);
  redirect(`/app/proyectos/${proyectoId}/armarios/${data!.id}?ok=creado`);
}

export async function actualizarDatosInstalacion(proyectoId: string, armarioId: string, fd: FormData) {
  const s = await createClient();
  const tipoInst = String(fd.get("tipo_instalacion") ?? "suelto");
  const margen = Number.parseInt(String(fd.get("margen_tapeta_mm") ?? "0"), 10);
  const nombre = String(fd.get("nombre") ?? "").trim() || "Armario";
  const ancho = Number.parseInt(String(fd.get("ancho_total_mm") ?? ""), 10);
  const alto = Number.parseInt(String(fd.get("alto_total_mm") ?? ""), 10);
  const fondo = Number.parseInt(String(fd.get("fondo_mm") ?? ""), 10);
  if (!Number.isFinite(ancho) || ancho <= 0) throw new Error("Ancho inválido.");
  if (!Number.isFinite(alto) || alto <= 0) throw new Error("Alto inválido.");
  if (!Number.isFinite(fondo) || fondo <= 0) throw new Error("Fondo inválido.");

  const { error } = await s.from("armarios").update({
    nombre,
    ancho_total_mm: ancho,
    alto_total_mm: alto,
    fondo_mm: fondo,
    tipo_instalacion: tipoInst,
    margen_tapeta_mm: tipoInst === "empotrado" ? margen : 0,
  }).eq("id", armarioId);
  if (error) redirect(`/app/proyectos/${proyectoId}/armarios/${armarioId}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/app/proyectos/${proyectoId}/armarios/${armarioId}`);
  redirect(`/app/proyectos/${proyectoId}/armarios/${armarioId}?ok=actualizado`);
}
