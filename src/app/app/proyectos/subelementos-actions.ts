"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { TipoSubelemento } from "@/lib/tipos/proyectos";

const TIPOS_VALIDOS: TipoSubelemento[] = [
  "cajon", "balda_fija", "balda_regulable", "puerta_abatible", "puerta_corredera",
  "puerta_plegable", "barra_colgar", "hueco_abierto", "tapeta_ciega", "espejo",
  "led_rebaje", "zapatero", "cesto_extraible", "corbatero", "joyero",
  "portapantalones", "canaleta_tirador",
];

function parseOptInt(fd: FormData, key: string): number | null {
  const v = String(fd.get(key) ?? "").trim();
  if (!v) return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseInt0(fd: FormData, key: string): number {
  return parseOptInt(fd, key) ?? 0;
}

function parseConfig(fd: FormData): Record<string, unknown> {
  const config: Record<string, unknown> = {};
  const tirador = String(fd.get("config_tirador") ?? "").trim();
  if (tirador) config.tirador = tirador;
  const acabado = String(fd.get("config_acabado") ?? "").trim();
  if (acabado) config.acabado = acabado;
  const referencia = String(fd.get("config_referencia") ?? "").trim();
  if (referencia) config.referencia = referencia;
  return config;
}

export async function crearSubelemento(
  proyectoId: string,
  armarioId: string,
  moduloId: string,
  fd: FormData,
) {
  const s = await createClient();

  const tipo = String(fd.get("tipo") ?? "") as TipoSubelemento;
  if (!TIPOS_VALIDOS.includes(tipo)) {
    redirect(`/app/proyectos/${proyectoId}/armarios/${armarioId}?error=${encodeURIComponent("Tipo subelemento inválido")}`);
  }

  const { data: max } = await s.from("modulo_subelementos")
    .select("orden").eq("modulo_id", moduloId)
    .order("orden", { ascending: false }).limit(1).maybeSingle();
  const orden = ((max?.orden ?? -1) as number) + 1;

  const { error } = await s.from("modulo_subelementos").insert({
    modulo_id: moduloId,
    tipo,
    orden,
    alto_mm: parseOptInt(fd, "alto_mm"),
    ancho_mm: parseOptInt(fd, "ancho_mm"),
    offset_x_mm: parseInt0(fd, "offset_x_mm"),
    offset_y_mm: parseInt0(fd, "offset_y_mm"),
    offset_z_mm: parseInt0(fd, "offset_z_mm"),
    config: parseConfig(fd),
    etiqueta: String(fd.get("etiqueta") ?? "").trim() || null,
  });

  if (error) {
    redirect(`/app/proyectos/${proyectoId}/armarios/${armarioId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/app/proyectos/${proyectoId}/armarios/${armarioId}`);
  redirect(`/app/proyectos/${proyectoId}/armarios/${armarioId}?ok=creado`);
}

export async function actualizarSubelemento(
  proyectoId: string,
  armarioId: string,
  subelementoId: string,
  fd: FormData,
) {
  const s = await createClient();

  const update: Record<string, unknown> = {
    alto_mm: parseOptInt(fd, "alto_mm"),
    ancho_mm: parseOptInt(fd, "ancho_mm"),
    offset_x_mm: parseInt0(fd, "offset_x_mm"),
    offset_y_mm: parseInt0(fd, "offset_y_mm"),
    offset_z_mm: parseInt0(fd, "offset_z_mm"),
    etiqueta: String(fd.get("etiqueta") ?? "").trim() || null,
    config: parseConfig(fd),
  };

  const ordenRaw = String(fd.get("orden") ?? "").trim();
  if (ordenRaw) {
    const n = Number.parseInt(ordenRaw, 10);
    if (Number.isFinite(n) && n >= 0) update.orden = n;
  }

  const { error } = await s.from("modulo_subelementos").update(update).eq("id", subelementoId);
  if (error) {
    redirect(`/app/proyectos/${proyectoId}/armarios/${armarioId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/app/proyectos/${proyectoId}/armarios/${armarioId}`);
  redirect(`/app/proyectos/${proyectoId}/armarios/${armarioId}?ok=actualizado`);
}

export async function eliminarSubelemento(
  proyectoId: string,
  armarioId: string,
  subelementoId: string,
) {
  const s = await createClient();
  const { error } = await s.from("modulo_subelementos").delete().eq("id", subelementoId);
  if (error) {
    redirect(`/app/proyectos/${proyectoId}/armarios/${armarioId}?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath(`/app/proyectos/${proyectoId}/armarios/${armarioId}`);
  redirect(`/app/proyectos/${proyectoId}/armarios/${armarioId}?ok=eliminado`);
}

export async function moverPosicionModulo(
  proyectoId: string,
  armarioId: string,
  moduloId: string,
  posicion_x_mm: number,
  posicion_y_mm: number,
) {
  const s = await createClient();
  const { error } = await s.from("modulos_armario")
    .update({ posicion_x_mm, posicion_y_mm })
    .eq("id", moduloId);
  if (error) throw new Error(error.message);
  revalidatePath(`/app/proyectos/${proyectoId}/armarios/${armarioId}`);
}

export async function actualizarLedModulo(
  proyectoId: string,
  armarioId: string,
  moduloId: string,
  fd: FormData,
) {
  const s = await createClient();
  const tiene = fd.get("tiene_led_rebaje") === "on" || fd.get("tiene_led_rebaje") === "true";
  const color = String(fd.get("led_color_hex") ?? "").trim() || null;
  const intensidadRaw = String(fd.get("led_intensidad_lm_m") ?? "").trim();
  const intensidad = intensidadRaw ? Number.parseInt(intensidadRaw, 10) : null;

  const { error } = await s.from("modulos_armario").update({
    tiene_led_rebaje: tiene,
    led_color_hex: tiene ? color : null,
    led_intensidad_lm_m: tiene && intensidad && Number.isFinite(intensidad) ? intensidad : null,
  }).eq("id", moduloId);

  if (error) {
    redirect(`/app/proyectos/${proyectoId}/armarios/${armarioId}?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath(`/app/proyectos/${proyectoId}/armarios/${armarioId}`);
  redirect(`/app/proyectos/${proyectoId}/armarios/${armarioId}?ok=actualizado`);
}
