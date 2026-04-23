"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { EstadoPieza } from "@/lib/tipos/piezas";

const ESTADOS: EstadoPieza[] = ["pendiente", "cortada", "producida", "entregada"];

export async function moverPiezaProduccion(piezaId: string, estado: EstadoPieza, filtro?: string) {
  if (!ESTADOS.includes(estado)) throw new Error("Estado inválido.");
  const s = await createClient();
  const { error } = await s.from("piezas_modulo").update({ estado }).eq("id", piezaId);
  if (error) redirect(`/app/produccion?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/app/produccion");
  const qs = filtro ? `?pedido=${encodeURIComponent(filtro)}&ok=actualizado` : "?ok=actualizado";
  redirect(`/app/produccion${qs}`);
}
