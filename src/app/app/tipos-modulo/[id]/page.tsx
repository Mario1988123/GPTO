import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
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
import { ActivoPill, ToastFromSearchParams, euros } from "../../catalogo/shared";
import {
  FUENTES_DIM,
  LADOS_CANTO,
  calcularDimension,
  type TipoModulo,
  type TipoModuloPieza,
} from "@/lib/tipos/tipos_modulo";

export const dynamic = "force-dynamic";

type PiezaVista = TipoModuloPieza & {
  referencia_tablero: { grosor_mm: number } | null;
  canto: { nombre: string } | null;
};

const FUENTE_LBL = Object.fromEntries(FUENTES_DIM.map((f) => [f.value, f.label]));
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

  // --- server actions bound al id ---
  const updateTipo = async (fd: FormData) => { "use server"; await actualizarTipo(id, fd); };
  const toggleTipo = async () => { "use server"; await alternarTipo(id, !tipo.activo); };
  const delTipo = async () => { "use server"; await eliminarTipo(id); };
  const addPieza = async (fd: FormData) => { "use server"; await crearPieza(id, fd); };
  const addHerraje = async (fd: FormData) => { "use server"; await asociarHerraje(id, fd); };

  // --- calcular dimensiones de cada pieza con los defaults del tipo ---
  const grosorDefault = tipo.referencia_tablero_default?.grosor_mm ?? 16;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <nav className="text-sm"><Link href="/app/tipos-modulo" className="text-zinc-500 hover:underline dark:text-zinc-400">← Tipos de módulo</Link></nav>

      <div className="mt-2 flex items-baseline justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">{tipo.nombre}</h1>
        <ActivoPill activo={tipo.activo} />
      </div>

      {/* Sección 1: datos generales */}
      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">Datos generales</h2>
        {/* @ts-expect-error relacion supabase */}
        <TipoModuloForm tipo={tipo} referencias={refs ?? []} action={updateTipo} submitLabel="Guardar cambios" />
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <form action={toggleTipo}>
            <button type="submit" className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium dark:border-zinc-700 dark:bg-zinc-950">
              {tipo.activo ? "Desactivar" : "Reactivar"}
            </button>
          </form>
          <form action={delTipo}>
            <button type="submit" className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-zinc-950 dark:text-red-300">
              Eliminar tipo
            </button>
          </form>
        </div>
      </section>

      {/* Sección 2: piezas */}
      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Piezas</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Dimensiones calculadas con defaults del tipo ({tipo.ancho_default_mm}×{tipo.alto_default_mm}×{tipo.fondo_default_mm} mm, grosor tablero {grosorDefault} mm).
          </p>
        </div>

        {(piezas ?? []).length === 0 ? (
          <p className="rounded-md bg-zinc-50 p-4 text-sm text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
            Aún no hay piezas. Añade la primera abajo.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-950/50 dark:text-zinc-400">
                <tr>
                  <th className="px-3 py-2 font-medium">Pieza</th>
                  <th className="px-3 py-2 font-medium">Cantidad</th>
                  <th className="px-3 py-2 font-medium">Fórmula largo</th>
                  <th className="px-3 py-2 font-medium">Fórmula ancho</th>
                  <th className="px-3 py-2 font-medium">Calculado</th>
                  <th className="px-3 py-2 font-medium">Canto</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
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
                    <tr key={p.id}>
                      <td className="px-3 py-2 font-medium">{p.nombre}</td>
                      <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{p.cantidad}</td>
                      <td className="px-3 py-2 font-mono text-xs text-zinc-600 dark:text-zinc-400">{fLargo}</td>
                      <td className="px-3 py-2 font-mono text-xs text-zinc-600 dark:text-zinc-400">{fAncho}</td>
                      <td className="px-3 py-2 font-mono text-xs">{largo} × {ancho} mm</td>
                      <td className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400">
                        {p.canto?.nombre ? `${p.canto.nombre} · ${LADOS_LBL[p.lados_con_canto] ?? p.lados_con_canto}` : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <form action={delPieza}>
                          <button type="submit" className="text-xs text-red-700 hover:underline dark:text-red-300">Eliminar</button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4">
          <h3 className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">Añadir pieza</h3>
          <PiezaForm action={addPieza} refTableros={refTablerosOpciones} cantos={cantosOpciones} />
        </div>
      </section>

      {/* Sección 3: herrajes */}
      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">Herrajes estándar</h2>

        {(herrajesRel ?? []).length === 0 ? (
          <p className="rounded-md bg-zinc-50 p-4 text-sm text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
            Ningún herraje asociado aún.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-950/50 dark:text-zinc-400">
                <tr>
                  <th className="px-3 py-2 font-medium">Herraje</th>
                  <th className="px-3 py-2 font-medium">Tipo</th>
                  <th className="px-3 py-2 font-medium">Cantidad</th>
                  <th className="px-3 py-2 font-medium">Coste unidad</th>
                  <th className="px-3 py-2 font-medium">Coste total</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
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
                    <tr key={r.id}>
                      <td className="px-3 py-2 font-medium">{nombre}</td>
                      <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{tipo}</td>
                      <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{r.cantidad}</td>
                      <td className="px-3 py-2 font-mono text-xs">{euros(precio)}</td>
                      <td className="px-3 py-2 font-mono text-xs">{euros(total)}</td>
                      <td className="px-3 py-2 text-right">
                        <form action={delR}>
                          <button type="submit" className="text-xs text-red-700 hover:underline dark:text-red-300">Quitar</button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <form action={addHerraje} className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
          <div className="flex-1 min-w-[220px] space-y-1">
            <label htmlFor="herraje_id" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Herraje</label>
            <select id="herraje_id" name="herraje_id" required className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950">
              <option value="">— selecciona —</option>
              {(herrajesDisponibles ?? []).map((h) => (
                <option key={h.id} value={h.id}>
                  [{h.tipo}] {h.nombre} — {euros(Number(h.precio_unidad))}
                </option>
              ))}
            </select>
          </div>
          <div className="w-24 space-y-1">
            <label htmlFor="cantidad" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Cantidad</label>
            <input id="cantidad" name="cantidad" type="number" min="1" defaultValue="1" className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
          <div className="flex-1 min-w-[180px] space-y-1">
            <label htmlFor="notas" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Notas</label>
            <input id="notas" name="notas" type="text" className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
          <button type="submit" className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
            Añadir herraje
          </button>
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
