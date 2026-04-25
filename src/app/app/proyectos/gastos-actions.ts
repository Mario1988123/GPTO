"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function crearGastoProyecto(proyectoId: string, fd: FormData) {
  const s = await createClient();
  const descripcion = String(fd.get("descripcion") ?? "").trim();
  if (!descripcion) throw new Error("Descripción obligatoria");
  const importe = Number(fd.get("importe_eur") ?? 0);
  if (!Number.isFinite(importe) || importe < 0) throw new Error("Importe inválido");

  const { error } = await s.from("gastos_proyecto").insert({
    proyecto_id: proyectoId,
    categoria: String(fd.get("categoria") ?? "otros"),
    descripcion,
    importe_eur: importe,
    proveedor_id: String(fd.get("proveedor_id") ?? "").trim() || null,
    pedido_corte_id: String(fd.get("pedido_corte_id") ?? "").trim() || null,
    fecha: String(fd.get("fecha") ?? "").trim() || new Date().toISOString().slice(0, 10),
    notas: String(fd.get("notas") ?? "").trim() || null,
  });
  if (error) redirect(`/app/proyectos/${proyectoId}/gastos?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/app/proyectos/${proyectoId}/gastos`);
  revalidatePath(`/app/proyectos/${proyectoId}`);
  redirect(`/app/proyectos/${proyectoId}/gastos?ok=registrado`);
}

export async function eliminarGastoProyecto(proyectoId: string, id: string) {
  const s = await createClient();
  await s.from("gastos_proyecto").delete().eq("id", id);
  revalidatePath(`/app/proyectos/${proyectoId}/gastos`);
  redirect(`/app/proyectos/${proyectoId}/gastos?ok=eliminado`);
}
