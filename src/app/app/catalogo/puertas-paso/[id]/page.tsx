import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { actualizarPuertaPaso, eliminarPuertaPaso } from "../../productos-actions";
import { ToastFromSearchParams } from "../../shared";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

const TIPOS = [
  { v: "abatible", l: "Abatible" },
  { v: "corredera_vista", l: "Corredera a la vista" },
  { v: "corredera_cajon", l: "Corredera en cajón" },
  { v: "pivotante", l: "Pivotante" },
  { v: "vaiven", l: "Vaivén" },
  { v: "plegable", l: "Plegable" },
  { v: "invisible", l: "Invisible / enrasada" },
  { v: "doble_hoja", l: "Doble hoja" },
];
const MATERIALES = [
  { v: "pladur", l: "Pladur" },
  { v: "obra", l: "Obra" },
  { v: "madera", l: "Madera" },
  { v: "metal", l: "Metal" },
];

type Puerta = {
  id: string;
  nombre: string;
  tipo_apertura: string;
  ancho_mm: number;
  alto_mm: number;
  grosor_hoja_mm: number;
  grosor_muro_mm: number;
  material_cajon: string;
  lleva_tapeta: boolean;
  ancho_tapeta_mm: number | null;
  acabado: string | null;
  color: string | null;
  proveedor_id: string | null;
  referencia_proveedor: string | null;
  precio_coste_eur: number;
  precio_pvp_eur: number;
  foto_url: string | null;
  notas: string | null;
};

export default async function EditarPuertaPasoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await createClient();
  const [{ data: p }, { data: proveedores }] = await Promise.all([
    s.from("puertas_paso_catalogo").select("*").eq("id", id).maybeSingle<Puerta>(),
    s.from("proveedores").select("id, nombre").eq("activo", true).order("nombre"),
  ]);
  if (!p) notFound();

  const update = async (fd: FormData) => { "use server"; await actualizarPuertaPaso(id, fd); };
  const borrar = async () => { "use server"; await eliminarPuertaPaso(id); };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <Link href="/app/catalogo/puertas-paso" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Puertas de paso
      </Link>
      <PageHeader eyebrow="Puerta de paso" title={p.nombre} />

      {p.foto_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.foto_url} alt={p.nombre} className="mt-6 h-48 w-full rounded-2xl object-cover ring-1 ring-border" />
      )}

      <form action={update} className="mt-8 grid gap-3 rounded-2xl border border-border bg-card p-6 shadow-sm sm:grid-cols-6 sm:p-8">
        <div className="sm:col-span-3 space-y-1.5"><Label htmlFor="nombre">Nombre *</Label><Input id="nombre" name="nombre" required defaultValue={p.nombre} /></div>
        <div className="space-y-1.5">
          <Label htmlFor="tipo_apertura">Tipo</Label>
          <select id="tipo_apertura" name="tipo_apertura" defaultValue={p.tipo_apertura} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
            {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="material_cajon">Muro</Label>
          <select id="material_cajon" name="material_cajon" defaultValue={p.material_cajon} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
            {MATERIALES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
        </div>
        <div className="space-y-1.5"><Label htmlFor="ancho_mm">Ancho (mm)</Label><Input id="ancho_mm" name="ancho_mm" type="number" defaultValue={p.ancho_mm} /></div>
        <div className="space-y-1.5"><Label htmlFor="alto_mm">Alto (mm)</Label><Input id="alto_mm" name="alto_mm" type="number" defaultValue={p.alto_mm} /></div>
        <div className="space-y-1.5"><Label htmlFor="grosor_hoja_mm">Grosor hoja</Label><Input id="grosor_hoja_mm" name="grosor_hoja_mm" type="number" defaultValue={p.grosor_hoja_mm} /></div>
        <div className="space-y-1.5"><Label htmlFor="grosor_muro_mm">Grosor muro</Label><Input id="grosor_muro_mm" name="grosor_muro_mm" type="number" defaultValue={p.grosor_muro_mm} /></div>
        <div className="space-y-1.5"><Label htmlFor="ancho_tapeta_mm">Tapeta (mm, vacío = sin)</Label><Input id="ancho_tapeta_mm" name="ancho_tapeta_mm" type="number" defaultValue={p.ancho_tapeta_mm ?? ""} /></div>
        <div className="flex items-end gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="lleva_tapeta" defaultChecked={p.lleva_tapeta} /> Con tapeta
          </label>
        </div>
        <div className="space-y-1.5"><Label htmlFor="acabado">Acabado</Label><Input id="acabado" name="acabado" defaultValue={p.acabado ?? ""} /></div>
        <div className="space-y-1.5"><Label htmlFor="color">Color</Label><Input id="color" name="color" defaultValue={p.color ?? ""} /></div>
        <div className="space-y-1.5">
          <Label htmlFor="proveedor_id">Proveedor</Label>
          <select id="proveedor_id" name="proveedor_id" defaultValue={p.proveedor_id ?? ""} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="">— sin proveedor —</option>
            {(proveedores ?? []).map((pr) => <option key={pr.id as string} value={pr.id as string}>{pr.nombre as string}</option>)}
          </select>
        </div>
        <div className="space-y-1.5"><Label htmlFor="referencia_proveedor">Ref. proveedor</Label><Input id="referencia_proveedor" name="referencia_proveedor" defaultValue={p.referencia_proveedor ?? ""} /></div>
        <div className="space-y-1.5"><Label htmlFor="precio_coste_eur">Coste €</Label><Input id="precio_coste_eur" name="precio_coste_eur" type="number" step="0.01" defaultValue={p.precio_coste_eur} /></div>
        <div className="space-y-1.5"><Label htmlFor="precio_pvp_eur">PVP €</Label><Input id="precio_pvp_eur" name="precio_pvp_eur" type="number" step="0.01" defaultValue={p.precio_pvp_eur} /></div>
        <div className="sm:col-span-6 space-y-1.5"><Label htmlFor="foto_url">URL fotografía</Label><Input id="foto_url" name="foto_url" placeholder="https://…" defaultValue={p.foto_url ?? ""} /></div>
        <div className="sm:col-span-6 space-y-1.5"><Label htmlFor="notas">Notas</Label><Input id="notas" name="notas" defaultValue={p.notas ?? ""} /></div>
        <div className="sm:col-span-6 flex items-center justify-between gap-3 border-t border-border pt-4">
          <Button type="submit">Guardar cambios</Button>
        </div>
      </form>

      <div className="mt-6 flex justify-end">
        <form action={borrar}>
          <Button type="submit" variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" /> Eliminar puerta
          </Button>
        </form>
      </div>
    </div>
  );
}
