import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, Plus, Grid3x3, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ToastFromSearchParams, euros } from "../shared";
import { crearSuelo, eliminarSuelo } from "../productos-actions";
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
  tipo: string;
  clase_uso: string | null;
  grosor_mm: number;
  ancho_lama_mm: number | null;
  largo_lama_mm: number | null;
  acabado: string | null;
  precio_pvp_m2: number;
  proveedores: { nombre: string } | null;
};

const TIPOS = [
  { v: "laminado", l: "Laminado" },
  { v: "parquet_natural", l: "Parquet natural" },
  { v: "vinilico", l: "Vinílico" },
  { v: "spc", l: "SPC" },
  { v: "tarima_maciza", l: "Tarima maciza" },
  { v: "otro", l: "Otro" },
];

const CLASES = ["AC3", "AC4", "AC5", "AC6"];

export default async function SuelosPage() {
  const s = await createClient();
  const [{ data }, { data: proveedores }] = await Promise.all([
    s
      .from("suelos_catalogo")
      .select("id, nombre, tipo, clase_uso, grosor_mm, ancho_lama_mm, largo_lama_mm, acabado, precio_pvp_m2, proveedores(nombre)")
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
        title="Suelos"
        description="Parquet, laminado, vinílico, SPC... con clase AC y precio por m²."
      />

      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <form action={crearSuelo} className="grid gap-3 sm:grid-cols-6">
          <div className="sm:col-span-3 space-y-1.5"><Label htmlFor="nombre">Nombre *</Label><Input id="nombre" name="nombre" required placeholder="Finfloor Roble Natural AC5 12mm" /></div>
          <div className="space-y-1.5">
            <Label htmlFor="tipo">Tipo</Label>
            <select id="tipo" name="tipo" defaultValue="laminado" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="clase_uso">Clase uso</Label>
            <select id="clase_uso" name="clase_uso" defaultValue="" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">—</option>
              {CLASES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="grosor_mm">Grosor (mm)</Label><Input id="grosor_mm" name="grosor_mm" type="number" defaultValue={8} /></div>
          <div className="space-y-1.5"><Label htmlFor="ancho_lama_mm">Ancho lama</Label><Input id="ancho_lama_mm" name="ancho_lama_mm" type="number" placeholder="192" /></div>
          <div className="space-y-1.5"><Label htmlFor="largo_lama_mm">Largo lama</Label><Input id="largo_lama_mm" name="largo_lama_mm" type="number" placeholder="1285" /></div>
          <div className="space-y-1.5"><Label htmlFor="acabado">Acabado</Label><Input id="acabado" name="acabado" placeholder="Roble natural cepillado" /></div>
          <div className="space-y-1.5">
            <Label htmlFor="proveedor_id">Proveedor</Label>
            <select id="proveedor_id" name="proveedor_id" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">— sin proveedor —</option>
              {(proveedores ?? []).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="referencia_proveedor">Ref. proveedor</Label><Input id="referencia_proveedor" name="referencia_proveedor" /></div>
          <div className="space-y-1.5"><Label htmlFor="precio_coste_m2">Coste €/m²</Label><Input id="precio_coste_m2" name="precio_coste_m2" type="number" step="0.01" /></div>
          <div className="space-y-1.5"><Label htmlFor="precio_pvp_m2">PVP €/m²</Label><Input id="precio_pvp_m2" name="precio_pvp_m2" type="number" step="0.01" /></div>
          <div className="sm:col-span-6"><Button type="submit"><Plus className="h-4 w-4" /> Añadir suelo</Button></div>
        </form>
      </section>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {!data || data.length === 0 ? (
          <div className="p-6"><EmptyState icon={Grid3x3} title="Sin suelos en catálogo" description="Crea el primero arriba." /></div>
        ) : (
          <ul className="divide-y divide-border">
            {data.map((p) => {
              const borrar = async () => { "use server"; await eliminarSuelo(p.id); };
              return (
                <li key={p.id} className="flex items-center gap-4 px-4 py-3">
                  <Grid3x3 className="h-5 w-5 text-amber-700" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{p.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {TIPOS.find((t) => t.v === p.tipo)?.l ?? p.tipo}
                      {p.clase_uso ? ` · ${p.clase_uso}` : ""}
                      {` · ${p.grosor_mm}mm`}
                      {p.ancho_lama_mm && p.largo_lama_mm ? ` · lama ${p.ancho_lama_mm}×${p.largo_lama_mm}` : ""}
                      {p.acabado ? ` · ${p.acabado}` : ""}
                      {p.proveedores?.nombre ? ` · ${p.proveedores.nombre}` : ""}
                    </p>
                  </div>
                  <Badge variant="secondary" className="font-mono">{euros(p.precio_pvp_m2)}/m²</Badge>
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
