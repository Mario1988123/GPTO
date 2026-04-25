import { Suspense } from "react";
import { Layers, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ToastFromSearchParams } from "../catalogo/shared";
import { crearTableroFisico, eliminarTableroFisico } from "../almacenes/actions";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

type Tab = {
  id: string;
  ancho_mm: number;
  alto_mm: number;
  estado: string;
  coste_eur: number | null;
  notas: string | null;
  referencias_tablero: { materiales: { nombre: string }; acabados: { nombre: string }; grosor_mm: number };
  almacenes: { nombre: string } | null;
  furgonetas: { nombre: string } | null;
  proveedores: { nombre: string } | null;
};

const ESTADO_COLOR: Record<string, string> = {
  entero:    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  en_corte:  "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  consumido: "bg-zinc-500/10 text-zinc-600",
  recorte:   "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  dañado:    "bg-red-500/10 text-red-700 dark:text-red-400",
  devuelto:  "bg-violet-500/10 text-violet-700 dark:text-violet-400",
};

export default async function TablerosFisicosPage() {
  const s = await createClient();
  const [{ data: tableros }, { data: refs }, { data: proveedores }, { data: almacenes }] = await Promise.all([
    s.from("tableros_fisicos")
      .select(`id, ancho_mm, alto_mm, estado, coste_eur, notas,
        referencias_tablero(grosor_mm, materiales(nombre), acabados(nombre)),
        almacenes:ubicacion_almacen_id(nombre),
        furgonetas:ubicacion_furgoneta_id(nombre),
        proveedores:proveedor_id(nombre)`)
      .order("estado")
      .order("created_at", { ascending: false })
      .returns<Tab[]>(),
    s.from("referencias_tablero")
      .select("id, grosor_mm, materiales(nombre), acabados(nombre)")
      .eq("activo", true).order("grosor_mm"),
    s.from("proveedores").select("id, nombre").eq("activo", true).order("nombre"),
    s.from("almacenes").select("id, nombre").eq("activo", true).order("nombre"),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <PageHeader
        eyebrow="Stock"
        title="Tableros físicos"
        description="Tableros enteros que has comprado y aún no has cortado. Cada uno con su trazabilidad."
      />

      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <form action={crearTableroFisico} className="grid gap-3 sm:grid-cols-6">
          <div className="space-y-1.5 sm:col-span-3">
            <Label htmlFor="referencia_tablero_id">Referencia *</Label>
            <select id="referencia_tablero_id" name="referencia_tablero_id" required className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">— elegir —</option>
              {(refs ?? []).map((r) => {
                // @ts-expect-error relacion
                const m = r.materiales?.nombre ?? "?"; const a = r.acabados?.nombre ?? "?";
                return <option key={r.id as string} value={r.id as string}>{m} · {a} · {r.grosor_mm}mm</option>;
              })}
            </select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="ancho_mm">Ancho mm</Label><Input id="ancho_mm" name="ancho_mm" type="number" defaultValue={2440} /></div>
          <div className="space-y-1.5"><Label htmlFor="alto_mm">Alto mm</Label><Input id="alto_mm" name="alto_mm" type="number" defaultValue={1220} /></div>
          <div className="space-y-1.5"><Label htmlFor="cantidad">Unidades</Label><Input id="cantidad" name="cantidad" type="number" defaultValue={1} min={1} /></div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="proveedor_id">Proveedor</Label>
            <select id="proveedor_id" name="proveedor_id" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">—</option>
              {(proveedores ?? []).map((p) => <option key={p.id as string} value={p.id as string}>{p.nombre as string}</option>)}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="almacen_id">Almacén</Label>
            <select id="almacen_id" name="almacen_id" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">—</option>
              {(almacenes ?? []).map((a) => <option key={a.id as string} value={a.id as string}>{a.nombre as string}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="coste_eur">Coste / ud</Label><Input id="coste_eur" name="coste_eur" type="number" step="0.01" /></div>
          <div className="space-y-1.5 sm:col-span-3"><Label htmlFor="notas">Notas</Label><Input id="notas" name="notas" /></div>
          <div className="sm:col-span-6"><Button type="submit"><Plus className="h-4 w-4" /> Añadir tablero(s)</Button></div>
        </form>
      </section>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {!tableros || tableros.length === 0 ? (
          <div className="p-6"><EmptyState icon={Layers} title="Sin tableros físicos" description="Añade los tableros enteros que tengas en almacén." /></div>
        ) : (
          <ul className="divide-y divide-border">
            {tableros.map((t) => {
              const borrar = async () => { "use server"; await eliminarTableroFisico(t.id); };
              return (
                <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                  <Badge className={`${ESTADO_COLOR[t.estado] ?? ""} border-0`}>{t.estado}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">
                      {t.referencias_tablero?.materiales?.nombre ?? "?"} · {t.referencias_tablero?.acabados?.nombre ?? "?"} · {t.referencias_tablero?.grosor_mm ?? "?"}mm
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {t.ancho_mm}×{t.alto_mm} mm
                      {t.almacenes ? ` · ${t.almacenes.nombre}` : ""}
                      {t.furgonetas ? ` · ${t.furgonetas.nombre}` : ""}
                      {t.proveedores ? ` · ${t.proveedores.nombre}` : ""}
                    </p>
                  </div>
                  {t.coste_eur && <span className="font-mono text-sm">{Number(t.coste_eur).toFixed(2)} €</span>}
                  <form action={borrar}><Button type="submit" variant="ghost" size="sm" className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button></form>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
