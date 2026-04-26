import Link from "next/link";
import { ArrowLeft, Mail, CheckCircle2, AlertTriangle, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { guardarSmtpEmpresa, probarSmtpEmpresa, guardarPlantilla } from "./actions";
import { PROVEEDORES_SMTP, TIPOS_PLANTILLA } from "@/lib/tipos/auth";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

export default async function ConfigEmailPage() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return null;
  const { data: me } = await s.from("usuarios").select("empresa_id").eq("id", user.id).maybeSingle<{ empresa_id: string | null }>();

  const [{ data: smtp }, { data: plantillas }] = await Promise.all([
    s.from("empresa_smtp").select("*").eq("empresa_id", me?.empresa_id ?? "").maybeSingle(),
    s.from("plantillas_email").select("id, tipo, asunto, cuerpo_html, activo").eq("empresa_id", me?.empresa_id ?? "").order("tipo"),
  ]);

  const plantillasPorTipo = new Map<string, { asunto: string; cuerpo_html: string; activo: boolean }>();
  for (const p of plantillas ?? []) plantillasPorTipo.set(p.tipo as string, { asunto: p.asunto as string, cuerpo_html: p.cuerpo_html as string, activo: p.activo as boolean });

  const probar = async () => { "use server"; await probarSmtpEmpresa(); };

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <Link href="/app/ajustes" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Ajustes
      </Link>
      <PageHeader
        eyebrow="Configuración"
        title="Email"
        description="Conecta tu servidor de email y personaliza las plantillas que se envían a clientes."
      />

      {/* SMTP */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Servidor SMTP de la empresa</p>
          {smtp && smtp.verificado ? (
            <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" /> Verificado
            </span>
          ) : smtp?.ultimo_error ? (
            <span className="inline-flex items-center gap-1 rounded bg-red-500/10 px-2 py-0.5 text-xs font-bold text-red-700 dark:text-red-400">
              <AlertTriangle className="h-3 w-3" /> Sin verificar
            </span>
          ) : null}
        </div>

        <form action={guardarSmtpEmpresa} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="proveedor">Proveedor</Label>
            <select id="proveedor" name="proveedor" defaultValue={(smtp?.proveedor as string) ?? "smtp"} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              {PROVEEDORES_SMTP.map((p) => <option key={p.value} value={p.value}>{p.label}{p.host ? ` · ${p.host}:${p.port}` : ""}</option>)}
            </select>
            <p className="text-[10px] text-muted-foreground">Si eliges Gmail/iCloud/IONOS/Outlook se rellenan los datos por defecto.</p>
          </div>
          <div className="space-y-1.5"><Label htmlFor="host">Host SMTP</Label><Input id="host" name="host" defaultValue={(smtp?.host as string | null) ?? ""} placeholder="smtp.gmail.com" /></div>
          <div className="space-y-1.5"><Label htmlFor="port">Puerto</Label><Input id="port" name="port" type="number" defaultValue={(smtp?.port as number | null) ?? 587} /></div>
          <div className="space-y-1.5"><Label htmlFor="usuario">Usuario</Label><Input id="usuario" name="usuario" defaultValue={(smtp?.usuario as string | null) ?? ""} placeholder="tu@empresa.com" /></div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña / App password</Label>
            <Input id="password" name="password" type="password" placeholder={smtp?.password_cifrada ? "•••••••• (sin cambios si vacío)" : ""} />
            <p className="text-[10px] text-muted-foreground">Se cifra con pgcrypto antes de guardar. Para Gmail con 2FA usa una App Password.</p>
          </div>
          <div className="space-y-1.5"><Label htmlFor="from_email">From email *</Label><Input id="from_email" name="from_email" required type="email" defaultValue={(smtp?.from_email as string | null) ?? ""} placeholder="hola@empresa.com" /></div>
          <div className="space-y-1.5"><Label htmlFor="from_nombre">From nombre</Label><Input id="from_nombre" name="from_nombre" defaultValue={(smtp?.from_nombre as string | null) ?? ""} placeholder="Carpintería ACME" /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="reply_to">Reply-to (opcional)</Label><Input id="reply_to" name="reply_to" type="email" defaultValue={(smtp?.reply_to as string | null) ?? ""} /></div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="ssl" defaultChecked={(smtp?.ssl as boolean | undefined) ?? true} /> Conexión segura (TLS/SSL)</label>
          <div className="sm:col-span-2 flex flex-wrap gap-2 border-t border-border pt-4">
            <Button type="submit"><Mail className="h-4 w-4" /> Guardar SMTP</Button>
          </div>
        </form>

        {smtp && (
          <form action={probar} className="mt-3">
            <Button type="submit" variant="outline" size="sm"><Send className="h-3.5 w-3.5" /> Probar conexión</Button>
            {smtp.ultimo_error && <p className="mt-2 text-xs text-red-700 dark:text-red-400">{smtp.ultimo_error as string}</p>}
            {smtp.ultimo_test && !smtp.ultimo_error && <p className="mt-2 text-[10px] text-muted-foreground">Última prueba: {new Date(smtp.ultimo_test as string).toLocaleString("es-ES")}</p>}
          </form>
        )}
      </section>

      {/* Plantillas */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Plantillas de email</p>
        <p className="mb-4 text-xs text-muted-foreground">
          Variables disponibles: <code>{"{{cliente_nombre}}, {{empresa}}, {{numero}}, {{total}}, {{proyecto}}, {{fecha_entrega}}, {{fecha_vencimiento}}, {{portal_url}}, {{usuario_nombre}}, {{fecha}}, {{asunto}}, {{cuerpo}}"}</code>
        </p>

        <div className="space-y-3">
          {TIPOS_PLANTILLA.map((t) => {
            const existente = plantillasPorTipo.get(t.value) ?? { asunto: "", cuerpo_html: "", activo: true };
            const guardar = async (fd: FormData) => { "use server"; await guardarPlantilla(t.value, fd); };
            return (
              <details key={t.value} className="rounded-xl border border-border">
                <summary className="cursor-pointer px-4 py-3 text-sm font-semibold hover:bg-muted/30">
                  <span className="text-muted-foreground">[{t.grupo}]</span> {t.label}
                </summary>
                <form action={guardar} className="space-y-2 p-4 pt-0">
                  <div className="space-y-1.5"><Label>Asunto</Label><Input name="asunto" defaultValue={existente.asunto} /></div>
                  <div className="space-y-1.5">
                    <Label>Cuerpo HTML</Label>
                    <textarea
                      name="cuerpo_html"
                      rows={8}
                      defaultValue={existente.cuerpo_html}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono"
                    />
                  </div>
                  <Button type="submit" size="sm">Guardar plantilla</Button>
                </form>
              </details>
            );
          })}
        </div>
      </section>
    </div>
  );
}
