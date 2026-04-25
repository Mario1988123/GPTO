import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, Plus, DoorOpen, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ToastFromSearchParams, euros } from "../shared";
import { crearPuertaPaso, eliminarPuertaPaso } from "../productos-actions";
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
  tipo_apertura: string;
  ancho_mm: number;
  alto_mm: number;
  grosor_muro_mm: number;
  lleva_tapeta: boolean;
  ancho_tapeta_mm: number | null;
  material_cajon: string;
  precio_pvp_eur: number;
  foto_url: string | null;
  proveedor_id: string | null;
  proveedores: { nombre: string } | null;
};

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

export default async function PuertasPasoPage() {
  const s = await createClient();
  const [{ data }, { data: proveedores }] = await Promise.all([
    s
      .from("puertas_paso_catalogo")
      .select("id, nombre, tipo_apertura, ancho_mm, alto_mm, grosor_muro_mm, lleva_tapeta, ancho_tapeta_mm, material_cajon, precio_pvp_eur, foto_url, proveedor_id, proveedores(nombre)")
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
        title="Puertas de paso"
        description="Correderas, abatibles, invisibles... con variantes de tapeta y grosor de muro."
      />

      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <form action={crearPuertaPaso} className="grid gap-3 sm:grid-cols-6">
          <div className="sm:col-span-3 space-y-1.5"><Label htmlFor="nombre">Nombre *</Label><Input id="nombre" name="nombre" required placeholder="Puerta corredera 82.5 pladur" /></div>
          <div className="space-y-1.5">
            <Label htmlFor="tipo_apertura">Tipo</Label>
            <select id="tipo_apertura" name="tipo_apertura" defaultValue="abatible" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="material_cajon">Muro</Label>
            <select id="material_cajon" name="material_cajon" defaultValue="pladur" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              {MATERIALES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="ancho_mm">Ancho (mm)</Label><Input id="ancho_mm" name="ancho_mm" type="number" defaultValue={725} /></div>
          <div className="space-y-1.5"><Label htmlFor="alto_mm">Alto (mm)</Label><Input id="alto_mm" name="alto_mm" type="number" defaultValue={2030} /></div>
          <div className="space-y-1.5"><Label htmlFor="grosor_hoja_mm">Grosor hoja</Label><Input id="grosor_hoja_mm" name="grosor_hoja_mm" type="number" defaultValue={40} /></div>
          <div className="space-y-1.5"><Label htmlFor="grosor_muro_mm">Grosor muro</Label><Input id="grosor_muro_mm" name="grosor_muro_mm" type="number" defaultValue={100} /></div>
          <div className="space-y-1.5"><Label htmlFor="ancho_tapeta_mm">Tapeta (mm, vacío = sin)</Label><Input id="ancho_tapeta_mm" name="ancho_tapeta_mm" type="number" placeholder="p.ej. 70, 90, 100" /></div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="lleva_tapeta" defaultChecked /> Con tapeta</label>
          </div>
          <div className="space-y-1.5"><Label htmlFor="acabado">Acabado</Label><Input id="acabado" name="acabado" placeholder="Lacado blanco" /></div>
          <div className="space-y-1.5"><Label htmlFor="color">Color</Label><Input id="color" name="color" placeholder="Blanco 9010" /></div>
          <div className="space-y-1.5">
            <Label htmlFor="proveedor_id">Proveedor</Label>
            <select id="proveedor_id" name="proveedor_id" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">— sin proveedor —</option>
              {(proveedores ?? []).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="referencia_proveedor">Ref. proveedor</Label><Input id="referencia_proveedor" name="referencia_proveedor" /></div>
          <div className="space-y-1.5"><Label htmlFor="precio_coste_eur">Coste €</Label><Input id="precio_coste_eur" name="precio_coste_eur" type="number" step="0.01" /></div>
          <div className="space-y-1.5"><Label htmlFor="precio_pvp_eur">PVP €</Label><Input id="precio_pvp_eur" name="precio_pvp_eur" type="number" step="0.01" /></div>
          <div className="sm:col-span-6 space-y-1.5"><Label htmlFor="foto_url">URL fotografía</Label><Input id="foto_url" name="foto_url" placeholder="https://…" /></div>
          <div className="sm:col-span-6">
            <Button type="submit"><Plus className="h-4 w-4" /> Añadir puerta</Button>
          </div>
        </form>
      </section>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {!data || data.length === 0 ? (
          <div className="p-6"><EmptyState icon={DoorOpen} title="Sin puertas en catálogo" description="Crea la primera arriba." /></div>
        ) : (
          <ul className="divide-y divide-border">
            {data.map((p) => {
              const borrar = async () => { "use server"; await eliminarPuertaPaso(p.id); };
              return (
                <li key={p.id} className="flex items-center gap-4 px-4 py-3 transition hover:bg-muted/30">
                  <DoorOpen className="h-5 w-5 text-amber-600" />
                  <Link href={`/app/catalogo/puertas-paso/${p.id}`} className="flex flex-1 min-w-0 items-center gap-3">
                    {p.foto_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.foto_url} alt={p.nombre} className="h-10 w-10 shrink-0 rounded-md object-cover ring-1 ring-border" />
                    ) : null}
                    <div className="min-w-0">
                      <p className="font-semibold">{p.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {TIPOS.find((t) => t.v === p.tipo_apertura)?.l ?? p.tipo_apertura} · {p.ancho_mm}×{p.alto_mm} · muro {p.grosor_muro_mm}mm · {p.material_cajon}
                        {p.lleva_tapeta ? ` · tapeta ${p.ancho_tapeta_mm ?? "?"}mm` : " · sin tapeta"}
                        {p.proveedores?.nombre ? ` · ${p.proveedores.nombre}` : ""}
                      </p>
                    </div>
                  </Link>
                  <Badge variant="secondary" className="font-mono">{euros(p.precio_pvp_eur)}</Badge>
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
