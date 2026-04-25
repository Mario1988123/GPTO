"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const TIPOS = [
  "mal_cortada","tocada","rayada","falta","grosor_incorrecto","veta_incorrecta","canto_defectuoso","otro",
] as const;
type TipoInc = typeof TIPOS[number];

export async function confirmarRecepcionEntrega(proyectoId: string, pedidoId: string, entregaId: string) {
  const s = await createClient();
  const fecha = new Date().toISOString().slice(0, 10);
  await s.from("pedido_corte_entregas").update({
    estado: "recibida",
    fecha_entregada: fecha,
  }).eq("id", entregaId);
  // Marcar las piezas asignadas como confirmadas y registrar movimiento de stock
  // proveedor → almacén (se decide en el form de la entrega).
  revalidatePath(`/app/proyectos/${proyectoId}/pedido-corte/${pedidoId}`);
  redirect(`/app/proyectos/${proyectoId}/pedido-corte/${pedidoId}?ok=recibida`);
}

export async function registrarIncidenciaPieza(
  proyectoId: string,
  pedidoId: string,
  fd: FormData,
) {
  const s = await createClient();
  const pieza_modulo_id = String(fd.get("pieza_modulo_id") ?? "").trim();
  if (!pieza_modulo_id) throw new Error("Pieza obligatoria");
  const tipo = String(fd.get("tipo") ?? "otro") as TipoInc;
  if (!TIPOS.includes(tipo)) throw new Error("Tipo inválido");
  const { error } = await s.from("incidencias_piezas_recibidas").insert({
    pieza_modulo_id,
    ocurrencia: Number(fd.get("ocurrencia") ?? 1) || 1,
    tipo,
    descripcion: String(fd.get("descripcion") ?? "").trim() || null,
    requiere_repeticion: fd.get("requiere_repeticion") !== "off",
    foto_url: String(fd.get("foto_url") ?? "").trim() || null,
  });
  if (error) redirect(`/app/proyectos/${proyectoId}/pedido-corte/${pedidoId}/recepcion?error=${encodeURIComponent(error.message)}`);

  // También marcar la asignación de la entrega con flag con_incidencia
  await s.from("pedido_corte_entrega_piezas")
    .update({ con_incidencia: true })
    .eq("pieza_modulo_id", pieza_modulo_id);

  revalidatePath(`/app/proyectos/${proyectoId}/pedido-corte/${pedidoId}/recepcion`);
  redirect(`/app/proyectos/${proyectoId}/pedido-corte/${pedidoId}/recepcion?ok=incidencia`);
}

export async function resolverIncidencia(proyectoId: string, pedidoId: string, id: string) {
  const s = await createClient();
  await s.from("incidencias_piezas_recibidas").update({
    resuelto: true,
    resuelto_at: new Date().toISOString(),
  }).eq("id", id);
  revalidatePath(`/app/proyectos/${proyectoId}/pedido-corte/${pedidoId}/recepcion`);
  redirect(`/app/proyectos/${proyectoId}/pedido-corte/${pedidoId}/recepcion?ok=resuelta`);
}

export async function eliminarIncidencia(proyectoId: string, pedidoId: string, id: string) {
  const s = await createClient();
  await s.from("incidencias_piezas_recibidas").delete().eq("id", id);
  revalidatePath(`/app/proyectos/${proyectoId}/pedido-corte/${pedidoId}/recepcion`);
  redirect(`/app/proyectos/${proyectoId}/pedido-corte/${pedidoId}/recepcion?ok=eliminada`);
}

export async function confirmarPiezaRecibida(
  proyectoId: string,
  pedidoId: string,
  pieza_modulo_id: string,
  ocurrencia: number,
  destino_almacen_id: string | null,
  destino_furgoneta_id: string | null,
) {
  const s = await createClient();
  // Actualizar la asignación
  await s.from("pedido_corte_entrega_piezas")
    .update({ confirmada: true })
    .eq("pieza_modulo_id", pieza_modulo_id)
    .eq("ocurrencia", ocurrencia);

  // Registrar movimiento proveedor → destino
  const destino_tipo = destino_furgoneta_id ? "furgoneta" : "almacen";
  await s.from("movimientos_stock").insert({
    pieza_modulo_id,
    ocurrencia,
    cantidad: 1,
    origen_tipo: "proveedor",
    destino_tipo,
    destino_almacen_id,
    destino_furgoneta_id,
    motivo: "Recepción pedido de corte",
  });

  revalidatePath(`/app/proyectos/${proyectoId}/pedido-corte/${pedidoId}/recepcion`);
  redirect(`/app/proyectos/${proyectoId}/pedido-corte/${pedidoId}/recepcion?ok=pieza-confirmada`);
}
