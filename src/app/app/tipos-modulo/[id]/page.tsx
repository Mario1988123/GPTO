import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Trash2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  actualizarTipo,
  alternarTipo,
  asociarHerraje,
  crearPieza,
  desasociarHerraje,
  eliminarPieza,
  eliminarTipo,
} from "../actions";
import { TipoModuloForm } from "../tipo-form";
import { PiezaForm } from "../pieza-form";
import {
  ActivoPill,
  CatalogoFormCard,
  ToastFromSearchParams,
  euros,
} from "../../catalogo/shared";
import {
  FUENTES_DIM,
  LADOS_CANTO,
  calcularDimension,
  type TipoModulo,
  type TipoModuloPieza,
} from "@/lib/tipos/tipos_modulo";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

type PiezaVista = TipoModuloPieza & {
  referencia_tablero: { grosor_mm: number } | null;
  canto: { nombre: string } | null;
};

void FUENTES_DIM;
const LADOS_LBL = Object.fromEntries(LADOS_CANTO.map((l) => [l.value, l.label]));

export default async function DetalleTipoModuloPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await createClient();

  const { data: tipo } = await s
    .from("tipos_modulo")
    .select("*, referencia_tablero_default:referencias_tablero!tipos_modulo_referencia_tablero_default_id_fkey(grosor_mm)")
    .eq("id", id)
    .maybeSingle<TipoModulo & { referencia_tablero_default: { grosor_mm: number } | null }>();
  if (!tipo) notFound();

  const [{ data: piezas }, { data: herrajesRel }, { data: refs }, { data: cantos }, { data: herrajesDisponibles }] = await Promise.all([
    s.from("tipo_modulo_piezas")
      .select("*, referencia_tablero:referencias_tablero(grosor_mm), canto:cantos(nombre)")
      .eq("tipo_modulo_id", id)
      .order("orden")
      .order("created_at")
      .returns<PiezaVista[]>(),
    s.from("tipo_modulo_herrajes")
      .select("id, cantidad, notas, herraje:herrajes(id, nombre, tipo, precio_unidad)")
      .eq("tipo_modulo_id", id)
      .order("created_at"),
    s.from("referencias_tablero")
      .select("id, grosor_mm, materiales(nombre), acabados(nombre)")
      .eq("activo", true)
      .order("grosor_mm"),
    s.from("cantos").select("id, nombre").eq("activo", true).order("nombre"),
    s.from("herrajes").select("id, nombre, tipo, precio_unidad").eq("activo", true).order("tipo").order("nombre"),
  ]);

  const refTablerosOpciones = (refs ?? []).map((r) => ({
    id: r.id as string,
    // @ts-expect-error relacion
    label: `${r.materiales?.nombre ?? "?"} · ${r.acabados?.nombre ?? "?"} · ${r.grosor_mm} mm`,
  }));
  const cantosOpciones = (cantos ?? []).map((c) => ({ id: c.id as string, label: c.nombre as string }));

  const updateTipo = async (fd: FormData) => { "use server"; await actualizarTipo(id, fd); };
  const toggleTipo = async () => { "use server"; await alternarTipo(id, !tipo.activo); };
  const delTipo = async () => { "use server"; await eliminarTipo(id); };
  const addPieza = async (fd: FormData) => { "use server"; await crearPieza(id, fd); };
  const addHerraje = async (fd: FormData) => { "use server"; await asociarHerraje(id, fd); };

  const grosorDefault = tipo.referencia_tablero_default?.grosor_mm ?? 16;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <Link href="/app/tipos-modulo" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Tipos de módulo
      </Link>
      <PageHeader eyebrow="Tipo de módulo" title={tipo.nombre} actions={<ActivoPill activo={tipo.activo} />} />

      {/* Datos generales */}
      <CatalogoFormCard>
        <div className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Configuración</p>
          <h2 className="mt-0.5 text-lg font-bold tracking-tight">Datos generales</h2>
        </div>
        {/* @ts-expect-error relacion supabase */}
        <TipoModuloForm tipo={tipo} referencias={refs ?? []} action={updateTipo} submitLabel="Guardar cambios" />
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-5">
          <form action={toggleTipo}>
            <Button type="submit" variant="outline" size="sm">
              {tipo.activo ? "Desactivar" : "Reactivar"}
            </Button>
          </form>
          <form action={delTipo}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar tipo
            </Button>
          </form>
        </div>
      </CatalogoFormCard>

      {/* Piezas */}
      <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Plantilla</p>
            <h2 className="mt-0.5 text-lg font-bold tracking-tight">Piezas</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Calculado con defaults: {tipo.ancho_default_mm}×{tipo.alto_default_mm}×{tipo.fondo_default_mm} mm · grosor {grosorDefault} mm
          </p>
        </div>

        {(piezas ?? []).length === 0 ? (
          <EmptyState
            title="Sin piezas"
            description="Añade la primera pieza usando el formulario de abajo."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pieza</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Largo</TableHead>
                  <TableHead>Ancho</TableHead>
                  <TableHead>Calculado</TableHead>
                  <TableHead>Canto</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(piezas ?? []).map((p) => {
                  const modulo = {
                    ancho_mm: tipo.ancho_default_mm,
                    alto_mm: tipo.alto_default_mm,
                    fondo_mm: tipo.fondo_default_mm,
                  };
                  const grosor = p.referencia_tablero?.grosor_mm ?? grosorDefault;
                  const largo = calcularDimension({
                    fuente: p.fuente_largo,
                    ajuste_mm: p.ajuste_largo_mm,
                    ajuste_grosores: p.ajuste_largo_grosores,
                    valor_fijo_mm: p.valor_largo_fijo_mm,
                    modulo, grosor_tablero_mm: grosor,
                  });
                  const ancho = calcularDimension({
                    fuente: p.fuente_ancho,
                    ajuste_mm: p.ajuste_ancho_mm,
                    ajuste_grosores: p.ajuste_ancho_grosores,
                    valor_fijo_mm: p.valor_ancho_fijo_mm,
                    modulo, grosor_tablero_mm: grosor,
                  });
                  const fLargo = describir(p.fuente_largo, p.ajuste_largo_mm, p.ajuste_largo_grosores, p.valor_largo_fijo_mm);
                  const fAncho = describir(p.fuente_ancho, p.ajuste_ancho_mm, p.ajuste_ancho_grosores, p.valor_ancho_fijo_mm);
                  const delPieza = async () => { "use server"; await eliminarPieza(id, p.id); };
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-semibold">{p.nombre}</TableCell>
                      <TableCell className="font-mono">{p.cantidad}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{fLargo}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{fAncho}</TableCell>
                      <TableCell className="font-mono text-xs">{largo} × {ancho} mm</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.canto?.nombre ? `${p.canto.nombre} · ${LADOS_LBL[p.lados_con_canto] ?? p.lados_con_canto}` : "—"}
                      </TableCell>
                      <TableCell>
                        <form action={delPieza}>
                          <Button
                            type="submit"
                            variant="ghost"
                            size="icon-xs"
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/20 p-4 sm:p-5">
          <h3 className="mb-3 text-sm font-bold tracking-tight">Añadir pieza</h3>
          <PiezaForm action={addPieza} refTableros={refTablerosOpciones} cantos={cantosOpciones} />
        </div>
      </section>

      {/* Herrajes */}
      <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Plantilla</p>
          <h2 className="mt-0.5 text-lg font-bold tracking-tight">Herrajes estándar</h2>
        </div>

        {(herrajesRel ?? []).length === 0 ? (
          <EmptyState title="Sin herrajes" description="Asocia los herrajes que lleva este tipo de módulo por defecto." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Herraje</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Coste unidad</TableHead>
                  <TableHead className="text-right">Coste total</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(herrajesRel ?? []).map((r) => {
                  // @ts-expect-error relacion
                  const nombre = r.herraje?.nombre ?? "?";
                  // @ts-expect-error relacion
                  const tipo = r.herraje?.tipo ?? "";
                  // @ts-expect-error relacion
                  const precio = Number(r.herraje?.precio_unidad ?? 0);
                  const total = precio * r.cantidad;
                  const delR = async () => { "use server"; await desasociarHerraje(id, r.id); };
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-semibold">{nombre}</TableCell>
                      <TableCell className="text-muted-foreground">{tipo}</TableCell>
                      <TableCell className="text-right font-mono">{r.cantidad}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{euros(precio)}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{euros(total)}</TableCell>
                      <TableCell>
                        <form action={delR}>
                          <Button
                            type="submit"
                            variant="ghost"
                            size="icon-xs"
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <form action={addHerraje} className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-border bg-muted/20 p-4">
          <div className="min-w-[240px] flex-1 space-y-1.5">
            <label htmlFor="herraje_id" className="block text-xs font-semibold text-muted-foreground">Herraje</label>
            <select
              id="herraje_id"
              name="herraje_id"
              required
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/15"
            >
              <option value="">— selecciona —</option>
              {(herrajesDisponibles ?? []).map((h) => (
                <option key={h.id} value={h.id}>
                  [{h.tipo}] {h.nombre} — {euros(Number(h.precio_unidad))}
                </option>
              ))}
            </select>
          </div>
          <div className="w-24 space-y-1.5">
            <label htmlFor="cantidad" className="block text-xs font-semibold text-muted-foreground">Cantidad</label>
            <input
              id="cantidad"
              name="cantidad"
              type="number"
              min="1"
              defaultValue="1"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-sm shadow-xs outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/15"
            />
          </div>
          <div className="min-w-[180px] flex-1 space-y-1.5">
            <label htmlFor="notas" className="block text-xs font-semibold text-muted-foreground">Notas</label>
            <input
              id="notas"
              name="notas"
              type="text"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/15"
            />
          </div>
          <Button type="submit">
            <Plus className="h-4 w-4" />
            Añadir
          </Button>
        </form>
      </section>
    </div>
  );
}

function describir(
  fuente: string,
  ajusteMm: number,
  ajusteGrosores: number,
  valorFijo: number | null,
) {
  if (fuente === "fijo") return `${valorFijo ?? "?"} mm`;
  const base = fuente;
  const parts: string[] = [base];
  if (ajusteMm !== 0) parts.push(`${ajusteMm > 0 ? "+" : ""}${ajusteMm} mm`);
  if (ajusteGrosores !== 0) parts.push(`${ajusteGrosores > 0 ? "+" : ""}${ajusteGrosores}·grosor`);
  return parts.join(" ");
}
