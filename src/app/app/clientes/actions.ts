"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Direccion } from "@/lib/tipos/cliente";

function parseDireccion(formData: FormData): Direccion | null {
  const d: Direccion = {
    calle: String(formData.get("direccion.calle") ?? "").trim() || undefined,
    numero: String(formData.get("direccion.numero") ?? "").trim() || undefined,
    piso: String(formData.get("direccion.piso") ?? "").trim() || undefined,
    cp: String(formData.get("direccion.cp") ?? "").trim() || undefined,
    ciudad: String(formData.get("direccion.ciudad") ?? "").trim() || undefined,
    provincia:
      String(formData.get("direccion.provincia") ?? "").trim() || undefined,
    pais: String(formData.get("direccion.pais") ?? "").trim() || undefined,
  };
  return Object.values(d).some((v) => v) ? d : null;
}

function parsePayload(formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) throw new Error("El nombre / razón social es obligatorio.");

  const es_empresa = String(formData.get("es_empresa") ?? "false") === "true";
  const apellido1 = String(formData.get("apellido1") ?? "").trim() || null;
  const apellido2 = String(formData.get("apellido2") ?? "").trim() || null;
  const telefono = String(formData.get("telefono") ?? "").trim() || null;
  const contacto_persona = String(formData.get("contacto_persona") ?? "").trim() || null;

  // Validaciones condicionales:
  if (!es_empresa && !apellido1) throw new Error("El primer apellido es obligatorio para particulares.");
  if (!telefono) throw new Error("El teléfono es obligatorio.");
  if (es_empresa && !contacto_persona) throw new Error("La persona de contacto es obligatoria en empresas.");

  const email = String(formData.get("email") ?? "").trim() || null;
  const nif = String(formData.get("nif") ?? "").trim() || null;
  const notas = String(formData.get("notas") ?? "").trim() || null;

  // Etiquetas: input "etiquetas" llega como string separado por comas.
  const etiquetasRaw = String(formData.get("etiquetas") ?? "").trim();
  const etiquetas = etiquetasRaw
    ? etiquetasRaw.split(",").map((e) => e.trim()).filter(Boolean)
    : [];

  return {
    nombre,
    apellido1,
    apellido2,
    es_empresa,
    contacto_persona,
    contacto_telefono: String(formData.get("contacto_telefono") ?? "").trim() || null,
    contacto_email: String(formData.get("contacto_email") ?? "").trim() || null,
    contacto2_persona: String(formData.get("contacto2_persona") ?? "").trim() || null,
    contacto2_telefono: String(formData.get("contacto2_telefono") ?? "").trim() || null,
    contacto2_email: String(formData.get("contacto2_email") ?? "").trim() || null,
    email,
    telefono,
    nif,
    notas,
    etiquetas,
    origen: String(formData.get("origen") ?? "").trim() || null,
    foto_url: String(formData.get("foto_url") ?? "").trim() || null,
    proximo_seguimiento: String(formData.get("proximo_seguimiento") ?? "").trim() || null,
    direccion: parseDireccion(formData),
  };
}

export async function crearCliente(formData: FormData) {
  const supabase = await createClient();
  const payload = parsePayload(formData);

  const { data, error } = await supabase
    .from("clientes")
    .insert({ ...payload, activo: true })
    .select("id")
    .single();

  if (error) {
    redirect(
      `/app/clientes/nuevo?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath("/app/clientes");
  redirect(`/app/clientes/${data!.id}?ok=creado`);
}

export async function actualizarCliente(id: string, formData: FormData) {
  const supabase = await createClient();
  const payload = parsePayload(formData);

  const { error } = await supabase
    .from("clientes")
    .update(payload)
    .eq("id", id);

  if (error) {
    redirect(
      `/app/clientes/${id}?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath("/app/clientes");
  revalidatePath(`/app/clientes/${id}`);
  redirect(`/app/clientes/${id}?ok=actualizado`);
}

export async function alternarActivo(id: string, activar: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("clientes")
    .update({ activo: activar })
    .eq("id", id);

  if (error) {
    redirect(
      `/app/clientes/${id}?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath("/app/clientes");
  revalidatePath(`/app/clientes/${id}`);
  redirect(
    `/app/clientes/${id}?ok=${activar ? "reactivado" : "desactivado"}`,
  );
}

export async function eliminarCliente(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("clientes").delete().eq("id", id);

  if (error) {
    redirect(
      `/app/clientes/${id}?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath("/app/clientes");
  redirect(`/app/clientes?ok=eliminado`);
}
