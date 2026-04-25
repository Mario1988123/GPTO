import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { actualizarSuelo, eliminarSuelo } from "../../productos-actions";
import { ToastFromSearchParams } from "../../shared";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

const TIPOS = [
  { v: "laminado", l: "Laminado" },
  { v: "parquet_natural", l: "Parquet natural" },
  { v: "vinilico", l: "Vinílico" },
  { v: "spc", l: "SPC" },
  { v: "tarima_maciza", l: "Tarima maciza" },
  { v: "otro", l: "Otro" },
];
const CLASES = ["AC3", "AC4", "AC5", "AC6"];

type Suelo = {
  id: string;
  nombre: string;
  tipo: string;
  clase_uso: string | null;
  grosor_mm: number;
  ancho_lama_mm: number | null;
  largo_lama_mm: number | null;
  acabado: string | null;
  proveedor_id: string | null;
  referencia_proveedor: string | null;
  precio_coste_m2: number;
  precio_pvp_m2: number;
  foto_url: string | null;
  notas: string | null;
};

export default async function EditarSueloPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await createClient();
  const [{ data: p }, { data: proveedores }] = await Promise.all([
    s.from("suelos_catalogo").select("*").eq("id", id).maybeSingle<Suelo>(),
    s.from("proveedores").select("id, nombre").eq("activo", true).order("nombre"),
  ]);
  if (!p) notFound();

  const update = async (fd: FormData) => { "use server"; await actualizarSuelo(id, fd); };
  const borrar = async () => { "use server"; await eliminarSuelo(id); };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <Link href="/app/catalogo/suelos" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Suelos
      </Link>
      <PageHeader eyebrow="Suelo" title={p.nombre} />

      {p.foto_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.foto_url} alt={p.nombre} className="mt-6 h-48 w-full rounded-2xl object-cover ring-1 ring-border" />
      )}

      <form action={update} className="mt-8 grid gap-3 rounded-2xl border border-border bg-card p-6 shadow-sm sm:grid-cols-6 sm:p-8">
        <div className="sm:col-span-3 space-y-1.5"><Label htmlFor="nombre">Nombre *</Label><Input id="nombre" name="nombre" required defaultValue={p.nombre} /></div>
        <div className="space-y-1.5">
          <Label htmlFor="tipo">Tipo</Label>
          <select id="tipo" name="tipo" defaultValue={p.tipo} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
            {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="clase_uso">Clase uso</Label>
          <select id="clase_uso" name="clase_uso" defaultValue={p.clase_uso ?? ""} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="">—</option>
            {CLASES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1.5"><Label htmlFor="grosor_mm">Grosor (mm)</Label><Input id="grosor_mm" name="grosor_mm" type="number" defaultValue={p.grosor_mm} /></div>
        <div className="space-y-1.5"><Label htmlFor="ancho_lama_mm">Ancho lama</Label><Input id="ancho_lama_mm" name="ancho_lama_mm" type="number" defaultValue={p.ancho_lama_mm ?? ""} /></div>
        <div className="space-y-1.5"><Label htmlFor="largo_lama_mm">Largo lama</Label><Input id="largo_lama_mm" name="largo_lama_mm" type="number" defaultValue={p.largo_lama_mm ?? ""} /></div>
        <div className="space-y-1.5"><Label htmlFor="acabado">Acabado</Label><Input id="acabado" name="acabado" defaultValue={p.acabado ?? ""} /></div>
        <div className="space-y-1.5">
          <Label htmlFor="proveedor_id">Proveedor</Label>
          <select id="proveedor_id" name="proveedor_id" defaultValue={p.proveedor_id ?? ""} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="">— sin proveedor —</option>
            {(proveedores ?? []).map((pr) => <option key={pr.id as string} value={pr.id as string}>{pr.nombre as string}</option>)}
          </select>
        </div>
        <div className="space-y-1.5"><Label htmlFor="referencia_proveedor">Ref. proveedor</Label><Input id="referencia_proveedor" name="referencia_proveedor" defaultValue={p.referencia_proveedor ?? ""} /></div>
        <div className="space-y-1.5"><Label htmlFor="precio_coste_m2">Coste €/m²</Label><Input id="precio_coste_m2" name="precio_coste_m2" type="number" step="0.01" defaultValue={p.precio_coste_m2} /></div>
        <div className="space-y-1.5"><Label htmlFor="precio_pvp_m2">PVP €/m²</Label><Input id="precio_pvp_m2" name="precio_pvp_m2" type="number" step="0.01" defaultValue={p.precio_pvp_m2} /></div>
        <div className="sm:col-span-6 space-y-1.5"><Label htmlFor="foto_url">URL fotografía</Label><Input id="foto_url" name="foto_url" placeholder="https://…" defaultValue={p.foto_url ?? ""} /></div>
        <div className="sm:col-span-6 space-y-1.5"><Label htmlFor="notas">Notas</Label><Input id="notas" name="notas" defaultValue={p.notas ?? ""} /></div>
        <div className="sm:col-span-6 flex items-center justify-between gap-3 border-t border-border pt-4">
          <Button type="submit">Guardar cambios</Button>
        </div>
      </form>

      <div className="mt-6 flex justify-end">
        <form action={borrar}>
          <Button type="submit" variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" /> Eliminar suelo
          </Button>
        </form>
      </div>
    </div>
  );
}
