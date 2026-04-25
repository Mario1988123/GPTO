import Link from "next/link";
import { Suspense } from "react";
import { Truck, Plus, Trash2, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ToastFromSearchParams } from "../catalogo/shared";
import { crearFurgoneta, eliminarFurgoneta, actualizarFurgoneta } from "../almacenes/actions";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

type Furgo = {
  id: string;
  nombre: string;
  matricula: string | null;
  modelo: string | null;
  conductor_usuario_id: string | null;
  notas: string | null;
  activa: boolean;
  piezas: { count: number }[];
};

export default async function FurgonetasPage() {
  const s = await createClient();
  const [{ data }, { data: usuarios }] = await Promise.all([
    s
      .from("furgonetas")
      .select("id, nombre, matricula, modelo, conductor_usuario_id, notas, activa, piezas:piezas_modulo(count)")
      .eq("activa", true)
      .order("nombre")
      .returns<Furgo[]>(),
    s.from("usuarios").select("id, nombre").order("nombre"),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <Link href="/app/almacenes" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Almacenes
      </Link>
      <PageHeader
        eyebrow="Stock"
        title="Furgonetas"
        description="Vehículos donde pueden estar piezas en tránsito (un día, un fin de semana...)."
      />

      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <form action={crearFurgoneta} className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5"><Label htmlFor="nombre">Nombre *</Label><Input id="nombre" name="nombre" required placeholder="Furgo principal" /></div>
          <div className="space-y-1.5"><Label htmlFor="matricula">Matrícula</Label><Input id="matricula" name="matricula" placeholder="1234 ABC" /></div>
          <div className="space-y-1.5"><Label htmlFor="modelo">Modelo</Label><Input id="modelo" name="modelo" placeholder="Ford Transit" /></div>
          <div className="space-y-1.5">
            <Label htmlFor="conductor_usuario_id">Conductor</Label>
            <select id="conductor_usuario_id" name="conductor_usuario_id" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">— sin asignar —</option>
              {(usuarios ?? []).map((u) => <option key={u.id as string} value={u.id as string}>{u.nombre as string}</option>)}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="notas">Notas</Label><Input id="notas" name="notas" placeholder="ITV, mantenimiento..." /></div>
          <div className="sm:col-span-3"><Button type="submit"><Plus className="h-4 w-4" /> Crear furgoneta</Button></div>
        </form>
      </section>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {!data || data.length === 0 ? (
          <div className="sm:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <EmptyState icon={Truck} title="Sin furgonetas" description="Crea la primera arriba." />
          </div>
        ) : (
          data.map((f) => {
            const update = async (fd: FormData) => { "use server"; await actualizarFurgoneta(f.id, fd); };
            const borrar = async () => { "use server"; await eliminarFurgoneta(f.id); };
            return (
              <article key={f.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <p className="text-base font-bold">{f.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.matricula ? `${f.matricula} · ` : ""}{f.modelo ?? ""}
                    </p>
                  </div>
                  <form action={borrar}><Button type="submit" variant="ghost" size="sm" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></form>
                </div>
                <span className="rounded bg-muted px-2 py-0.5 text-xs">{f.piezas?.[0]?.count ?? 0} piezas dentro</span>
                <details className="mt-3 text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Editar</summary>
                  <form action={update} className="mt-3 grid gap-2">
                    <Input name="nombre" defaultValue={f.nombre} />
                    <Input name="matricula" defaultValue={f.matricula ?? ""} placeholder="Matrícula" />
                    <Input name="modelo" defaultValue={f.modelo ?? ""} placeholder="Modelo" />
                    <Input name="notas" defaultValue={f.notas ?? ""} placeholder="Notas" />
                    <Button type="submit" size="sm">Guardar</Button>
                  </form>
                </details>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
