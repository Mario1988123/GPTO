"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NINGUNA } from "@/lib/tipos/catalogo";
import type { EstadoProyecto } from "@/lib/tipos/proyectos";

const BASE = "/app/proyectos";
const ESTADOS: EstadoProyecto[] = [
  "borrador", "presupuestado", "confirmado", "en_fabricacion", "entregado", "cancelado",
];

async function assertProyectoEditable(proyectoId: string) {
  const s = await createClient();
  const { data } = await s
    .from("proyectos")
    .select("estado, cerrado_at")
    .eq("id", proyectoId)
    .maybeSingle<{ estado: EstadoProyecto; cerrado_at: string | null }>();
  if (!data) throw new Error("Proyecto no encontrado.");
  const cerrado = data.cerrado_at != null || data.estado === "entregado" || data.estado === "cancelado";
  if (cerrado) throw new Error("Proyecto cerrado: reábrelo para ampliación antes de editar.");
}

// ================== PROYECTOS ==================

// Payload al crear: el estado se fuerza a 'borrador' — no se permite elegirlo.
// El estado avanza sólo por workflow (aceptar presupuesto, confirmar pedido, etc.).
function payloadCrearProyecto(fd: FormData) {
  const nombre = String(fd.get("nombre") ?? "").trim();
  if (!nombre) throw new Error("Nombre obligatorio.");
  const cliente_id = String(fd.get("cliente_id") ?? "").trim();
  if (!cliente_id) throw new Error("Cliente obligatorio.");
  return {
    nombre,
    cliente_id,
    estado: "borrador" as EstadoProyecto,
    notas: String(fd.get("notas") ?? "").trim() || null,
  };
}

// Payload al editar: no se toca el estado (lo ignora aunque venga en el form).
function payloadEditarProyecto(fd: FormData) {
  const nombre = String(fd.get("nombre") ?? "").trim();
  if (!nombre) throw new Error("Nombre obligatorio.");
  const cliente_id = String(fd.get("cliente_id") ?? "").trim();
  if (!cliente_id) throw new Error("Cliente obligatorio.");
  return {
    nombre,
    cliente_id,
    notas: String(fd.get("notas") ?? "").trim() || null,
  };
}

export async function crearProyecto(fd: FormData) {
  const s = await createClient();
  const { data, error } = await s.from("proyectos").insert(payloadCrearProyecto(fd)).select("id").single();
  if (error) redirect(`${BASE}/nuevo?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE);
  redirect(`${BASE}/${data!.id}?ok=creado`);
}
export async function actualizarProyecto(id: string, fd: FormData) {
  await assertProyectoEditable(id);
  const s = await createClient();
  const { error } = await s.from("proyectos").update(payloadEditarProyecto(fd)).eq("id", id);
  if (error) redirect(`${BASE}/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE); revalidatePath(`${BASE}/${id}`);
  redirect(`${BASE}/${id}?ok=actualizado`);
}
export async function eliminarProyecto(id: string) {
  const s = await createClient();
  const { error } = await s.from("proyectos").delete().eq("id", id);
  if (error) redirect(`${BASE}/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE);
  redirect(`${BASE}?ok=eliminado`);
}
export async function cambiarEstado(id: string, estado: EstadoProyecto) {
  if (!ESTADOS.includes(estado)) throw new Error("Estado inválido.");
  const s = await createClient();
  const { error } = await s.from("proyectos").update({ estado }).eq("id", id);
  if (error) redirect(`${BASE}/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE); revalidatePath(`${BASE}/${id}`);
  redirect(`${BASE}/${id}?ok=actualizado`);
}

export async function reabrirProyecto(id: string) {
  const s = await createClient();
  const { error } = await s
    .from("proyectos")
    .update({ cerrado_at: null, estado: "en_fabricacion" })
    .eq("id", id);
  if (error) redirect(`${BASE}/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE);
  revalidatePath(`${BASE}/${id}`);
  redirect(`${BASE}/${id}?ok=reabierto`);
}

export async function cerrarProyecto(id: string) {
  const s = await createClient();
  const { error } = await s
    .from("proyectos")
    .update({ cerrado_at: new Date().toISOString(), estado: "entregado" })
    .eq("id", id);
  if (error) redirect(`${BASE}/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE);
  revalidatePath(`${BASE}/${id}`);
  redirect(`${BASE}/${id}?ok=cerrado`);
}

// ================== ARMARIOS ==================

function payloadArmario(fd: FormData) {
  const nombre = String(fd.get("nombre") ?? "").trim() || "Armario";
  const ancho = Number.parseInt(String(fd.get("ancho_total_mm") ?? ""), 10);
  const alto = Number.parseInt(String(fd.get("alto_total_mm") ?? ""), 10);
  const fondo = Number.parseInt(String(fd.get("fondo_mm") ?? ""), 10);
  if (!Number.isFinite(ancho) || ancho <= 0) throw new Error("Ancho total inválido.");
  if (!Number.isFinite(alto) || alto <= 0) throw new Error("Alto total inválido.");
  if (!Number.isFinite(fondo) || fondo <= 0) throw new Error("Fondo inválido.");
  return {
    nombre,
    ancho_total_mm: ancho,
    alto_total_mm: alto,
    fondo_mm: fondo,
    notas: String(fd.get("notas") ?? "").trim() || null,
  };
}

export async function crearArmario(proyectoId: string, fd: FormData) {
  await assertProyectoEditable(proyectoId);
  const s = await createClient();
  const { data: max } = await s
    .from("armarios")
    .select("orden")
    .eq("proyecto_id", proyectoId)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();
  const orden = ((max?.orden ?? -1) as number) + 1;

  const { data, error } = await s
    .from("armarios")
    .insert({ ...payloadArmario(fd), proyecto_id: proyectoId, orden })
    .select("id")
    .single();
  if (error) redirect(`${BASE}/${proyectoId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`${BASE}/${proyectoId}`);
  redirect(`${BASE}/${proyectoId}/armarios/${data!.id}?ok=creado`);
}

export async function actualizarArmario(proyectoId: string, armarioId: string, fd: FormData) {
  await assertProyectoEditable(proyectoId);
  const s = await createClient();
  const { error } = await s.from("armarios").update(payloadArmario(fd)).eq("id", armarioId);
  if (error) redirect(`${BASE}/${proyectoId}/armarios/${armarioId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`${BASE}/${proyectoId}`);
  revalidatePath(`${BASE}/${proyectoId}/armarios/${armarioId}`);
  redirect(`${BASE}/${proyectoId}/armarios/${armarioId}?ok=actualizado`);
}

export async function eliminarArmario(proyectoId: string, armarioId: string) {
  await assertProyectoEditable(proyectoId);
  const s = await createClient();
  const { error } = await s.from("armarios").delete().eq("id", armarioId);
  if (error) redirect(`${BASE}/${proyectoId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`${BASE}/${proyectoId}`);
  redirect(`${BASE}/${proyectoId}?ok=eliminado`);
}

// ================== MÓDULOS DEL ARMARIO ==================

function payloadModulo(fd: FormData) {
  const tipo_modulo_id = String(fd.get("tipo_modulo_id") ?? "").trim();
  if (!tipo_modulo_id) throw new Error("Tipo de módulo obligatorio.");
  const ancho = Number.parseInt(String(fd.get("ancho_mm") ?? ""), 10);
  const alto = Number.parseInt(String(fd.get("alto_mm") ?? ""), 10);
  const fondo = Number.parseInt(String(fd.get("fondo_mm") ?? ""), 10);
  if (!Number.isFinite(ancho) || ancho <= 0) throw new Error("Ancho inválido.");
  if (!Number.isFinite(alto) || alto <= 0) throw new Error("Alto inválido.");
  if (!Number.isFinite(fondo) || fondo <= 0) throw new Error("Fondo inválido.");

  const ref = String(fd.get("referencia_tablero_id") ?? "").trim();
  return {
    tipo_modulo_id,
    ancho_mm: ancho,
    alto_mm: alto,
    fondo_mm: fondo,
    referencia_tablero_id: ref && ref !== NINGUNA ? ref : null,
    nombre_override: String(fd.get("nombre_override") ?? "").trim() || null,
    notas: String(fd.get("notas") ?? "").trim() || null,
  };
}

export async function anadirModulo(proyectoId: string, armarioId: string, fd: FormData) {
  await assertProyectoEditable(proyectoId);
  const s = await createClient();

  // Traigo los módulos existentes para:
  //  - calcular orden (último + 1)
  //  - calcular posicion_x_mm inicial (ancho acumulado → no solapan)
  const { data: existentes } = await s
    .from("modulos_armario")
    .select("orden, ancho_mm, posicion_x_mm")
    .eq("armario_id", armarioId)
    .order("orden");

  const orden = ((existentes?.[existentes.length - 1]?.orden ?? -1) as number) + 1;
  // Sumo el ancho de todos los previos que estén pegados al origen (fila base).
  // Si Mario ha arrastrado alguno en Y, la heurística aún funciona — simplemente
  // el nuevo módulo aparece pegado al último libre sin solapar.
  const anchoAcumulado = (existentes ?? []).reduce((a, m) => a + (m.ancho_mm as number), 0);

  const { error } = await s
    .from("modulos_armario")
    .insert({
      ...payloadModulo(fd),
      armario_id: armarioId,
      orden,
      posicion_x_mm: anchoAcumulado,
      posicion_y_mm: 0,
    });
  if (error) redirect(`${BASE}/${proyectoId}/armarios/${armarioId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`${BASE}/${proyectoId}/armarios/${armarioId}`);
  redirect(`${BASE}/${proyectoId}/armarios/${armarioId}?ok=creado`);
}

export async function actualizarModulo(
  proyectoId: string,
  armarioId: string,
  moduloId: string,
  fd: FormData,
) {
  await assertProyectoEditable(proyectoId);
  const s = await createClient();
  const { error } = await s.from("modulos_armario").update(payloadModulo(fd)).eq("id", moduloId);
  if (error) redirect(`${BASE}/${proyectoId}/armarios/${armarioId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`${BASE}/${proyectoId}/armarios/${armarioId}`);
  redirect(`${BASE}/${proyectoId}/armarios/${armarioId}?ok=actualizado`);
}

export async function eliminarModulo(proyectoId: string, armarioId: string, moduloId: string) {
  await assertProyectoEditable(proyectoId);
  const s = await createClient();
  const { error } = await s.from("modulos_armario").delete().eq("id", moduloId);
  if (error) redirect(`${BASE}/${proyectoId}/armarios/${armarioId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`${BASE}/${proyectoId}/armarios/${armarioId}`);
  redirect(`${BASE}/${proyectoId}/armarios/${armarioId}?ok=eliminado`);
}

export async function moverModulo(
  proyectoId: string,
  armarioId: string,
  moduloId: string,
  direccion: "arriba" | "abajo",
) {
  const s = await createClient();
  const { data: todos } = await s
    .from("modulos_armario")
    .select("id, orden")
    .eq("armario_id", armarioId)
    .order("orden");
  if (!todos) return;
  const idx = todos.findIndex((m) => m.id === moduloId);
  if (idx < 0) return;
  const swapIdx = direccion === "arriba" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= todos.length) return;
  const a = todos[idx];
  const b = todos[swapIdx];
  await s.from("modulos_armario").update({ orden: -1 }).eq("id", a.id);
  await s.from("modulos_armario").update({ orden: a.orden }).eq("id", b.id);
  await s.from("modulos_armario").update({ orden: b.orden }).eq("id", a.id);
  revalidatePath(`${BASE}/${proyectoId}/armarios/${armarioId}`);
  redirect(`${BASE}/${proyectoId}/armarios/${armarioId}`);
}
