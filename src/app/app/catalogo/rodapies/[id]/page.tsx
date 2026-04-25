import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { actualizarRodapie, eliminarRodapie } from "../../productos-actions";
import { ToastFromSearchParams } from "../../shared";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

const MATS = [
  { v: "pvc", l: "PVC" },
  { v: "madera", l: "Madera" },
  { v: "mdf", l: "MDF" },
  { v: "lacado", l: "Lacado" },
  { v: "aluminio", l: "Aluminio" },
  { v: "otro", l: "Otro" },
];

type Rodapie = {
  id: string;
  nombre: string;
  material: string;
  altura_mm: number;
  grosor_mm: number;
  formato_m: number;
  lleva_led: boolean;
  acabado: string | null;
  proveedor_id: string | null;
  referencia_proveedor: string | null;
  precio_coste_ml: number;
  precio_pvp_ml: number;
  foto_url: string | null;
  notas: string | null;
};

export default async function EditarRodapiePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await createClient();
  const [{ data: p }, { data: proveedores }] = await Promise.all([
    s.from("rodapies_catalogo").select("*").eq("id", id).maybeSingle<Rodapie>(),
    s.from("proveedores").select("id, nombre").eq("activo", true).order("nombre"),
  ]);
  if (!p) notFound();

  const update = async (fd: FormData) => { "use server"; await actualizarRodapie(id, fd); };
  const borrar = async () => { "use server"; await eliminarRodapie(id); };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <Link href="/app/catalogo/rodapies" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Rodapiés
      </Link>
      <PageHeader eyebrow="Rodapié" title={p.nombre} />

      {p.foto_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.foto_url} alt={p.nombre} className="mt-6 h-48 w-full rounded-2xl object-cover ring-1 ring-border" />
      )}

      <form action={update} className="mt-8 grid gap-3 rounded-2xl border border-border bg-card p-6 shadow-sm sm:grid-cols-6 sm:p-8">
        <div className="sm:col-span-3 space-y-1.5"><Label htmlFor="nombre">Nombre *</Label><Input id="nombre" name="nombre" required defaultValue={p.nombre} /></div>
        <div className="space-y-1.5">
          <Label htmlFor="material">Material</Label>
          <select id="material" name="material" defaultValue={p.material} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
            {MATS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
        </div>
        <div className="space-y-1.5"><Label htmlFor="altura_mm">Altura (mm)</Label><Input id="altura_mm" name="altura_mm" type="number" defaultValue={p.altura_mm} /></div>
        <div className="space-y-1.5"><Label htmlFor="grosor_mm">Grosor (mm)</Label><Input id="grosor_mm" name="grosor_mm" type="number" defaultValue={p.grosor_mm} /></div>
        <div className="space-y-1.5"><Label htmlFor="formato_m">Formato (m)</Label><Input id="formato_m" name="formato_m" type="number" step="0.01" defaultValue={p.formato_m} /></div>
        <div className="flex items-end gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="lleva_led" defaultChecked={p.lleva_led} /> Lleva LED
          </label>
        </div>
        <div className="space-y-1.5"><Label htmlFor="acabado">Acabado</Label><Input id="acabado" name="acabado" defaultValue={p.acabado ?? ""} /></div>
        <div className="space-y-1.5">
          <Label htmlFor="proveedor_id">Proveedor</Label>
          <select id="proveedor_id" name="proveedor_id" defaultValue={p.proveedor_id ?? ""} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="">— sin proveedor —</option>
            {(proveedores ?? []).map((pr) => <option key={pr.id as string} value={pr.id as string}>{pr.nombre as string}</option>)}
          </select>
        </div>
        <div className="space-y-1.5"><Label htmlFor="referencia_proveedor">Ref. proveedor</Label><Input id="referencia_proveedor" name="referencia_proveedor" defaultValue={p.referencia_proveedor ?? ""} /></div>
        <div className="space-y-1.5"><Label htmlFor="precio_coste_ml">Coste €/ml</Label><Input id="precio_coste_ml" name="precio_coste_ml" type="number" step="0.01" defaultValue={p.precio_coste_ml} /></div>
        <div className="space-y-1.5"><Label htmlFor="precio_pvp_ml">PVP €/ml</Label><Input id="precio_pvp_ml" name="precio_pvp_ml" type="number" step="0.01" defaultValue={p.precio_pvp_ml} /></div>
        <div className="sm:col-span-6 space-y-1.5"><Label htmlFor="foto_url">URL fotografía</Label><Input id="foto_url" name="foto_url" placeholder="https://…" defaultValue={p.foto_url ?? ""} /></div>
        <div className="sm:col-span-6 space-y-1.5"><Label htmlFor="notas">Notas</Label><Input id="notas" name="notas" defaultValue={p.notas ?? ""} /></div>
        <div className="sm:col-span-6 flex items-center justify-between gap-3 border-t border-border pt-4">
          <Button type="submit">Guardar cambios</Button>
        </div>
      </form>

      <div className="mt-6 flex justify-end">
        <form action={borrar}>
          <Button type="submit" variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" /> Eliminar rodapié
          </Button>
        </form>
      </div>
    </div>
  );
}
