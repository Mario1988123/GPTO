import { createClient } from "@/lib/supabase/server";
import nodemailer from "nodemailer";

/**
 * Envía un email usando el SMTP del usuario actual si lo tiene; si no, el SMTP
 * de su empresa. Renderiza una plantilla `tipo` sustituyendo variables `{{x}}`.
 *
 * Devuelve { ok, message_id?, error? } y registra el envío en email_envios.
 */
export async function enviarEmail(opts: {
  destinatario: string;
  tipo:
    | "presupuesto_enviado" | "presupuesto_aceptado" | "presupuesto_recordatorio"
    | "pedido_confirmado" | "pedido_listo" | "albaran"
    | "factura_enviada" | "recordatorio_pago"
    | "bienvenida_cliente" | "cita_programada" | "generico";
  variables?: Record<string, string>;
  asuntoOverride?: string;
  cuerpoOverride?: string;
  proyecto_id?: string;
  presupuesto_id?: string;
  factura_id?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };
  const { data: me } = await s
    .from("usuarios")
    .select("empresa_id, email, nombre")
    .eq("id", user.id)
    .maybeSingle<{ empresa_id: string | null; email: string; nombre: string | null }>();
  if (!me?.empresa_id) return { ok: false, error: "Sin empresa" };

  // Cargar plantilla
  const { data: pl } = await s
    .from("plantillas_email")
    .select("asunto, cuerpo_html")
    .eq("empresa_id", me.empresa_id)
    .eq("tipo", opts.tipo)
    .eq("activo", true)
    .maybeSingle();

  const asuntoBase = opts.asuntoOverride ?? pl?.asunto ?? "";
  const cuerpoBase = opts.cuerpoOverride ?? pl?.cuerpo_html ?? "";

  const vars: Record<string, string> = {
    usuario_nombre: me.nombre ?? me.email,
    ...opts.variables,
  };
  const sustituir = (txt: string) =>
    txt.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? `{{${k}}}`);
  const asunto = sustituir(asuntoBase);
  const cuerpoHtml = sustituir(cuerpoBase);

  // Resolver SMTP: usuario primero, empresa después
  const { data: smtpUser } = await s.from("usuario_smtp").select("*").eq("usuario_id", user.id).maybeSingle();
  const { data: smtpEmp } = await s.from("empresa_smtp").select("*").eq("empresa_id", me.empresa_id).maybeSingle();

  const cfg = smtpUser ?? smtpEmp;
  const via: "smtp_usuario" | "smtp_empresa" = smtpUser ? "smtp_usuario" : "smtp_empresa";
  if (!cfg) return { ok: false, error: "No hay configuración SMTP. Configúrala en Ajustes → Email." };

  const { data: pass } = await s.rpc("smtp_descifrar", { cipher: cfg.password_cifrada });

  try {
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465 || cfg.ssl,
      auth: cfg.usuario && pass ? { user: cfg.usuario, pass: pass as string } : undefined,
    });
    await transporter.sendMail({
      from: cfg.from_nombre ? `"${cfg.from_nombre}" <${cfg.from_email}>` : cfg.from_email,
      to: opts.destinatario,
      replyTo: cfg.reply_to ?? undefined,
      subject: asunto,
      html: cuerpoHtml,
    });

    await s.from("email_envios").insert({
      empresa_id: me.empresa_id,
      enviado_por: user.id,
      destinatario: opts.destinatario,
      asunto,
      cuerpo_html: cuerpoHtml,
      tipo: opts.tipo,
      proyecto_id: opts.proyecto_id ?? null,
      presupuesto_id: opts.presupuesto_id ?? null,
      factura_id: opts.factura_id ?? null,
      exito: true,
      via,
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    await s.from("email_envios").insert({
      empresa_id: me.empresa_id,
      enviado_por: user.id,
      destinatario: opts.destinatario,
      asunto,
      cuerpo_html: cuerpoHtml,
      tipo: opts.tipo,
      exito: false,
      error_msg: msg,
      via,
    });
    return { ok: false, error: msg };
  }
}
