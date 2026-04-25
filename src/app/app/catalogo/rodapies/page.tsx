import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, Plus, Blinds, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ToastFromSearchParams, euros } from "../shared";
import { crearRodapie, eliminarRodapie } from "../productos-actions";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

type Fila = {
  id: string;
  nombre: string;
  material: string;
  altura_mm: number;
  grosor_mm: number;
  formato_m: number;
  lleva_led: boolean;
  acabado: string | null;
  precio_pvp_ml: number;
  proveedores: { nombre: string } | null;
};

const MATS = [
  { v: "pvc", l: "PVC" },
  { v: "madera", l: "Madera" },
  { v: "mdf", l: "MDF" },
  { v: "lacado", l: "Lacado" },
  { v: "aluminio", l: "Aluminio" },
  { v: "otro", l: "Otro" },
];

export default async function RodapiesPage() {
  const s = await createClient();
  const [{ data }, { data: proveedores }] = await Promise.all([
    s
      .from("rodapies_catalogo")
      .select("id, nombre, material, altura_mm, grosor_mm, formato_m, lleva_led, acabado, precio_pvp_ml, proveedores(nombre)")
      .eq("activo", true)
      .order("nombre")
      .returns<Fila[]>(),
    s.from("proveedores").select("id, nombre").eq("activo", true).order("nombre"),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <Link href="/app/catalogo" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Catálogo
      </Link>

      <PageHeader
        eyebrow="Catálogo"
        title="Rodapiés"
        description="PVC, madera, lacado, con/sin LED. Precio por metro lineal."
      />

      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <form action={crearRodapie} className="grid gap-3 sm:grid-cols-6">
          <div className="sm:col-span-3 space-y-1.5"><Label htmlFor="nombre">Nombre *</Label><Input id="nombre" name="nombre" required placeholder="Rodapié MDF lacado 70mm" /></div>
          <div className="space-y-1.5">
            <Label htmlFor="material">Material</Label>
            <select id="material" name="material" defaultValue="pvc" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              {MATS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="altura_mm">Altura (mm)</Label><Input id="altura_mm" name="altura_mm" type="number" defaultValue={70} /></div>
          <div className="space-y-1.5"><Label htmlFor="grosor_mm">Grosor (mm)</Label><Input id="grosor_mm" name="grosor_mm" type="number" defaultValue={12} /></div>
          <div className="space-y-1.5"><Label htmlFor="formato_m">Formato (m)</Label><Input id="formato_m" name="formato_m" type="number" step="0.01" defaultValue={2.4} /></div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="lleva_led" /> Lleva LED</label>
          </div>
          <div className="space-y-1.5"><Label htmlFor="acabado">Acabado</Label><Input id="acabado" name="acabado" placeholder="Lacado blanco" /></div>
          <div className="space-y-1.5">
            <Label htmlFor="proveedor_id">Proveedor</Label>
            <select id="proveedor_id" name="proveedor_id" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">— sin proveedor —</option>
              {(proveedores ?? []).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="referencia_proveedor">Ref. proveedor</Label><Input id="referencia_proveedor" name="referencia_proveedor" /></div>
          <div className="space-y-1.5"><Label htmlFor="precio_coste_ml">Coste €/ml</Label><Input id="precio_coste_ml" name="precio_coste_ml" type="number" step="0.01" /></div>
          <div className="space-y-1.5"><Label htmlFor="precio_pvp_ml">PVP €/ml</Label><Input id="precio_pvp_ml" name="precio_pvp_ml" type="number" step="0.01" /></div>
          <div className="sm:col-span-6"><Button type="submit"><Plus className="h-4 w-4" /> Añadir rodapié</Button></div>
        </form>
      </section>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {!data || data.length === 0 ? (
          <div className="p-6"><EmptyState icon={Blinds} title="Sin rodapiés en catálogo" description="Crea el primero arriba." /></div>
        ) : (
          <ul className="divide-y divide-border">
            {data.map((p) => {
              const borrar = async () => { "use server"; await eliminarRodapie(p.id); };
              return (
                <li key={p.id} className="flex items-center gap-4 px-4 py-3">
                  <Blinds className="h-5 w-5 text-zinc-700" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{p.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {MATS.find((t) => t.v === p.material)?.l ?? p.material}
                      {` · ${p.altura_mm}×${p.grosor_mm}mm · ${p.formato_m}m`}
                      {p.lleva_led ? " · con LED" : ""}
                      {p.acabado ? ` · ${p.acabado}` : ""}
                      {p.proveedores?.nombre ? ` · ${p.proveedores.nombre}` : ""}
                    </p>
                  </div>
                  <Badge variant="secondary" className="font-mono">{euros(p.precio_pvp_ml)}/ml</Badge>
                  <form action={borrar} className="inline">
                    <Button type="submit" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
