"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ESTADOS = ["borrador", "enviado", "confirmado", "en_produccion", "entregado", "cancelado"] as const;
type EstadoPedidoCorte = typeof ESTADOS[number];

function str(fd: FormData, k: string): string | null {
  const v = String(fd.get(k) ?? "").trim();
  return v || null;
}
function dateOrNull(fd: FormData, k: string): string | null {
  const v = String(fd.get(k) ?? "").trim();
  return v || null;
}
function num(fd: FormData, k: string): number | null {
  const v = String(fd.get(k) ?? "").trim();
  if (!v) return null;
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

export async function crearPedidoCorteParaProyecto(proyectoId: string) {
  const s = await createClient();

  // ¿Hay tableros_corte para este proyecto?
  const { count } = await s
    .from("tableros_corte")
    .select("id", { count: "exact", head: true })
    .eq("proyecto_id", proyectoId);
  if ((count ?? 0) === 0) {
    redirect(`/app/proyectos/${proyectoId}?error=${encodeURIComponent("No hay nesting ejecutado todavía. Corre el nesting antes de pedir el corte.")}`);
  }

  const { data, error } = await s
    .from("pedidos_tableros_corte")
    .insert({
      proyecto_id: proyectoId,
      estado: "borrador",
      fecha_pedido: new Date().toISOString().slice(0, 10),
    })
    .select("id")
    .single();
  if (error) redirect(`/app/proyectos/${proyectoId}?error=${encodeURIComponent(error.message)}`);

  // Vincular los tableros_corte del proyecto a este pedido (solo los no ligados aún)
  await s
    .from("tableros_corte")
    .update({ pedido_id: data!.id })
    .eq("proyecto_id", proyectoId)
    .is("pedido_id", null);

  revalidatePath(`/app/proyectos/${proyectoId}`);
  redirect(`/app/proyectos/${proyectoId}/pedido-corte/${data!.id}`);
}

export async function actualizarPedidoCorte(
  proyectoId: string,
  pedidoId: string,
  fd: FormData,
) {
  const s = await createClient();
  const estado = String(fd.get("estado") ?? "borrador") as EstadoPedidoCorte;
  if (!ESTADOS.includes(estado)) throw new Error("Estado inválido");

  const update: Record<string, unknown> = {
    estado,
    proveedor_id: str(fd, "proveedor_id"),
    fecha_pedido: dateOrNull(fd, "fecha_pedido"),
    fecha_entrega_prometida: dateOrNull(fd, "fecha_entrega_prometida"),
    fecha_entrega_real: dateOrNull(fd, "fecha_entrega_real"),
    coste_total_eur: num(fd, "coste_total_eur"),
    notas: str(fd, "notas"),
  };

  const { error } = await s.from("pedidos_tableros_corte").update(update).eq("id", pedidoId);
  if (error) redirect(`/app/proyectos/${proyectoId}/pedido-corte/${pedidoId}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/app/proyectos/${proyectoId}`);
  revalidatePath(`/app/proyectos/${proyectoId}/pedido-corte/${pedidoId}`);
  redirect(`/app/proyectos/${proyectoId}/pedido-corte/${pedidoId}?ok=actualizado`);
}

export async function eliminarPedidoCorte(proyectoId: string, pedidoId: string) {
  const s = await createClient();
  // Soltar ligadura antes de borrar
  await s.from("tableros_corte").update({ pedido_id: null }).eq("pedido_id", pedidoId);
  await s.from("pedidos_tableros_corte").delete().eq("id", pedidoId);
  revalidatePath(`/app/proyectos/${proyectoId}`);
  redirect(`/app/proyectos/${proyectoId}?ok=eliminado`);
}
