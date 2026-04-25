"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { TipoSubelemento } from "@/lib/tipos/proyectos";

async function assertProyectoEditableSub(proyectoId: string) {
  const s = await createClient();
  const { data } = await s
    .from("proyectos")
    .select("estado, cerrado_at")
    .eq("id", proyectoId)
    .maybeSingle<{ estado: string; cerrado_at: string | null }>();
  if (!data) return; // si no hay proyecto, deja pasar (RLS ya habrá filtrado)
  const cerrado = data.cerrado_at != null || data.estado === "entregado" || data.estado === "cancelado";
  if (cerrado) throw new Error("Proyecto cerrado: reábrelo antes de editar.");
}

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

function parseOrigen(fd: FormData) {
  const es_propio_raw = String(fd.get("es_propio") ?? "true").trim();
  const es_propio = es_propio_raw === "true" || es_propio_raw === "on";
  const proveedor_nombre = String(fd.get("proveedor_nombre") ?? "").trim() || null;
  const ref_proveedor = String(fd.get("ref_proveedor") ?? "").trim() || null;
  const precio_raw = String(fd.get("precio_override_eur") ?? "").trim();
  const precio_override_eur = precio_raw
    ? Number.parseFloat(precio_raw.replace(",", "."))
    : null;
  const fondo_raw = String(fd.get("fondo_mm") ?? "").trim();
  const fondo_mm = fondo_raw ? Number.parseInt(fondo_raw, 10) : null;
  return {
    es_propio,
    proveedor_nombre: es_propio ? null : proveedor_nombre,
    ref_proveedor: es_propio ? null : ref_proveedor,
    precio_override_eur:
      !es_propio && precio_override_eur !== null && Number.isFinite(precio_override_eur)
        ? precio_override_eur
        : null,
    fondo_mm: fondo_mm && Number.isFinite(fondo_mm) && fondo_mm > 0 ? fondo_mm : null,
  };
}

export async function crearSubelemento(
  proyectoId: string,
  armarioId: string,
  moduloId: string,
  fd: FormData,
) {
  await assertProyectoEditableSub(proyectoId);
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
    ...parseOrigen(fd),
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
  await assertProyectoEditableSub(proyectoId);
  const s = await createClient();

  const update: Record<string, unknown> = {
    alto_mm: parseOptInt(fd, "alto_mm"),
    ancho_mm: parseOptInt(fd, "ancho_mm"),
    offset_x_mm: parseInt0(fd, "offset_x_mm"),
    offset_y_mm: parseInt0(fd, "offset_y_mm"),
    offset_z_mm: parseInt0(fd, "offset_z_mm"),
    etiqueta: String(fd.get("etiqueta") ?? "").trim() || null,
    config: parseConfig(fd),
    ...parseOrigen(fd),
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
  await assertProyectoEditableSub(proyectoId);
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
  await assertProyectoEditableSub(proyectoId);
  const s = await createClient();
  const { error } = await s.from("modulos_armario")
    .update({ posicion_x_mm, posicion_y_mm })
    .eq("id", moduloId);
  if (error) throw new Error(error.message);
  revalidatePath(`/app/proyectos/${proyectoId}/armarios/${armarioId}`);
}

/**
 * Genera N cajones para un módulo, con distribución:
 * - "iguales": N cajones del mismo alto.
 * - "progresiva": primero grandes, luego pequeños (45/30/15/10%).
 * - "personalizada": alturas custom pasadas en el array alturasMm.
 */
export async function generarCajones(
  proyectoId: string,
  armarioId: string,
  moduloId: string,
  distribucion: "iguales" | "progresiva" | "personalizada",
  n: number,
  alturasMm: number[] | null,
) {
  await assertProyectoEditableSub(proyectoId);
  const s = await createClient();
  const { data: mod } = await s
    .from("modulos_armario")
    .select("alto_mm, separacion_cajones_mm")
    .eq("id", moduloId)
    .maybeSingle<{ alto_mm: number; separacion_cajones_mm: number | null }>();
  if (!mod) throw new Error("Módulo no encontrado");

  // Descontar separaciones del alto útil: N cajones llevan (N-1) separaciones entre ellos
  // (o N según criterio). Aquí uso (N-1) porque no hay hueco arriba del último ni debajo del primero.
  const sep = mod.separacion_cajones_mm ?? 2;
  const altoUtil = Math.max(1, mod.alto_mm - sep * Math.max(0, n - 1));

  // Borrar cajones previos (solo los de tipo cajón)
  await s.from("modulo_subelementos").delete().eq("modulo_id", moduloId).eq("tipo", "cajon");

  let alturas: number[] = [];
  if (distribucion === "iguales") {
    const alto = Math.floor(altoUtil / Math.max(1, n));
    alturas = Array.from({ length: n }, () => alto);
  } else if (distribucion === "progresiva") {
    const pesos = [0.30, 0.22, 0.18, 0.13, 0.10, 0.07].slice(0, n);
    const sum = pesos.reduce((a, b) => a + b, 0);
    alturas = pesos.map((w) => Math.round((w / sum) * altoUtil));
  } else if (distribucion === "personalizada") {
    if (!alturasMm || alturasMm.length === 0) throw new Error("Alturas personalizadas vacías");
    alturas = alturasMm.map((a) => Math.max(50, Math.round(a)));
  }

  // Insertar en orden de abajo a arriba
  const rows = alturas.map((alto, i) => ({
    modulo_id: moduloId,
    tipo: "cajon" as const,
    orden: i,
    alto_mm: alto,
    offset_x_mm: 0,
    offset_y_mm: 0,
    offset_z_mm: 0,
    config: { distribucion },
    etiqueta: `Cajón ${i + 1}`,
    es_propio: true,
    proveedor_nombre: null,
    ref_proveedor: null,
    precio_override_eur: null,
    fondo_mm: null,
  }));

  const { error } = await s.from("modulo_subelementos").insert(rows);
  if (error) {
    redirect(`/app/proyectos/${proyectoId}/armarios/${armarioId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/app/proyectos/${proyectoId}/armarios/${armarioId}`);
  redirect(`/app/proyectos/${proyectoId}/armarios/${armarioId}?ok=creado`);
}

export async function actualizarConfiguracionModulo(
  proyectoId: string,
  armarioId: string,
  moduloId: string,
  fd: FormData,
) {
  await assertProyectoEditableSub(proyectoId);
  const s = await createClient();
  const parseOpt = (k: string): number | null => {
    const v = String(fd.get(k) ?? "").trim();
    if (!v) return null;
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const update: Record<string, unknown> = {
    tableros_grosor_mm: parseOpt("tableros_grosor_mm"),
    trasera_grosor_mm: parseOpt("trasera_grosor_mm"),
    separacion_cajones_mm: parseOpt("separacion_cajones_mm") ?? 2,
    mostrar_puertas:
      fd.get("mostrar_puertas") === "on" || fd.get("mostrar_puertas") === "true",
    notas: String(fd.get("notas") ?? "").trim() || null,
  };

  const { error } = await s.from("modulos_armario").update(update).eq("id", moduloId);
  if (error) {
    redirect(`/app/proyectos/${proyectoId}/armarios/${armarioId}?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath(`/app/proyectos/${proyectoId}/armarios/${armarioId}`);
  redirect(`/app/proyectos/${proyectoId}/armarios/${armarioId}?ok=actualizado`);
}

export async function actualizarLedModulo(
  proyectoId: string,
  armarioId: string,
  moduloId: string,
  fd: FormData,
) {
  await assertProyectoEditableSub(proyectoId);
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
