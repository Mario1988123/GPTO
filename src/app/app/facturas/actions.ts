"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calcularLinea, calcularTotales, type DatosFiscales } from "@/lib/tipos/facturas";

const BASE = "/app/facturas";

function dateAdd(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function getDatosFiscales(supabase: Awaited<ReturnType<typeof createClient>>): Promise<DatosFiscales> {
  const { data } = await supabase.from("empresas").select("nombre, config_empresa").limit(1).maybeSingle();
  const cfg = (data?.config_empresa ?? {}) as { datos_fiscales?: DatosFiscales };
  if (cfg.datos_fiscales?.razon_social) return cfg.datos_fiscales;
  return {
    razon_social: data?.nombre ?? "(Sin razón social)",
    nif: "(Sin NIF)",
    domicilio_fiscal: "(Sin domicilio)",
  };
}

export async function crearSerie(fd: FormData) {
  const s = await createClient();
  const codigo = String(fd.get("codigo") ?? "").trim();
  const nombre = String(fd.get("nombre") ?? "").trim();
  if (!codigo || !nombre) throw new Error("Código y nombre obligatorios");
  const { error } = await s.from("series_facturacion").insert({
    codigo,
    nombre,
    prefijo: String(fd.get("prefijo") ?? "").trim(),
    siguiente_num: Number(fd.get("siguiente_num") ?? 1) || 1,
    es_rectificativa: fd.get("es_rectificativa") === "on",
  });
  if (error) redirect(`${BASE}/series?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`${BASE}/series`);
  redirect(`${BASE}/series?ok=creada`);
}

export async function crearFacturaDesdePresupuesto(presupuestoId: string) {
  const s = await createClient();
  const { data: p } = await s
    .from("presupuestos")
    .select("id, proyecto_id, cliente_id, base, iva, total, lineas:presupuesto_lineas(*)")
    .eq("id", presupuestoId)
    .maybeSingle();
  if (!p) throw new Error("Presupuesto no encontrado");

  const { data: serie } = await s
    .from("series_facturacion")
    .select("id")
    .eq("activo", true)
    .eq("es_rectificativa", false)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!serie) redirect(`${BASE}?error=${encodeURIComponent("Crea primero una serie de facturación en /app/facturas/series")}`);

  const { data: cli } = await s.from("clientes").select("*").eq("id", p.cliente_id).maybeSingle();
  if (!cli) throw new Error("Cliente no encontrado");

  const emisor = await getDatosFiscales(s);
  const receptor = {
    razon_social: cli.es_empresa
      ? cli.nombre
      : [cli.nombre, cli.apellido1, cli.apellido2].filter(Boolean).join(" "),
    nif: cli.nif ?? null,
    domicilio: typeof cli.direccion === "object" && cli.direccion
      ? Object.values(cli.direccion).filter(Boolean).join(", ")
      : "",
    es_empresa: cli.es_empresa,
  };

  const fecha = new Date().toISOString().slice(0, 10);
  const { data: f, error } = await s.from("facturas").insert({
    serie_id: serie!.id,
    numero: 0,
    numero_completo: "BORRADOR",
    cliente_id: p.cliente_id,
    proyecto_id: p.proyecto_id,
    presupuesto_id: p.id,
    tipo: "completa",
    fecha_emision: fecha,
    fecha_vencimiento: dateAdd(fecha, 30),
    emisor,
    receptor,
  }).select("id").single();
  if (error) redirect(`${BASE}?error=${encodeURIComponent(error.message)}`);

  const lineas = (p.lineas as Array<Record<string, unknown>> | null) ?? [];
  if (lineas.length > 0) {
    const filas = lineas.map((l, i) => {
      const lin = {
        cantidad: Number(l.cantidad ?? 1),
        precio_unitario: Number(l.precio_unitario_eur ?? l.precio_unitario ?? 0),
        descuento_pct: Number(l.descuento_pct ?? 0),
        iva_pct: 21,
      };
      const calc = calcularLinea(lin);
      return {
        factura_id: f!.id,
        orden: i,
        descripcion: String(l.descripcion ?? "Línea"),
        ...lin,
        ...calc,
      };
    });
    await s.from("factura_lineas").insert(filas);

    const totales = calcularTotales(filas, 0, 0);
    await s.from("facturas").update(totales).eq("id", f!.id);
  }

  revalidatePath(BASE);
  redirect(`${BASE}/${f!.id}`);
}

export async function crearFacturaVacia(clienteId: string) {
  const s = await createClient();
  const { data: serie } = await s
    .from("series_facturacion")
    .select("id")
    .eq("activo", true)
    .eq("es_rectificativa", false)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!serie) redirect(`${BASE}?error=${encodeURIComponent("Crea primero una serie de facturación")}`);

  const { data: cli } = await s.from("clientes").select("*").eq("id", clienteId).maybeSingle();
  if (!cli) throw new Error("Cliente no encontrado");

  const emisor = await getDatosFiscales(s);
  const receptor = {
    razon_social: cli.es_empresa ? cli.nombre : [cli.nombre, cli.apellido1, cli.apellido2].filter(Boolean).join(" "),
    nif: cli.nif ?? null,
    domicilio: typeof cli.direccion === "object" && cli.direccion ? Object.values(cli.direccion).filter(Boolean).join(", ") : "",
    es_empresa: cli.es_empresa,
  };

  const fecha = new Date().toISOString().slice(0, 10);
  const { data: f, error } = await s.from("facturas").insert({
    serie_id: serie!.id,
    numero: 0,
    numero_completo: "BORRADOR",
    cliente_id: clienteId,
    tipo: "completa",
    fecha_emision: fecha,
    fecha_vencimiento: dateAdd(fecha, 30),
    emisor,
    receptor,
  }).select("id").single();
  if (error) redirect(`${BASE}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE);
  redirect(`${BASE}/${f!.id}`);
}

export async function actualizarFactura(id: string, fd: FormData) {
  const s = await createClient();
  const update: Record<string, unknown> = {
    fecha_emision: String(fd.get("fecha_emision") ?? "").trim() || null,
    fecha_operacion: String(fd.get("fecha_operacion") ?? "").trim() || null,
    forma_pago: String(fd.get("forma_pago") ?? "transferencia"),
    vencimiento_dias: Number(fd.get("vencimiento_dias") ?? 30),
    fecha_vencimiento: String(fd.get("fecha_vencimiento") ?? "").trim() || null,
    iban: String(fd.get("iban") ?? "").trim() || null,
    retencion_irpf_pct: Number(fd.get("retencion_irpf_pct") ?? 0),
    recargo_eq_pct: Number(fd.get("recargo_eq_pct") ?? 0),
    motivo_rectificacion: String(fd.get("motivo_rectificacion") ?? "").trim() || null,
    notas: String(fd.get("notas") ?? "").trim() || null,
  };
  const { error } = await s.from("facturas").update(update).eq("id", id);
  if (error) redirect(`${BASE}/${id}?error=${encodeURIComponent(error.message)}`);
  await recalcularTotales(id);
  revalidatePath(`${BASE}/${id}`);
  redirect(`${BASE}/${id}?ok=actualizada`);
}

export async function añadirLinea(facturaId: string, fd: FormData) {
  const s = await createClient();
  const { count } = await s.from("factura_lineas").select("id", { count: "exact", head: true }).eq("factura_id", facturaId);
  const orden = count ?? 0;
  const lin = {
    descripcion: String(fd.get("descripcion") ?? "").trim() || "Línea",
    cantidad: Number(fd.get("cantidad") ?? 1) || 1,
    precio_unitario: Number(fd.get("precio_unitario") ?? 0) || 0,
    descuento_pct: Number(fd.get("descuento_pct") ?? 0) || 0,
    iva_pct: Number(fd.get("iva_pct") ?? 21),
  };
  const calc = calcularLinea(lin);
  const { error } = await s.from("factura_lineas").insert({ factura_id: facturaId, orden, ...lin, ...calc });
  if (error) redirect(`${BASE}/${facturaId}?error=${encodeURIComponent(error.message)}`);
  await recalcularTotales(facturaId);
  revalidatePath(`${BASE}/${facturaId}`);
  redirect(`${BASE}/${facturaId}?ok=linea`);
}

export async function eliminarLinea(facturaId: string, lineaId: string) {
  const s = await createClient();
  await s.from("factura_lineas").delete().eq("id", lineaId);
  await recalcularTotales(facturaId);
  revalidatePath(`${BASE}/${facturaId}`);
  redirect(`${BASE}/${facturaId}?ok=eliminada`);
}

async function recalcularTotales(facturaId: string) {
  const s = await createClient();
  const { data: lineas } = await s.from("factura_lineas").select("base_linea, cuota_iva_linea").eq("factura_id", facturaId);
  const { data: f } = await s.from("facturas").select("retencion_irpf_pct, recargo_eq_pct").eq("id", facturaId).maybeSingle();
  const totales = calcularTotales(lineas ?? [], Number(f?.retencion_irpf_pct ?? 0), Number(f?.recargo_eq_pct ?? 0));
  await s.from("facturas").update(totales).eq("id", facturaId);
}

export async function emitirFactura(id: string) {
  const s = await createClient();
  const { data, error } = await s.rpc("emitir_factura", { p_factura_id: id });
  if (error) redirect(`${BASE}/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE);
  revalidatePath(`${BASE}/${id}`);
  redirect(`${BASE}/${id}?ok=emitida-${encodeURIComponent(String(data))}`);
}

export async function marcarPagada(id: string, pagada: boolean) {
  const s = await createClient();
  const update: Record<string, unknown> = pagada
    ? { pagada: true, fecha_pago: new Date().toISOString().slice(0, 10), estado: "pagada" }
    : { pagada: false, fecha_pago: null, estado: "emitida" };
  const { error } = await s.from("facturas").update(update).eq("id", id);
  if (error) redirect(`${BASE}/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE);
  revalidatePath(`${BASE}/${id}`);
  redirect(`${BASE}/${id}?ok=${pagada ? "pagada" : "no-pagada"}`);
}

export async function eliminarFacturaBorrador(id: string) {
  const s = await createClient();
  const { error } = await s.from("facturas").delete().eq("id", id).eq("estado", "borrador");
  if (error) redirect(`${BASE}/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE);
  redirect(`${BASE}?ok=eliminada`);
}

export async function crearRectificativa(facturaOriginalId: string, motivo: string) {
  const s = await createClient();
  const { data: orig } = await s.from("facturas").select("*").eq("id", facturaOriginalId).maybeSingle();
  if (!orig) throw new Error("Factura original no encontrada");

  const { data: serieRect } = await s.from("series_facturacion").select("id").eq("es_rectificativa", true).eq("activo", true).limit(1).maybeSingle();
  if (!serieRect) redirect(`${BASE}?error=${encodeURIComponent("Crea una serie 'rectificativa' primero")}`);

  const { data: f, error } = await s.from("facturas").insert({
    serie_id: serieRect!.id,
    numero: 0,
    numero_completo: "BORRADOR",
    cliente_id: orig.cliente_id,
    proyecto_id: orig.proyecto_id,
    presupuesto_id: orig.presupuesto_id,
    tipo: "rectificativa",
    factura_rectificada_id: facturaOriginalId,
    motivo_rectificacion: motivo,
    fecha_emision: new Date().toISOString().slice(0, 10),
    emisor: orig.emisor,
    receptor: orig.receptor,
  }).select("id").single();
  if (error) redirect(`${BASE}/${facturaOriginalId}?error=${encodeURIComponent(error.message)}`);

  // Marcar la original como rectificada
  await s.from("facturas").update({ estado: "rectificada" }).eq("id", facturaOriginalId);
  revalidatePath(BASE);
  redirect(`${BASE}/${f!.id}`);
}
