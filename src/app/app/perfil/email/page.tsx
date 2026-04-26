import Link from "next/link";
import { ArrowLeft, Mail, CheckCircle2, AlertTriangle, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { guardarSmtpUsuario, probarSmtpUsuario, eliminarSmtpUsuario } from "./actions";
import { PROVEEDORES_SMTP } from "@/lib/tipos/auth";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

export default async function MiSmtpPage() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return null;
  const { data: smtp } = await s.from("usuario_smtp").select("*").eq("usuario_id", user.id).maybeSingle();

  const probar = async () => { "use server"; await probarSmtpUsuario(); };
  const eliminar = async () => { "use server"; await eliminarSmtpUsuario(); };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link href="/app" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> App
      </Link>
      <PageHeader
        eyebrow="Mi cuenta"
        title="Mi servidor de email"
        description="Configura tu propio email para que los presupuestos y avisos salgan desde tu dirección. Si no configuras nada, se usa el SMTP de la empresa."
      />

      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Mi SMTP personal</p>
          {smtp && smtp.verificado ? (
            <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" /> Verificado
            </span>
          ) : smtp?.ultimo_error ? (
            <span className="inline-flex items-center gap-1 rounded bg-red-500/10 px-2 py-0.5 text-xs font-bold text-red-700 dark:text-red-400">
              <AlertTriangle className="h-3 w-3" /> Error
            </span>
          ) : null}
        </div>

        <form action={guardarSmtpUsuario} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="proveedor">Proveedor</Label>
            <select id="proveedor" name="proveedor" defaultValue={(smtp?.proveedor as string) ?? "smtp"} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              {PROVEEDORES_SMTP.map((p) => <option key={p.value} value={p.value}>{p.label}{p.host ? ` · ${p.host}:${p.port}` : ""}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="host">Host</Label><Input id="host" name="host" defaultValue={(smtp?.host as string | null) ?? ""} /></div>
          <div className="space-y-1.5"><Label htmlFor="port">Puerto</Label><Input id="port" name="port" type="number" defaultValue={(smtp?.port as number | null) ?? 587} /></div>
          <div className="space-y-1.5"><Label htmlFor="usuario">Usuario</Label><Input id="usuario" name="usuario" defaultValue={(smtp?.usuario as string | null) ?? ""} /></div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña / App password</Label>
            <Input id="password" name="password" type="password" placeholder={smtp?.password_cifrada ? "•••••••• (vacío para no cambiar)" : ""} />
          </div>
          <div className="space-y-1.5"><Label htmlFor="from_email">From email *</Label><Input id="from_email" name="from_email" required type="email" defaultValue={(smtp?.from_email as string | null) ?? user.email ?? ""} /></div>
          <div className="space-y-1.5"><Label htmlFor="from_nombre">From nombre</Label><Input id="from_nombre" name="from_nombre" defaultValue={(smtp?.from_nombre as string | null) ?? ""} /></div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="ssl" defaultChecked={(smtp?.ssl as boolean | undefined) ?? true} /> TLS/SSL</label>
          <div className="sm:col-span-2 flex flex-wrap gap-2 border-t border-border pt-4">
            <Button type="submit"><Mail className="h-4 w-4" /> Guardar</Button>
          </div>
        </form>

        {smtp && (
          <div className="mt-3 flex flex-wrap gap-2">
            <form action={probar}><Button type="submit" variant="outline" size="sm"><Send className="h-3.5 w-3.5" /> Probar</Button></form>
            <form action={eliminar}><Button type="submit" variant="outline" size="sm" className="border-destructive/30 text-destructive">Eliminar mi SMTP</Button></form>
          </div>
        )}
        {smtp?.ultimo_error && <p className="mt-2 text-xs text-red-700 dark:text-red-400">{smtp.ultimo_error as string}</p>}
      </section>
    </div>
  );
}
