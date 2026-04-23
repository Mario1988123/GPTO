"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { EstadoPedido } from "@/lib/tipos/pedidos";

const ESTADOS: EstadoPedido[] = ["pendiente", "en_fabricacion", "fabricado", "entregado", "cancelado"];

/**
 * Crea pedido desde un presupuesto aceptado (si no existe ya).
 * Usado por cambiarEstadoPresupuesto cuando pasa a 'aceptado'.
 */
export async function crearPedidoDesdePresupuesto(presupuestoId: string) {
  const s = await createClient();
  const { data: pres } = await s
    .from("presupuestos")
    .select("id, estado, proyecto_id, total_eur")
    .eq("id", presupuestoId)
    .maybeSingle();
  if (!pres) throw new Error("Presupuesto no encontrado.");
  if (pres.estado !== "aceptado") throw new Error("El presupuesto debe estar en estado 'aceptado'.");

  // ¿Ya existe pedido?
  const { data: existe } = await s.from("pedidos").select("id").eq("presupuesto_id", presupuestoId).maybeSingle();
  if (existe) return existe.id;

  const { data: numero } = await s.rpc("get_next_sequence", { p_tipo: "PED" });

  const { data: pedido, error } = await s
    .from("pedidos")
    .insert({
      presupuesto_id: presupuestoId,
      proyecto_id: pres.proyecto_id,
      numero,
      importe_eur: Number(pres.total_eur),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  // Avanzar estado del proyecto a "confirmado"
  await s.from("proyectos").update({ estado: "confirmado" }).eq("id", pres.proyecto_id);

  revalidatePath("/app/pedidos");
  return pedido!.id;
}

export async function cambiarEstadoPedido(pedidoId: string, estado: EstadoPedido) {
  if (!ESTADOS.includes(estado)) throw new Error("Estado inválido.");
  const s = await createClient();

  const { data: ped } = await s.from("pedidos").select("id, proyecto_id").eq("id", pedidoId).maybeSingle();
  if (!ped) redirect(`/app/pedidos?error=${encodeURIComponent("No existe el pedido.")}`);

  const { error } = await s.from("pedidos").update({ estado }).eq("id", pedidoId);
  if (error) redirect(`/app/pedidos/${pedidoId}?error=${encodeURIComponent(error.message)}`);

  // Sincronizar estado del proyecto
  const mapaEstadoProy: Record<EstadoPedido, string | null> = {
    pendiente: "confirmado",
    en_fabricacion: "en_fabricacion",
    fabricado: "en_fabricacion",
    entregado: "entregado",
    cancelado: "cancelado",
  };
  const nuevoEstadoProy = mapaEstadoProy[estado];
  if (nuevoEstadoProy) {
    await s.from("proyectos").update({ estado: nuevoEstadoProy }).eq("id", ped!.proyecto_id);
  }

  revalidatePath(`/app/pedidos/${pedidoId}`);
  revalidatePath("/app/pedidos");
  redirect(`/app/pedidos/${pedidoId}?ok=actualizado`);
}

export async function actualizarPedido(pedidoId: string, fd: FormData) {
  const fechaEntregaStr = String(fd.get("fecha_entrega_prevista") ?? "").trim() || null;
  const notas = String(fd.get("notas") ?? "").trim() || null;

  const s = await createClient();
  const { error } = await s.from("pedidos").update({
    fecha_entrega_prevista: fechaEntregaStr,
    notas,
  }).eq("id", pedidoId);
  if (error) redirect(`/app/pedidos/${pedidoId}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/app/pedidos/${pedidoId}`);
  redirect(`/app/pedidos/${pedidoId}?ok=actualizado`);
}
