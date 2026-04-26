"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import nodemailer from "nodemailer";

const BASE = "/app/perfil/email";

async function me() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data } = await s.from("usuarios").select("empresa_id").eq("id", user.id).maybeSingle<{ empresa_id: string | null }>();
  return { userId: user.id, empresaId: data?.empresa_id ?? null };
}

export async function guardarSmtpUsuario(fd: FormData) {
  const u = await me();
  if (!u.empresaId) throw new Error("Sin empresa");
  const s = await createClient();
  const passPlano = String(fd.get("password") ?? "").trim();
  let password_cifrada: string | null | undefined = undefined;
  if (passPlano) {
    const { data: cipher } = await s.rpc("smtp_cifrar", { plain: passPlano });
    password_cifrada = cipher as string | null;
  }
  const update: Record<string, unknown> = {
    usuario_id: u.userId,
    empresa_id: u.empresaId,
    proveedor: String(fd.get("proveedor") ?? "smtp"),
    host: String(fd.get("host") ?? "").trim() || null,
    port: Number(fd.get("port") ?? 587) || 587,
    usuario: String(fd.get("usuario") ?? "").trim() || null,
    ssl: fd.get("ssl") !== "off",
    from_email: String(fd.get("from_email") ?? "").trim(),
    from_nombre: String(fd.get("from_nombre") ?? "").trim() || null,
  };
  if (password_cifrada !== undefined) update.password_cifrada = password_cifrada;
  await s.from("usuario_smtp").upsert(update, { onConflict: "usuario_id" });
  revalidatePath(BASE);
  redirect(`${BASE}?ok=guardado`);
}

export async function probarSmtpUsuario() {
  const u = await me();
  const s = await createClient();
  const { data: cfg } = await s.from("usuario_smtp").select("*").eq("usuario_id", u.userId).maybeSingle();
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
    await s.from("usuario_smtp").update({ verificado: true, ultimo_test: new Date().toISOString(), ultimo_error: null }).eq("usuario_id", u.userId);
  } catch (e) {
    await s.from("usuario_smtp").update({ verificado: false, ultimo_test: new Date().toISOString(), ultimo_error: e instanceof Error ? e.message : "Error" }).eq("usuario_id", u.userId);
  }
  revalidatePath(BASE);
  redirect(`${BASE}?ok=probado`);
}

export async function eliminarSmtpUsuario() {
  const u = await me();
  const s = await createClient();
  await s.from("usuario_smtp").delete().eq("usuario_id", u.userId);
  revalidatePath(BASE);
  redirect(`${BASE}?ok=eliminado`);
}
