"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import nodemailer from "nodemailer";

const BASE = "/app/ajustes/email";

async function meEmpresa() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data } = await s.from("usuarios").select("empresa_id, es_superadmin, rol_empresa_id").eq("id", user.id).maybeSingle<{ empresa_id: string | null; es_superadmin: boolean; rol_empresa_id: string | null }>();
  if (!data?.empresa_id && !data?.es_superadmin) throw new Error("Sin empresa");
  return { ...data, userId: user.id };
}

export async function guardarSmtpEmpresa(fd: FormData) {
  const me = await meEmpresa();
  if (!me.empresa_id) throw new Error("Sin empresa");
  const s = await createClient();
  const passPlano = String(fd.get("password") ?? "").trim();
  // Cifrar contraseña con función smtp_cifrar (requiere app.smtp_key configurada en Supabase).
  let password_cifrada: string | null = null;
  if (passPlano) {
    const { data: cipher } = await s.rpc("smtp_cifrar", { plain: passPlano });
    password_cifrada = cipher as string | null;
  }
  const update: Record<string, unknown> = {
    empresa_id: me.empresa_id,
    proveedor: String(fd.get("proveedor") ?? "smtp"),
    host: String(fd.get("host") ?? "").trim() || null,
    port: Number(fd.get("port") ?? 587) || 587,
    usuario: String(fd.get("usuario") ?? "").trim() || null,
    ssl: fd.get("ssl") !== "off",
    from_email: String(fd.get("from_email") ?? "").trim(),
    from_nombre: String(fd.get("from_nombre") ?? "").trim() || null,
    reply_to: String(fd.get("reply_to") ?? "").trim() || null,
  };
  if (password_cifrada !== null) update.password_cifrada = password_cifrada;

  const { error } = await s.from("empresa_smtp").upsert(update, { onConflict: "empresa_id" });
  if (error) redirect(`${BASE}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(BASE);
  redirect(`${BASE}?ok=guardado`);
}

export async function probarSmtpEmpresa() {
  const me = await meEmpresa();
  if (!me.empresa_id) throw new Error("Sin empresa");
  const s = await createClient();
  const { data: cfg } = await s.from("empresa_smtp").select("*, password:password_cifrada").eq("empresa_id", me.empresa_id).maybeSingle();
  if (!cfg) redirect(`${BASE}?error=${encodeURIComponent("Configura SMTP primero")}`);

  const { data: pass } = await s.rpc("smtp_descifrar", { cipher: cfg!.password_cifrada });
  try {
    const transporter = nodemailer.createTransport({
      host: cfg!.host,
      port: cfg!.port,
      secure: cfg!.port === 465,
      auth: cfg!.usuario && pass ? { user: cfg!.usuario, pass: pass as string } : undefined,
    });
    await transporter.verify();
    await s.from("empresa_smtp").update({
      verificado: true,
      ultimo_test: new Date().toISOString(),
      ultimo_error: null,
    }).eq("empresa_id", me.empresa_id);
  } catch (e) {
    await s.from("empresa_smtp").update({
      verificado: false,
      ultimo_test: new Date().toISOString(),
      ultimo_error: e instanceof Error ? e.message : "Error desconocido",
    }).eq("empresa_id", me.empresa_id);
  }
  revalidatePath(BASE);
  redirect(`${BASE}?ok=probado`);
}

export async function guardarPlantilla(tipo: string, fd: FormData) {
  const me = await meEmpresa();
  if (!me.empresa_id) throw new Error("Sin empresa");
  const s = await createClient();
  await s.from("plantillas_email").upsert({
    empresa_id: me.empresa_id,
    tipo,
    asunto: String(fd.get("asunto") ?? "").trim(),
    cuerpo_html: String(fd.get("cuerpo_html") ?? ""),
    activo: true,
  }, { onConflict: "empresa_id,tipo" });
  revalidatePath(BASE);
  redirect(`${BASE}?ok=plantilla-guardada`);
}
