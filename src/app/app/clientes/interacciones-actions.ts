"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const TIPOS = ["nota","llamada","whatsapp","email","reunion","visita","presupuesto","otro"] as const;
type TipoInteraccion = typeof TIPOS[number];

export async function crearInteraccion(clienteId: string, fd: FormData) {
  const s = await createClient();
  const tipo = String(fd.get("tipo") ?? "nota") as TipoInteraccion;
  if (!TIPOS.includes(tipo)) throw new Error("Tipo inválido");
  const titulo = String(fd.get("titulo") ?? "").trim();
  if (!titulo) throw new Error("Título obligatorio");
  const fechaStr = String(fd.get("fecha") ?? "").trim();
  const fecha = fechaStr ? new Date(fechaStr).toISOString() : new Date().toISOString();

  const { error } = await s.from("cliente_interacciones").insert({
    cliente_id: clienteId,
    tipo,
    titulo,
    descripcion: String(fd.get("descripcion") ?? "").trim() || null,
    fecha,
    proyecto_id: String(fd.get("proyecto_id") ?? "").trim() || null,
  });
  if (error) redirect(`/app/clientes/${clienteId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/app/clientes/${clienteId}`);
  redirect(`/app/clientes/${clienteId}?ok=registrado`);
}

export async function eliminarInteraccion(clienteId: string, id: string) {
  const s = await createClient();
  await s.from("cliente_interacciones").delete().eq("id", id);
  revalidatePath(`/app/clientes/${clienteId}`);
  redirect(`/app/clientes/${clienteId}?ok=eliminado`);
}

/**
 * Registra una interacción rápida cuando el usuario abre WhatsApp/llamada/email
 * desde la ficha. La crea con el título "Llamada saliente", "WhatsApp enviado", etc.
 */
export async function registrarContactoRapido(
  clienteId: string,
  tipo: "llamada" | "whatsapp" | "email",
  titulo?: string,
) {
  const s = await createClient();
  const titulos: Record<typeof tipo, string> = {
    llamada: "Llamada saliente",
    whatsapp: "WhatsApp enviado",
    email: "Email enviado",
  };
  await s.from("cliente_interacciones").insert({
    cliente_id: clienteId,
    tipo,
    titulo: titulo ?? titulos[tipo],
  });
  revalidatePath(`/app/clientes/${clienteId}`);
}
