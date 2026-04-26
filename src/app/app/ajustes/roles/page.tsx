import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { crearRol, actualizarRol, eliminarRol } from "./actions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

type Permiso = { slug: string; grupo: string; nombre: string; descripcion: string | null; orden: number };
type Rol = { id: string; slug: string; nombre: string; descripcion: string | null; permisos: string[]; color: string; es_admin: boolean; activo: boolean };

export default async function RolesPage() {
  const s = await createClient();
  const [{ data: roles }, { data: permisos }] = await Promise.all([
    s.from("roles_empresa")
      .select("id, slug, nombre, descripcion, permisos, color, es_admin, activo")
      .order("es_admin", { ascending: false })
      .order("nombre")
      .returns<Rol[]>(),
    s.from("permisos_catalogo").select("slug, grupo, nombre, descripcion, orden").order("orden").returns<Permiso[]>(),
  ]);

  // Agrupar permisos
  const grupos = new Map<string, Permiso[]>();
  for (const p of permisos ?? []) {
    const arr = grupos.get(p.grupo) ?? [];
    arr.push(p);
    grupos.set(p.grupo, arr);
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Link href="/app/ajustes/usuarios" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Usuarios
      </Link>
      <PageHeader
        eyebrow="Configuración"
        title="Roles y permisos"
        description="Define qué puede hacer cada perfil de usuario en tu empresa."
      />

      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Crear rol</p>
        <form action={crearRol} className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5"><Label htmlFor="nombre">Nombre *</Label><Input id="nombre" name="nombre" required placeholder="Comercial, Operario taller, Montador..." /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="descripcion">Descripción</Label><Input id="descripcion" name="descripcion" /></div>
            <div className="space-y-1.5"><Label htmlFor="color">Color</Label><Input id="color" name="color" type="color" defaultValue="#3b82f6" /></div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[...grupos.entries()].map(([grupo, ps]) => (
              <details key={grupo} open className="rounded-md border border-border bg-muted/20 p-2">
                <summary className="cursor-pointer text-xs font-bold">{grupo}</summary>
                <div className="mt-2 space-y-1">
                  {ps.map((p) => (
                    <label key={p.slug} className="flex items-start gap-2 text-xs">
                      <input type="checkbox" name="permisos" value={p.slug} className="mt-0.5" />
                      <span><strong>{p.nombre}</strong>{p.descripcion ? <em className="block text-[10px] text-muted-foreground">{p.descripcion}</em> : null}</span>
                    </label>
                  ))}
                </div>
              </details>
            ))}
          </div>
          <Button type="submit"><Plus className="h-4 w-4" /> Crear rol</Button>
        </form>
      </section>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {(roles ?? []).map((r) => {
          const update = async (fd: FormData) => { "use server"; await actualizarRol(r.id, fd); };
          const borrar = async () => { "use server"; await eliminarRol(r.id); };
          return (
            <li key={r.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ background: r.color }} />
                  <p className="font-bold">{r.nombre}</p>
                  {r.es_admin && <Shield className="h-3.5 w-3.5 text-amber-600" />}
                </div>
                {!r.es_admin && (
                  <form action={borrar}>
                    <button type="submit" className="text-destructive hover:underline text-xs">Eliminar</button>
                  </form>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{r.descripcion ?? (r.es_admin ? "Control total." : "Sin descripción")}</p>
              <p className="mt-2 text-[10px] text-muted-foreground">{r.permisos.length} permisos asignados</p>

              {!r.es_admin && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">Editar</summary>
                  <form action={update} className="mt-2 space-y-2">
                    <Input name="nombre" defaultValue={r.nombre} />
                    <Input name="descripcion" defaultValue={r.descripcion ?? ""} placeholder="Descripción" />
                    <Input name="color" type="color" defaultValue={r.color} />
                    <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="activo" defaultChecked={r.activo} /> Activo</label>
                    <div className="grid gap-1 sm:grid-cols-2">
                      {[...grupos.entries()].map(([grupo, ps]) => (
                        <details key={grupo} className="rounded border border-border bg-muted/20 p-1.5 text-[10px]">
                          <summary className="cursor-pointer font-bold">{grupo}</summary>
                          <div className="mt-1 space-y-0.5">
                            {ps.map((p) => (
                              <label key={p.slug} className="flex items-start gap-1">
                                <input type="checkbox" name="permisos" value={p.slug} defaultChecked={r.permisos.includes(p.slug)} />
                                {p.nombre}
                              </label>
                            ))}
                          </div>
                        </details>
                      ))}
                    </div>
                    <Button type="submit" size="sm">Guardar</Button>
                  </form>
                </details>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
