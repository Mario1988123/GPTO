"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const BASE = "/app/almacenes";

// ================== ALMACENES ==================
export async function crearAlmacen(fd: FormData) {
  const s = await createClient();
  const nombre = String(fd.get("nombre") ?? "").trim();
  if (!nombre) throw new Error("Nombre obligatorio");
  const { error } = await s.from("almacenes").insert({
    nombre,
    direccion: String(fd.get("direccion") ?? "").trim() || null,
    notas: String(fd.get("notas") ?? "").trim() || null,
    es_principal: fd.get("es_principal") === "on",
  });
  if (error) redirect(`${BASE}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE);
  redirect(`${BASE}?ok=creado`);
}

export async function actualizarAlmacen(id: string, fd: FormData) {
  const s = await createClient();
  const update = {
    nombre: String(fd.get("nombre") ?? "").trim(),
    direccion: String(fd.get("direccion") ?? "").trim() || null,
    notas: String(fd.get("notas") ?? "").trim() || null,
    es_principal: fd.get("es_principal") === "on",
    activo: fd.get("activo") !== "off",
  };
  const { error } = await s.from("almacenes").update(update).eq("id", id);
  if (error) redirect(`${BASE}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE);
  redirect(`${BASE}?ok=actualizado`);
}

export async function eliminarAlmacen(id: string) {
  const s = await createClient();
  await s.from("almacenes").delete().eq("id", id);
  revalidatePath(BASE);
  redirect(`${BASE}?ok=eliminado`);
}

// ================== FURGONETAS ==================
export async function crearFurgoneta(fd: FormData) {
  const s = await createClient();
  const nombre = String(fd.get("nombre") ?? "").trim();
  if (!nombre) throw new Error("Nombre obligatorio");
  const { error } = await s.from("furgonetas").insert({
    nombre,
    matricula: String(fd.get("matricula") ?? "").trim() || null,
    modelo: String(fd.get("modelo") ?? "").trim() || null,
    conductor_usuario_id: String(fd.get("conductor_usuario_id") ?? "").trim() || null,
    notas: String(fd.get("notas") ?? "").trim() || null,
  });
  if (error) redirect(`/app/furgonetas?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/app/furgonetas");
  redirect("/app/furgonetas?ok=creada");
}

export async function actualizarFurgoneta(id: string, fd: FormData) {
  const s = await createClient();
  const update = {
    nombre: String(fd.get("nombre") ?? "").trim(),
    matricula: String(fd.get("matricula") ?? "").trim() || null,
    modelo: String(fd.get("modelo") ?? "").trim() || null,
    conductor_usuario_id: String(fd.get("conductor_usuario_id") ?? "").trim() || null,
    notas: String(fd.get("notas") ?? "").trim() || null,
    activa: fd.get("activa") !== "off",
  };
  const { error } = await s.from("furgonetas").update(update).eq("id", id);
  if (error) redirect(`/app/furgonetas?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/app/furgonetas");
  redirect("/app/furgonetas?ok=actualizada");
}

export async function eliminarFurgoneta(id: string) {
  const s = await createClient();
  await s.from("furgonetas").delete().eq("id", id);
  revalidatePath("/app/furgonetas");
  redirect("/app/furgonetas?ok=eliminada");
}

// ================== MOVIMIENTOS ==================
export async function registrarMovimiento(fd: FormData) {
  const s = await createClient();
  const tipo_recurso = String(fd.get("tipo_recurso") ?? ""); // 'pieza' | 'tablero'
  const recurso_id = String(fd.get("recurso_id") ?? "").trim();
  if (!recurso_id) throw new Error("Recurso obligatorio");

  const origen_tipo = String(fd.get("origen_tipo") ?? "sin_ubicar");
  const destino_tipo = String(fd.get("destino_tipo") ?? "almacen");

  const insert: Record<string, unknown> = {
    cantidad: Number(fd.get("cantidad") ?? 1) || 1,
    origen_tipo,
    destino_tipo,
    origen_almacen_id: String(fd.get("origen_almacen_id") ?? "").trim() || null,
    origen_furgoneta_id: String(fd.get("origen_furgoneta_id") ?? "").trim() || null,
    origen_proveedor_id: String(fd.get("origen_proveedor_id") ?? "").trim() || null,
    destino_almacen_id: String(fd.get("destino_almacen_id") ?? "").trim() || null,
    destino_furgoneta_id: String(fd.get("destino_furgoneta_id") ?? "").trim() || null,
    destino_proyecto_id: String(fd.get("destino_proyecto_id") ?? "").trim() || null,
    motivo: String(fd.get("motivo") ?? "").trim() || null,
  };
  if (tipo_recurso === "pieza") insert.pieza_modulo_id = recurso_id;
  if (tipo_recurso === "tablero") insert.tablero_fisico_id = recurso_id;

  const { error } = await s.from("movimientos_stock").insert(insert);
  if (error) redirect(`/app/movimientos?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/app/movimientos");
  revalidatePath("/app/almacenes");
  revalidatePath("/app/furgonetas");
  redirect("/app/movimientos?ok=registrado");
}

// ================== TABLEROS FÍSICOS ==================
export async function crearTableroFisico(fd: FormData) {
  const s = await createClient();
  const cantidad = Math.max(1, Number(fd.get("cantidad") ?? 1) || 1);

  // Si llega proveedor_nuevo (texto), créalo y úsalo.
  let proveedor_id: string | null = String(fd.get("proveedor_id") ?? "").trim() || null;
  const proveedor_nuevo = String(fd.get("proveedor_nuevo") ?? "").trim();
  if (proveedor_nuevo && !proveedor_id) {
    const { data: prov, error: errProv } = await s.from("proveedores").insert({
      nombre: proveedor_nuevo,
      activo: true,
    }).select("id").single();
    if (errProv) redirect(`/app/tableros-fisicos?error=${encodeURIComponent(errProv.message)}`);
    proveedor_id = prov!.id as string;
  }

  const fila = {
    descripcion:   String(fd.get("descripcion") ?? "").trim() || null,
    material_tipo: String(fd.get("material_tipo") ?? "").trim() || null,
    grosor_mm:     Number(fd.get("grosor_mm") ?? 0) || null,
    ancho_mm:      Number(fd.get("ancho_mm") ?? 2440) || 2440,
    alto_mm:       Number(fd.get("alto_mm") ?? 1220) || 1220,
    proveedor_id,
    ubicacion_almacen_id: String(fd.get("almacen_id") ?? "").trim() || null,
    coste_eur:     Number(fd.get("coste_eur") ?? 0) || null,
    notas:         String(fd.get("notas") ?? "").trim() || null,
  };
  const filas = Array.from({ length: cantidad }, () => ({ ...fila }));

  const { error } = await s.from("tableros_fisicos").insert(filas);
  if (error) redirect(`/app/tableros-fisicos?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/app/tableros-fisicos");
  redirect(`/app/tableros-fisicos?ok=creados-${cantidad}`);
}

export async function actualizarTableroFisico(id: string, fd: FormData) {
  const s = await createClient();
  let proveedor_id: string | null = String(fd.get("proveedor_id") ?? "").trim() || null;
  const proveedor_nuevo = String(fd.get("proveedor_nuevo") ?? "").trim();
  if (proveedor_nuevo && !proveedor_id) {
    const { data: prov } = await s.from("proveedores").insert({
      nombre: proveedor_nuevo,
      activo: true,
    }).select("id").single();
    proveedor_id = (prov?.id as string | undefined) ?? null;
  }
  const update: Record<string, unknown> = {
    descripcion:   String(fd.get("descripcion") ?? "").trim() || null,
    material_tipo: String(fd.get("material_tipo") ?? "").trim() || null,
    grosor_mm:     Number(fd.get("grosor_mm") ?? 0) || null,
    ancho_mm:      Number(fd.get("ancho_mm") ?? 0) || null,
    alto_mm:       Number(fd.get("alto_mm") ?? 0) || null,
    proveedor_id,
    coste_eur:     Number(fd.get("coste_eur") ?? 0) || null,
    notas:         String(fd.get("notas") ?? "").trim() || null,
    estado:        String(fd.get("estado") ?? "entero"),
  };
  await s.from("tableros_fisicos").update(update).eq("id", id);
  revalidatePath("/app/tableros-fisicos");
  redirect(`/app/tableros-fisicos?ok=actualizado`);
}

export async function eliminarTableroFisico(id: string) {
  const s = await createClient();
  await s.from("tableros_fisicos").delete().eq("id", id);
  revalidatePath("/app/tableros-fisicos");
  redirect("/app/tableros-fisicos?ok=eliminado");
}
