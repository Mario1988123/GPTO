import Link from "next/link";
import { Suspense } from "react";
import { Warehouse, Plus, Trash2, Star, Truck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ToastFromSearchParams } from "../catalogo/shared";
import { crearAlmacen, eliminarAlmacen, actualizarAlmacen } from "./actions";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

type Almacen = {
  id: string;
  nombre: string;
  direccion: string | null;
  notas: string | null;
  es_principal: boolean;
  activo: boolean;
  piezas: { count: number }[];
  tableros: { count: number }[];
};

export default async function AlmacenesPage() {
  const s = await createClient();
  const { data } = await s
    .from("almacenes")
    .select("id, nombre, direccion, notas, es_principal, activo, piezas:piezas_modulo(count), tableros:tableros_fisicos(count)")
    .eq("activo", true)
    .order("es_principal", { ascending: false })
    .order("nombre")
    .returns<Almacen[]>();

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <PageHeader
        eyebrow="Stock"
        title="Almacenes"
        description="Ubicaciones físicas donde guardas piezas, tableros y materiales."
        actions={
          <Link href="/app/furgonetas" className={buttonVariants({ variant: "outline" })}>
            <Truck className="h-4 w-4" />
            Furgonetas
          </Link>
        }
      />

      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <form action={crearAlmacen} className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="nombre">Nombre *</Label><Input id="nombre" name="nombre" required placeholder="Almacén central" /></div>
          <label className="flex items-end gap-2 text-sm"><input type="checkbox" name="es_principal" /> Es el principal</label>
          <div className="space-y-1.5 sm:col-span-3"><Label htmlFor="direccion">Dirección</Label><Input id="direccion" name="direccion" placeholder="Av. Industrial 12, A Coruña" /></div>
          <div className="space-y-1.5 sm:col-span-3"><Label htmlFor="notas">Notas</Label><Input id="notas" name="notas" placeholder="Tipo, horario, capacidad..." /></div>
          <div className="sm:col-span-3"><Button type="submit"><Plus className="h-4 w-4" /> Crear almacén</Button></div>
        </form>
      </section>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {!data || data.length === 0 ? (
          <div className="sm:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <EmptyState icon={Warehouse} title="Sin almacenes" description="Crea el primero arriba." />
          </div>
        ) : (
          data.map((a) => {
            const update = async (fd: FormData) => { "use server"; await actualizarAlmacen(a.id, fd); };
            const borrar = async () => { "use server"; await eliminarAlmacen(a.id); };
            return (
              <article key={a.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <p className="flex items-center gap-1.5 text-base font-bold">
                      {a.es_principal && <Star className="h-4 w-4 fill-amber-400 text-amber-400" />}
                      {a.nombre}
                    </p>
                    {a.direccion && <p className="text-xs text-muted-foreground">{a.direccion}</p>}
                  </div>
                  <form action={borrar}><Button type="submit" variant="ghost" size="sm" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></form>
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span className="rounded bg-muted px-2 py-0.5">{a.piezas?.[0]?.count ?? 0} piezas</span>
                  <span className="rounded bg-muted px-2 py-0.5">{a.tableros?.[0]?.count ?? 0} tableros</span>
                </div>
                <details className="mt-3 text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Editar</summary>
                  <form action={update} className="mt-3 grid gap-2">
                    <Input name="nombre" defaultValue={a.nombre} />
                    <Input name="direccion" defaultValue={a.direccion ?? ""} placeholder="Dirección" />
                    <Input name="notas" defaultValue={a.notas ?? ""} placeholder="Notas" />
                    <label className="flex items-center gap-2"><input type="checkbox" name="es_principal" defaultChecked={a.es_principal} /> Principal</label>
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
