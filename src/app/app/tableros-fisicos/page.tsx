import { Suspense } from "react";
import { Layers, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ToastFromSearchParams } from "../catalogo/shared";
import { crearTableroFisico, eliminarTableroFisico, actualizarTableroFisico } from "../almacenes/actions";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

type Tab = {
  id: string;
  descripcion: string | null;
  material_tipo: string | null;
  grosor_mm: number | null;
  ancho_mm: number;
  alto_mm: number;
  estado: string;
  coste_eur: number | null;
  notas: string | null;
  proveedor_id: string | null;
  almacenes: { nombre: string } | null;
  furgonetas: { nombre: string } | null;
  proveedores: { id: string; nombre: string } | null;
};

const ESTADO_COLOR: Record<string, string> = {
  entero:    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  en_corte:  "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  consumido: "bg-zinc-500/10 text-zinc-600",
  recorte:   "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  dañado:    "bg-red-500/10 text-red-700 dark:text-red-400",
  devuelto:  "bg-violet-500/10 text-violet-700 dark:text-violet-400",
};
const ESTADOS = ["entero", "en_corte", "consumido", "recorte", "dañado", "devuelto"];
const GROSORES_PREDEFINIDOS = [10, 16, 19, 22, 25, 30];
const MATERIALES_FALLBACK = [
  "aglomerado", "aglomerado_hidrofugo", "dm", "mdf_hidrofugo",
  "contrachapado", "madera_natural", "chapa_natural", "melamina",
  "hpl", "polyboard", "contrachapado_marino", "listones",
];

export default async function TablerosFisicosPage() {
  const s = await createClient();
  const [{ data: tableros }, { data: proveedores }, { data: almacenes }, { data: tiposMaterial }] = await Promise.all([
    s.from("tableros_fisicos")
      .select(`id, descripcion, material_tipo, grosor_mm, ancho_mm, alto_mm, estado, coste_eur, notas, proveedor_id,
        almacenes:ubicacion_almacen_id(nombre),
        furgonetas:ubicacion_furgoneta_id(nombre),
        proveedores:proveedor_id(id, nombre)`)
      .order("estado")
      .order("created_at", { ascending: false })
      .returns<Tab[]>(),
    s.from("proveedores").select("id, nombre").eq("activo", true).order("nombre"),
    s.from("almacenes").select("id, nombre").eq("activo", true).order("nombre"),
    s.from("tipos_material_tablero").select("slug, nombre").order("nombre"),
  ]);

  const tipos = (tiposMaterial && tiposMaterial.length > 0)
    ? tiposMaterial.map((t) => ({ slug: t.slug as string, nombre: t.nombre as string }))
    : MATERIALES_FALLBACK.map((slug) => ({ slug, nombre: slug }));

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <PageHeader
        eyebrow="Stock"
        title="Tableros físicos"
        description="Tableros enteros que has comprado y aún no has cortado. Trazabilidad individual."
      />

      {/* Datalists compartidos para todos los formularios de la página */}
      <datalist id="material-tipos-list">
        {tipos.map((t) => <option key={t.slug} value={t.slug}>{t.nombre}</option>)}
      </datalist>
      <datalist id="grosores-list">
        {GROSORES_PREDEFINIDOS.map((g) => <option key={g} value={g} />)}
      </datalist>

      {/* Form alta */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Añadir tablero(s)</p>
        <form action={crearTableroFisico} className="grid gap-3 sm:grid-cols-6">
          <div className="space-y-1.5 sm:col-span-3">
            <Label htmlFor="descripcion">Descripción</Label>
            <Input id="descripcion" name="descripcion" placeholder="Roble Egger H1146 ST15 / Stock taller / Restos cocina Sánchez" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="material_tipo">Material</Label>
            <Input id="material_tipo" name="material_tipo" list="material-tipos-list" placeholder="aglomerado, dm, madera natural..." />
            <p className="text-[10px] text-muted-foreground">Predefinidos en la lista o escribe el tuyo.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="grosor_mm">Grosor (mm)</Label>
            <Input id="grosor_mm" name="grosor_mm" type="number" list="grosores-list" placeholder="16" />
            <p className="text-[10px] text-muted-foreground">10 / 16 / 19 comunes. Cualquier valor admitido.</p>
          </div>

          <div className="space-y-1.5"><Label htmlFor="ancho_mm">Ancho (mm)</Label><Input id="ancho_mm" name="ancho_mm" type="number" defaultValue={2440} /></div>
          <div className="space-y-1.5"><Label htmlFor="alto_mm">Alto (mm)</Label><Input id="alto_mm" name="alto_mm" type="number" defaultValue={1220} /></div>
          <div className="space-y-1.5"><Label htmlFor="cantidad">Unidades</Label><Input id="cantidad" name="cantidad" type="number" defaultValue={1} min={1} /></div>
          <div className="space-y-1.5"><Label htmlFor="coste_eur">Coste / ud (€)</Label><Input id="coste_eur" name="coste_eur" type="number" step="0.01" /></div>

          <div className="space-y-1.5 sm:col-span-3">
            <Label htmlFor="proveedor_id">Proveedor (existente)</Label>
            <select id="proveedor_id" name="proveedor_id" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">— elegir o crear uno nuevo abajo —</option>
              {(proveedores ?? []).map((p) => <option key={p.id as string} value={p.id as string}>{p.nombre as string}</option>)}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-3">
            <Label htmlFor="proveedor_nuevo">Crear proveedor nuevo</Label>
            <Input id="proveedor_nuevo" name="proveedor_nuevo" placeholder="Nombre del proveedor (se crea al guardar)" />
            <p className="text-[10px] text-muted-foreground">Solo si no está en la lista de arriba.</p>
          </div>

          <div className="space-y-1.5 sm:col-span-6">
            <Label htmlFor="almacen_id">Almacén</Label>
            <select id="almacen_id" name="almacen_id" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">—</option>
              {(almacenes ?? []).map((a) => <option key={a.id as string} value={a.id as string}>{a.nombre as string}</option>)}
            </select>
          </div>

          <div className="space-y-1.5 sm:col-span-6">
            <Label htmlFor="notas">Notas</Label>
            <Input id="notas" name="notas" />
          </div>
          <div className="sm:col-span-6"><Button type="submit"><Plus className="h-4 w-4" /> Añadir tablero(s)</Button></div>
        </form>
      </section>

      {/* Listado */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {!tableros || tableros.length === 0 ? (
          <div className="p-6"><EmptyState icon={Layers} title="Sin tableros físicos" description="Añade los tableros enteros que tengas." /></div>
        ) : (
          <ul className="divide-y divide-border">
            {tableros.map((t) => {
              const borrar = async () => { "use server"; await eliminarTableroFisico(t.id); };
              const update = async (fd: FormData) => { "use server"; await actualizarTableroFisico(t.id, fd); };
              const desc = t.descripcion ?? "Sin descripción";
              const grosor = t.grosor_mm ?? null;
              return (
                <li key={t.id} className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Badge className={`${ESTADO_COLOR[t.estado] ?? ""} border-0`}>{t.estado}</Badge>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{desc}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {t.material_tipo ? `${t.material_tipo} · ` : ""}
                        {grosor ? `${grosor}mm · ` : ""}
                        {t.ancho_mm}×{t.alto_mm} mm
                        {t.almacenes ? ` · ${t.almacenes.nombre}` : ""}
                        {t.furgonetas ? ` · ${t.furgonetas.nombre}` : ""}
                        {t.proveedores ? ` · ${t.proveedores.nombre}` : ""}
                      </p>
                      {t.notas && <p className="text-[11px] italic text-muted-foreground">{t.notas}</p>}
                    </div>
                    {t.coste_eur != null && <span className="font-mono text-sm">{Number(t.coste_eur).toFixed(2)} €</span>}
                    <form action={borrar}><Button type="submit" variant="ghost" size="sm" className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button></form>
                  </div>

                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Editar</summary>
                    <form action={update} className="mt-3 grid gap-2 sm:grid-cols-6">
                      <div className="sm:col-span-3 space-y-1"><Label>Descripción</Label><Input name="descripcion" defaultValue={t.descripcion ?? ""} /></div>
                      <div className="sm:col-span-2 space-y-1">
                        <Label>Material</Label>
                        <Input name="material_tipo" list="material-tipos-list" defaultValue={t.material_tipo ?? ""} />
                      </div>
                      <div className="space-y-1"><Label>Grosor (mm)</Label><Input name="grosor_mm" type="number" list="grosores-list" defaultValue={t.grosor_mm ?? ""} /></div>
                      <div className="space-y-1"><Label>Ancho (mm)</Label><Input name="ancho_mm" type="number" defaultValue={t.ancho_mm} /></div>
                      <div className="space-y-1"><Label>Alto (mm)</Label><Input name="alto_mm" type="number" defaultValue={t.alto_mm} /></div>
                      <div className="space-y-1"><Label>Coste €</Label><Input name="coste_eur" type="number" step="0.01" defaultValue={t.coste_eur ?? ""} /></div>
                      <div className="space-y-1"><Label>Estado</Label>
                        <select name="estado" defaultValue={t.estado} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                          {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
                        </select>
                      </div>
                      <div className="sm:col-span-3 space-y-1">
                        <Label>Proveedor</Label>
                        <select name="proveedor_id" defaultValue={t.proveedor_id ?? ""} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                          <option value="">— sin proveedor —</option>
                          {(proveedores ?? []).map((p) => <option key={p.id as string} value={p.id as string}>{p.nombre as string}</option>)}
                        </select>
                      </div>
                      <div className="sm:col-span-3 space-y-1"><Label>O crear nuevo proveedor</Label><Input name="proveedor_nuevo" placeholder="Nombre nuevo proveedor" /></div>
                      <div className="sm:col-span-6 space-y-1"><Label>Notas</Label><Input name="notas" defaultValue={t.notas ?? ""} /></div>
                      <div className="sm:col-span-6"><Button type="submit" size="sm">Guardar cambios</Button></div>
                    </form>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
