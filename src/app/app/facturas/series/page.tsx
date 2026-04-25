import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ToastFromSearchParams } from "../../catalogo/shared";
import { crearSerie } from "../actions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

export default async function SeriesFacturacionPage() {
  const s = await createClient();
  const { data: series } = await s
    .from("series_facturacion")
    .select("id, codigo, nombre, prefijo, siguiente_num, es_rectificativa, activo")
    .order("codigo");

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <Link href="/app/facturas" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Facturas
      </Link>
      <PageHeader
        eyebrow="Facturación"
        title="Series de facturación"
        description="Cada serie tiene su numeración correlativa propia. Lo habitual: una serie principal (p.ej. F2026) y otra para rectificativas (R2026)."
      />

      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <form action={crearSerie} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="codigo">Código *</Label><Input id="codigo" name="codigo" placeholder="F2026" required /></div>
          <div className="space-y-1.5"><Label htmlFor="nombre">Nombre *</Label><Input id="nombre" name="nombre" placeholder="Serie principal 2026" required /></div>
          <div className="space-y-1.5"><Label htmlFor="prefijo">Prefijo</Label><Input id="prefijo" name="prefijo" placeholder="F2026/" /></div>
          <div className="space-y-1.5"><Label htmlFor="siguiente_num">Siguiente número</Label><Input id="siguiente_num" name="siguiente_num" type="number" defaultValue={1} min={1} /></div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="es_rectificativa" />
            Esta serie es para facturas rectificativas
          </label>
          <div className="sm:col-span-2"><Button type="submit"><Plus className="h-4 w-4" /> Crear serie</Button></div>
        </form>
      </section>

      <ul className="mt-6 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {(series ?? []).length === 0 ? (
          <li className="p-5 text-sm text-muted-foreground">Sin series configuradas. Crea la primera arriba.</li>
        ) : (
          (series ?? []).map((sf) => (
            <li key={sf.id as string} className="flex items-center gap-4 p-4">
              <div className="flex-1">
                <p className="font-mono font-semibold">{sf.codigo as string} <span className="text-xs text-muted-foreground">— {sf.nombre as string}</span></p>
                <p className="text-xs text-muted-foreground">
                  Prefijo: <code className="rounded bg-muted px-1">{(sf.prefijo as string) || "(vacío)"}</code> · siguiente nº {sf.siguiente_num as number}
                  {sf.es_rectificativa ? " · rectificativa" : ""}
                </p>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
