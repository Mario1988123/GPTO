"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { longitudCantoMm, type CategoriaLinea, type EstadoPresupuesto, type UnidadLinea } from "@/lib/tipos/presupuestos";

const ESTADOS: EstadoPresupuesto[] = ["borrador", "enviado", "aceptado", "rechazado", "caducado"];
const CATS: CategoriaLinea[] = ["tableros", "cantos", "herrajes", "mano_obra", "otro"];
const UDS: UnidadLinea[] = ["ud", "m2", "ml", "h", "global"];

type LineaNueva = {
  orden: number;
  categoria: CategoriaLinea;
  descripcion: string;
  cantidad: number;
  unidad: UnidadLinea;
  precio_unitario_eur: number;
};

/**
 * Calcula las líneas del presupuesto a partir del estado actual del proyecto
 * (tableros, piezas, módulos, herrajes). No toca BD; devuelve las líneas.
 */
async function calcularLineas(proyectoId: string): Promise<LineaNueva[]> {
  const s = await createClient();
  const lineas: LineaNueva[] = [];
  let orden = 0;

  // Precio/hora mano de obra desde config_empresa (default 25)
  const { data: emp } = await s.from("empresas").select("config_empresa").limit(1).maybeSingle<{ config_empresa: Record<string, number> }>();
  const precioHora = Number(emp?.config_empresa?.precio_hora_mano_obra_eur ?? 25);

  // ---------- 1. TABLEROS (agrupados por referencia) ----------
  const { data: tableros } = await s
    .from("tableros_corte")
    .select("ancho_mm, alto_mm, referencias_tablero(precio_m2, grosor_mm, materiales(nombre), acabados(nombre))")
    .eq("proyecto_id", proyectoId);

  type TabRow = {
    ancho_mm: number;
    alto_mm: number;
    referencias_tablero: {
      precio_m2: number;
      grosor_mm: number;
      materiales: { nombre: string } | null;
      acabados: { nombre: string } | null;
    } | null;
  };

  // Agrupar tableros por referencia
  const mapTab = new Map<string, { count: number; precio: number; label: string }>();
  for (const t of (tableros ?? []) as unknown as TabRow[]) {
    if (!t.referencias_tablero) continue;
    const refKey = `${t.referencias_tablero.materiales?.nombre} / ${t.referencias_tablero.acabados?.nombre} / ${t.referencias_tablero.grosor_mm}mm`;
    const prev = mapTab.get(refKey) ?? { count: 0, precio: Number(t.referencias_tablero.precio_m2), label: refKey };
    prev.count += 1;
    mapTab.set(refKey, prev);
  }
  // Añadir una línea por cada referencia: cantidad = nº tableros, unidad = ud (aunque precio es por m²; usamos área total por tablero útil)
  // Para simplicidad: área útil del tablero = 2.4m × 1.2m = 2.88 m² (configurable)
  const { data: cfgEmp } = await s.from("empresas").select("config_empresa").limit(1).maybeSingle<{ config_empresa: Record<string, number> }>();
  const areaUtilM2 =
    (Number(cfgEmp?.config_empresa?.tablero_util_ancho_cm ?? 240) / 100) *
    (Number(cfgEmp?.config_empresa?.tablero_util_alto_cm ?? 120) / 100);

  for (const [label, v] of mapTab.entries()) {
    lineas.push({
      orden: orden++,
      categoria: "tableros",
      descripcion: `Tableros ${label}`,
      cantidad: v.count * areaUtilM2,
      unidad: "m2",
      precio_unitario_eur: v.precio,
    });
  }

  // ---------- 2. CANTOS ----------
  const { data: piezas } = await s
    .from("piezas_modulo")
    .select("cantidad, largo_mm, ancho_mm, lados_con_canto, canto_id, cantos(nombre, precio_ml), modulos_armario!inner(armarios!inner(proyecto_id))")
    .eq("modulos_armario.armarios.proyecto_id", proyectoId)
    .not("canto_id", "is", null);

  type PzaCanto = {
    cantidad: number;
    largo_mm: number;
    ancho_mm: number;
    lados_con_canto: string;
    canto_id: string;
    cantos: { nombre: string; precio_ml: number } | null;
  };

  // Agrupar por canto_id (sumar longitudes)
  const mapCantos = new Map<string, { nombre: string; precio: number; longitud_mm: number }>();
  for (const p of (piezas ?? []) as unknown as PzaCanto[]) {
    if (!p.canto_id || !p.cantos) continue;
    const longPorUnidad = longitudCantoMm(p.lados_con_canto, p.largo_mm, p.ancho_mm);
    const longTotal = longPorUnidad * p.cantidad;
    const prev = mapCantos.get(p.canto_id) ?? { nombre: p.cantos.nombre, precio: Number(p.cantos.precio_ml), longitud_mm: 0 };
    prev.longitud_mm += longTotal;
    mapCantos.set(p.canto_id, prev);
  }
  for (const [, v] of mapCantos.entries()) {
    lineas.push({
      orden: orden++,
      categoria: "cantos",
      descripcion: `Canto ${v.nombre}`,
      cantidad: Number((v.longitud_mm / 1000).toFixed(2)),
      unidad: "ml",
      precio_unitario_eur: v.precio,
    });
  }

  // ---------- 3. HERRAJES ----------
  const { data: modulos } = await s
    .from("modulos_armario")
    .select("id, particiones_verticales, tipo_modulo_id, armarios!inner(proyecto_id)")
    .eq("armarios.proyecto_id", proyectoId);

  type ModRow = { id: string; particiones_verticales: number; tipo_modulo_id: string };
  const mods = (modulos ?? []) as unknown as ModRow[];
  // Para cada tipo_modulo usado, sumar tipo_modulo_herrajes × nº modulos × particiones
  const herrajesMap = new Map<string, { nombre: string; precio: number; cantidad: number }>();
  for (const m of mods) {
    const { data: hrs } = await s
      .from("tipo_modulo_herrajes")
      .select("cantidad, herrajes(id, nombre, precio_unidad)")
      .eq("tipo_modulo_id", m.tipo_modulo_id);
    for (const h of (hrs ?? []) as unknown as { cantidad: number; herrajes: { id: string; nombre: string; precio_unidad: number } | null }[]) {
      if (!h.herrajes) continue;
      const total = h.cantidad * m.particiones_verticales;
      const prev = herrajesMap.get(h.herrajes.id) ?? { nombre: h.herrajes.nombre, precio: Number(h.herrajes.precio_unidad), cantidad: 0 };
      prev.cantidad += total;
      herrajesMap.set(h.herrajes.id, prev);
    }
  }
  for (const [, v] of herrajesMap.entries()) {
    lineas.push({
      orden: orden++,
      categoria: "herrajes",
      descripcion: v.nombre,
      cantidad: v.cantidad,
      unidad: "ud",
      precio_unitario_eur: v.precio,
    });
  }

  // ---------- 4. MANO DE OBRA ----------
  const { data: modsMO } = await s
    .from("modulos_armario")
    .select("particiones_verticales, tipos_modulo(horas_fabricacion_default, nombre), armarios!inner(proyecto_id)")
    .eq("armarios.proyecto_id", proyectoId);

  let horasTotales = 0;
  for (const m of (modsMO ?? []) as unknown as { particiones_verticales: number; tipos_modulo: { horas_fabricacion_default: number } | null }[]) {
    const h = Number(m.tipos_modulo?.horas_fabricacion_default ?? 1);
    horasTotales += h * m.particiones_verticales;
  }
  if (horasTotales > 0) {
    lineas.push({
      orden: orden++,
      categoria: "mano_obra",
      descripcion: `Mano de obra fabricación`,
      cantidad: Number(horasTotales.toFixed(2)),
      unidad: "h",
      precio_unitario_eur: precioHora,
    });
  }

  return lineas;
}

function calcularTotales(
  lineas: { cantidad: number; precio_unitario_eur: number; descuento_linea_pct: number }[],
  descuento_global_pct: number,
  iva_pct: number,
) {
  const subtotal = lineas.reduce((acc, l) => {
    const bruto = l.cantidad * l.precio_unitario_eur;
    const neto = bruto * (1 - l.descuento_linea_pct / 100);
    return acc + neto;
  }, 0);
  const descuentoEur = subtotal * (descuento_global_pct / 100);
  const base = subtotal - descuentoEur;
  const iva = base * (iva_pct / 100);
  const total = base + iva;
  return {
    subtotal_eur: Number(subtotal.toFixed(2)),
    descuento_eur: Number(descuentoEur.toFixed(2)),
    base_imponible_eur: Number(base.toFixed(2)),
    iva_eur: Number(iva.toFixed(2)),
    total_eur: Number(total.toFixed(2)),
  };
}

export async function crearBorrador(proyectoId: string) {
  const s = await createClient();
  // Crear presupuesto vacío en borrador
  const { data: ins, error } = await s
    .from("presupuestos")
    .insert({ proyecto_id: proyectoId })
    .select("id")
    .single();
  if (error) redirect(`/app/proyectos/${proyectoId}?error=${encodeURIComponent(error.message)}`);
  const presupuestoId = ins!.id;

  // Calcular líneas desde el estado actual
  const lineas = await calcularLineas(proyectoId);
  if (lineas.length > 0) {
    const rows = lineas.map((l) => ({
      presupuesto_id: presupuestoId,
      orden: l.orden,
      categoria: l.categoria,
      descripcion: l.descripcion,
      cantidad: l.cantidad,
      unidad: l.unidad,
      precio_unitario_eur: l.precio_unitario_eur,
      descuento_linea_pct: 0,
      total_linea_eur: Number((l.cantidad * l.precio_unitario_eur).toFixed(2)),
    }));
    const { error: lErr } = await s.from("presupuestos_lineas").insert(rows);
    if (lErr) redirect(`/app/presupuestos/${presupuestoId}?error=${encodeURIComponent(lErr.message)}`);
  }

  // Totales
  const totales = calcularTotales(lineas.map((l) => ({ cantidad: l.cantidad, precio_unitario_eur: l.precio_unitario_eur, descuento_linea_pct: 0 })), 0, 21);
  await s.from("presupuestos").update(totales).eq("id", presupuestoId);

  revalidatePath("/app/presupuestos");
  revalidatePath(`/app/proyectos/${proyectoId}`);
  redirect(`/app/presupuestos/${presupuestoId}?ok=creado`);
}

export async function regenerarLineas(presupuestoId: string) {
  const s = await createClient();
  const { data: pres } = await s.from("presupuestos").select("id, proyecto_id, estado, descuento_global_pct, iva_pct").eq("id", presupuestoId).maybeSingle();
  if (!pres) redirect(`/app/presupuestos?error=${encodeURIComponent("No existe el presupuesto.")}`);
  if (pres!.estado !== "borrador") redirect(`/app/presupuestos/${presupuestoId}?error=${encodeURIComponent("Solo se pueden regenerar borradores.")}`);

  // Borrar líneas existentes y volver a calcular
  await s.from("presupuestos_lineas").delete().eq("presupuesto_id", presupuestoId);
  const lineas = await calcularLineas(pres!.proyecto_id);
  if (lineas.length > 0) {
    const rows = lineas.map((l) => ({
      presupuesto_id: presupuestoId,
      orden: l.orden,
      categoria: l.categoria,
      descripcion: l.descripcion,
      cantidad: l.cantidad,
      unidad: l.unidad,
      precio_unitario_eur: l.precio_unitario_eur,
      descuento_linea_pct: 0,
      total_linea_eur: Number((l.cantidad * l.precio_unitario_eur).toFixed(2)),
    }));
    await s.from("presupuestos_lineas").insert(rows);
  }
  const totales = calcularTotales(lineas.map((l) => ({ cantidad: l.cantidad, precio_unitario_eur: l.precio_unitario_eur, descuento_linea_pct: 0 })), Number(pres!.descuento_global_pct), Number(pres!.iva_pct));
  await s.from("presupuestos").update(totales).eq("id", presupuestoId);

  revalidatePath(`/app/presupuestos/${presupuestoId}`);
  redirect(`/app/presupuestos/${presupuestoId}?ok=actualizado`);
}

export async function actualizarLinea(presupuestoId: string, lineaId: string, fd: FormData) {
  const s = await createClient();
  const cantidad = Number.parseFloat(String(fd.get("cantidad") ?? "0"));
  const precio = Number.parseFloat(String(fd.get("precio_unitario_eur") ?? "0"));
  const descLinea = Number.parseFloat(String(fd.get("descuento_linea_pct") ?? "0"));
  const descripcion = String(fd.get("descripcion") ?? "").trim();
  if (!descripcion) throw new Error("Descripción obligatoria.");
  if (!Number.isFinite(cantidad) || cantidad < 0) throw new Error("Cantidad inválida.");
  if (!Number.isFinite(precio) || precio < 0) throw new Error("Precio inválido.");
  const total = Number((cantidad * precio * (1 - descLinea / 100)).toFixed(2));

  const { error } = await s
    .from("presupuestos_lineas")
    .update({ descripcion, cantidad, precio_unitario_eur: precio, descuento_linea_pct: descLinea, total_linea_eur: total })
    .eq("id", lineaId);
  if (error) redirect(`/app/presupuestos/${presupuestoId}?error=${encodeURIComponent(error.message)}`);

  await recalcularTotales(presupuestoId);
  revalidatePath(`/app/presupuestos/${presupuestoId}`);
  redirect(`/app/presupuestos/${presupuestoId}?ok=actualizado`);
}

export async function eliminarLinea(presupuestoId: string, lineaId: string) {
  const s = await createClient();
  const { error } = await s.from("presupuestos_lineas").delete().eq("id", lineaId);
  if (error) redirect(`/app/presupuestos/${presupuestoId}?error=${encodeURIComponent(error.message)}`);
  await recalcularTotales(presupuestoId);
  revalidatePath(`/app/presupuestos/${presupuestoId}`);
  redirect(`/app/presupuestos/${presupuestoId}?ok=eliminado`);
}

export async function crearLineaCustom(presupuestoId: string, fd: FormData) {
  const s = await createClient();
  const categoria = String(fd.get("categoria") ?? "otro") as CategoriaLinea;
  const unidad = String(fd.get("unidad") ?? "ud") as UnidadLinea;
  if (!CATS.includes(categoria)) throw new Error("Categoría inválida.");
  if (!UDS.includes(unidad)) throw new Error("Unidad inválida.");
  const descripcion = String(fd.get("descripcion") ?? "").trim();
  const cantidad = Number.parseFloat(String(fd.get("cantidad") ?? "0"));
  const precio = Number.parseFloat(String(fd.get("precio_unitario_eur") ?? "0"));
  if (!descripcion) throw new Error("Descripción obligatoria.");
  if (!Number.isFinite(cantidad) || cantidad < 0) throw new Error("Cantidad inválida.");
  if (!Number.isFinite(precio) || precio < 0) throw new Error("Precio inválido.");

  const { data: maxO } = await s
    .from("presupuestos_lineas")
    .select("orden")
    .eq("presupuesto_id", presupuestoId)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();
  const orden = ((maxO?.orden ?? -1) as number) + 1;

  await s.from("presupuestos_lineas").insert({
    presupuesto_id: presupuestoId,
    orden,
    categoria,
    descripcion,
    cantidad,
    unidad,
    precio_unitario_eur: precio,
    descuento_linea_pct: 0,
    total_linea_eur: Number((cantidad * precio).toFixed(2)),
  });
  await recalcularTotales(presupuestoId);
  revalidatePath(`/app/presupuestos/${presupuestoId}`);
  redirect(`/app/presupuestos/${presupuestoId}?ok=creado`);
}

export async function actualizarMetadatos(presupuestoId: string, fd: FormData) {
  const s = await createClient();
  const validez = Number.parseInt(String(fd.get("validez_dias") ?? "30"), 10);
  const modo = String(fd.get("modo_presentacion") ?? "detallado_modulo");
  const descuentoGlobal = Number.parseFloat(String(fd.get("descuento_global_pct") ?? "0"));
  const ivaPct = Number.parseFloat(String(fd.get("iva_pct") ?? "21"));
  const notas = String(fd.get("notas") ?? "").trim() || null;

  const { error } = await s.from("presupuestos").update({
    validez_dias: validez,
    modo_presentacion: modo,
    descuento_global_pct: descuentoGlobal,
    iva_pct: ivaPct,
    notas,
  }).eq("id", presupuestoId);
  if (error) redirect(`/app/presupuestos/${presupuestoId}?error=${encodeURIComponent(error.message)}`);
  await recalcularTotales(presupuestoId);
  revalidatePath(`/app/presupuestos/${presupuestoId}`);
  redirect(`/app/presupuestos/${presupuestoId}?ok=actualizado`);
}

async function recalcularTotales(presupuestoId: string) {
  const s = await createClient();
  const { data: pres } = await s.from("presupuestos").select("descuento_global_pct, iva_pct").eq("id", presupuestoId).maybeSingle();
  const { data: lineas } = await s.from("presupuestos_lineas").select("cantidad, precio_unitario_eur, descuento_linea_pct").eq("presupuesto_id", presupuestoId);
  const totales = calcularTotales((lineas ?? []).map((l) => ({ cantidad: Number(l.cantidad), precio_unitario_eur: Number(l.precio_unitario_eur), descuento_linea_pct: Number(l.descuento_linea_pct) })), Number(pres?.descuento_global_pct ?? 0), Number(pres?.iva_pct ?? 21));
  await s.from("presupuestos").update(totales).eq("id", presupuestoId);
}

export async function emitirPresupuesto(presupuestoId: string) {
  const s = await createClient();
  const { data: pres } = await s.from("presupuestos").select("id, estado, proyecto_id").eq("id", presupuestoId).maybeSingle();
  if (!pres || pres.estado !== "borrador") {
    redirect(`/app/presupuestos/${presupuestoId}?error=${encodeURIComponent("Solo se emiten presupuestos en borrador.")}`);
  }

  // Obtener numero
  const { data: numero, error: numErr } = await s.rpc("get_next_sequence", { p_tipo: "PRES" });
  if (numErr) redirect(`/app/presupuestos/${presupuestoId}?error=${encodeURIComponent(numErr.message)}`);

  // Snapshot: datos proyecto + cliente + resumen presupuesto
  const { data: snap } = await s.from("proyectos").select("*, clientes(nombre, email, telefono, nif, direccion)").eq("id", pres!.proyecto_id).maybeSingle();
  const { data: lineas } = await s.from("presupuestos_lineas").select("*").eq("presupuesto_id", presupuestoId).order("orden");

  const snapshot = { proyecto: snap, lineas };

  const { error } = await s.from("presupuestos").update({
    estado: "enviado",
    numero,
    fecha_emision: new Date().toISOString().slice(0, 10),
    snapshot,
  }).eq("id", presupuestoId);
  if (error) redirect(`/app/presupuestos/${presupuestoId}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/app/presupuestos/${presupuestoId}`);
  revalidatePath("/app/presupuestos");
  redirect(`/app/presupuestos/${presupuestoId}?ok=actualizado`);
}

export async function cambiarEstadoPresupuesto(presupuestoId: string, estado: EstadoPresupuesto) {
  if (!ESTADOS.includes(estado)) throw new Error("Estado inválido.");
  const s = await createClient();
  const { error } = await s.from("presupuestos").update({ estado }).eq("id", presupuestoId);
  if (error) redirect(`/app/presupuestos/${presupuestoId}?error=${encodeURIComponent(error.message)}`);

  // Si pasa a aceptado → crear pedido automáticamente.
  if (estado === "aceptado") {
    try {
      const { crearPedidoDesdePresupuesto } = await import("../pedidos/actions");
      await crearPedidoDesdePresupuesto(presupuestoId);
    } catch (e) {
      // Si falla la creación del pedido, ya hemos cambiado el estado. Lo reportamos.
      const msg = e instanceof Error ? e.message : "Error creando pedido";
      redirect(`/app/presupuestos/${presupuestoId}?error=${encodeURIComponent("Presupuesto aceptado pero fallo pedido: " + msg)}`);
    }
  }

  revalidatePath(`/app/presupuestos/${presupuestoId}`);
  revalidatePath("/app/presupuestos");
  revalidatePath("/app/pedidos");
  redirect(`/app/presupuestos/${presupuestoId}?ok=actualizado`);
}

export async function eliminarPresupuesto(presupuestoId: string) {
  const s = await createClient();
  const { data: pres } = await s.from("presupuestos").select("estado, proyecto_id").eq("id", presupuestoId).maybeSingle();
  if (!pres) redirect(`/app/presupuestos?error=${encodeURIComponent("No existe.")}`);
  if (pres!.estado !== "borrador") {
    redirect(`/app/presupuestos/${presupuestoId}?error=${encodeURIComponent("Solo admins pueden borrar emitidos (no MVP).")}`);
  }
  await s.from("presupuestos").delete().eq("id", presupuestoId);
  revalidatePath("/app/presupuestos");
  redirect(`/app/presupuestos?ok=eliminado`);
}
