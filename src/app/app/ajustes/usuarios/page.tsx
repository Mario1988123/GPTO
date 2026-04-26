import Link from "next/link";
import { ArrowLeft, Plus, KeyRound, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { invitarUsuario, actualizarUsuario, resetPasswordMiUsuario, eliminarUsuarioEmpresa } from "./actions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

export default async function UsuariosEmpresaPage() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return null;
  const { data: me } = await s.from("usuarios").select("empresa_id").eq("id", user.id).maybeSingle<{ empresa_id: string | null }>();

  const [{ data: usuarios }, { data: roles }] = await Promise.all([
    s.from("usuarios")
      .select("id, email, nombre, activo, rol_empresa_id, roles_empresa(nombre, es_admin, color)")
      .eq("empresa_id", me?.empresa_id ?? "")
      .order("created_at"),
    s.from("roles_empresa")
      .select("id, nombre")
      .eq("empresa_id", me?.empresa_id ?? "")
      .eq("activo", true)
      .order("nombre"),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <Link href="/app/ajustes" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Ajustes
      </Link>
      <PageHeader
        eyebrow="Configuración"
        title="Usuarios y accesos"
        description="Gestiona quién puede entrar a tu empresa y con qué rol."
        actions={
          <Link href="/app/ajustes/roles" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-muted">
            Gestionar roles
          </Link>
        }
      />

      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Invitar nuevo usuario</p>
        <form action={invitarUsuario} className="grid gap-3 sm:grid-cols-4">
          <div className="space-y-1.5"><Label htmlFor="email">Email *</Label><Input id="email" name="email" type="email" required /></div>
          <div className="space-y-1.5"><Label htmlFor="nombre">Nombre</Label><Input id="nombre" name="nombre" /></div>
          <div className="space-y-1.5">
            <Label htmlFor="rol_empresa_id">Rol</Label>
            <select id="rol_empresa_id" name="rol_empresa_id" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">— sin rol —</option>
              {(roles ?? []).map((r) => <option key={r.id as string} value={r.id as string}>{r.nombre as string}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit"><Plus className="h-4 w-4" /> Invitar</Button>
          </div>
        </form>
        <p className="mt-2 text-[10px] text-muted-foreground">El usuario recibirá un email para establecer su contraseña.</p>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <ul className="divide-y divide-border">
          {(usuarios ?? []).map((u) => {
            const update = async (fd: FormData) => { "use server"; await actualizarUsuario(u.id as string, fd); };
            const reset = async () => { "use server"; await resetPasswordMiUsuario(u.id as string); };
            const desactivar = async () => { "use server"; await eliminarUsuarioEmpresa(u.id as string); };
            const rol = (u as unknown as { roles_empresa: { nombre: string; es_admin: boolean; color: string } | null }).roles_empresa;
            return (
              <li key={u.id as string} className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-[1fr_auto_auto]">
                <div>
                  <p className="font-semibold">{u.nombre ?? u.email}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <details className="text-xs">
                  <summary className="cursor-pointer rounded-md border border-input bg-background px-3 py-1.5 hover:bg-muted">Editar</summary>
                  <form action={update} className="mt-2 space-y-2">
                    <Input name="nombre" defaultValue={(u.nombre as string | null) ?? ""} placeholder="Nombre" />
                    <select name="rol_empresa_id" defaultValue={(u.rol_empresa_id as string | null) ?? ""} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                      <option value="">— sin rol —</option>
                      {(roles ?? []).map((r) => <option key={r.id as string} value={r.id as string}>{r.nombre as string}</option>)}
                    </select>
                    <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="activo" defaultChecked={u.activo as boolean} /> Activo</label>
                    <Button type="submit" size="sm">Guardar</Button>
                  </form>
                </details>
                <div className="flex items-center gap-1">
                  {rol && (
                    <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${rol.es_admin ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" : "bg-blue-500/10 text-blue-700 dark:text-blue-400"}`}>
                      {rol.nombre}
                    </span>
                  )}
                  <span className={`rounded px-2 py-0.5 text-[10px] ${u.activo ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-zinc-500/10 text-zinc-600"}`}>
                    {u.activo ? "activo" : "inactivo"}
                  </span>
                  <form action={reset} className="inline">
                    <button type="submit" title="Reset contraseña" className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted">
                      <KeyRound className="h-3.5 w-3.5" />
                    </button>
                  </form>
                  <form action={desactivar} className="inline">
                    <button type="submit" title="Desactivar" className="flex h-7 w-7 items-center justify-center rounded text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
