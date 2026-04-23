import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  actualizarLinea,
  actualizarMetadatos,
  cambiarEstadoPresupuesto,
  crearLineaCustom,
  eliminarLinea,
  eliminarPresupuesto,
  emitirPresupuesto,
  regenerarLineas,
} from "../../proyectos/presupuestos-actions";
import { ToastFromSearchParams } from "../../catalogo/shared";
import { CATEGORIAS_LINEA, ESTADOS_PRESUPUESTO, formatEur, type EstadoPresupuesto, type Presupuesto, type PresupuestoLinea } from "@/lib/tipos/presupuestos";

export const dynamic = "force-dynamic";

const EST = Object.fromEntries(ESTADOS_PRESUPUESTO.map((e) => [e.value, e]));
const CAT_LBL = Object.fromEntries(CATEGORIAS_LINEA.map((c) => [c.value, c.label]));

export default async function DetallePresupuestoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await createClient();

  const { data: pres } = await s
    .from("presupuestos")
    .select("*, proyectos(id, nombre, clientes(nombre, nif, email, telefono))")
    .eq("id", id)
    .maybeSingle<Presupuesto & { proyectos: { id: string; nombre: string; clientes: { nombre: string; nif: string | null; email: string | null; telefono: string | null } | null } | null }>();
  if (!pres) notFound();

  const { data: lineas } = await s
    .from("presupuestos_lineas")
    .select("*")
    .eq("presupuesto_id", id)
    .order("orden")
    .returns<PresupuestoLinea[]>();

  const editable = pres.estado === "borrador";
  const metaAction = async (fd: FormData) => { "use server"; await actualizarMetadatos(id, fd); };
  const regen = async () => { "use server"; await regenerarLineas(id); };
  const emitir = async () => { "use server"; await emitirPresupuesto(id); };
  const delPres = async () => { "use server"; await eliminarPresupuesto(id); };
  const nuevaLinea = async (fd: FormData) => { "use server"; await crearLineaCustom(id, fd); };

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <nav className="text-sm space-x-2">
        <Link href="/app/presupuestos" className="text-zinc-500 hover:underline dark:text-zinc-400">Presupuestos</Link>
        {pres.proyectos ? (
          <>
            <span className="text-zinc-400">/</span>
            <Link href={`/app/proyectos/${pres.proyectos.id}`} className="text-zinc-500 hover:underline dark:text-zinc-400">
              {pres.proyectos.nombre}
            </Link>
          </>
        ) : null}
      </nav>

      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {pres.numero ?? "Presupuesto (borrador)"}
            </h1>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${EST[pres.estado]?.color ?? ""}`}>
              {EST[pres.estado]?.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {pres.proyectos?.clientes?.nombre ?? "—"}
            {pres.fecha_emision ? ` · Emitido ${new Date(pres.fecha_emision).toLocaleDateString("es-ES")}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/presupuestos/${id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium dark:border-zinc-700 dark:bg-zinc-950"
          >
            Descargar PDF
          </a>
          {editable ? (
            <>
              <form action={regen}><button type="submit" className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium dark:border-zinc-700 dark:bg-zinc-950">Regenerar desde proyecto</button></form>
              <form action={emitir}><button type="submit" className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">Emitir presupuesto</button></form>
            </>
          ) : null}
          {editable ? <form action={delPres}><button type="submit" className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 dark:border-red-900 dark:bg-zinc-950 dark:text-red-300">Eliminar</button></form> : null}
          {!editable ? (
            <ChangeEstadoButtons id={id} estado={pres.estado} />
          ) : null}
        </div>
      </div>

      {/* Totales */}
      <section className="mt-6 grid gap-4 sm:grid-cols-5 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <Big label="Subtotal" v={formatEur(Number(pres.subtotal_eur))} />
        <Big label="Descuento" v={`-${formatEur(Number(pres.descuento_eur))}`} />
        <Big label="Base" v={formatEur(Number(pres.base_imponible_eur))} />
        <Big label={`IVA ${pres.iva_pct}%`} v={formatEur(Number(pres.iva_eur))} />
        <Big label="Total" v={formatEur(Number(pres.total_eur))} highlight />
      </section>

      {/* Metadatos */}
      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-medium">Datos del presupuesto</h2>
        <form action={metaAction} className="grid gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Validez (días)</label>
            <select name="validez_dias" defaultValue={pres.validez_dias} disabled={!editable} className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950 disabled:opacity-60">
              <option value="15">15</option><option value="30">30</option><option value="60">60</option><option value="90">90</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Modo presentación</label>
            <select name="modo_presentacion" defaultValue={pres.modo_presentacion} disabled={!editable} className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950 disabled:opacity-60">
              <option value="detallado_modulo">Detallado</option>
              <option value="precio_cerrado">Precio cerrado</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Descuento global %</label>
            <input name="descuento_global_pct" type="number" step="0.01" min="0" max="100" defaultValue={pres.descuento_global_pct} disabled={!editable}
              className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950 disabled:opacity-60" />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">IVA %</label>
            <input name="iva_pct" type="number" step="0.01" min="0" max="100" defaultValue={pres.iva_pct} disabled={!editable}
              className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950 disabled:opacity-60" />
          </div>
          <div className="sm:col-span-4 space-y-1">
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Notas</label>
            <textarea name="notas" rows={2} defaultValue={pres.notas ?? ""} disabled={!editable}
              className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950 disabled:opacity-60" />
          </div>
          {editable ? (
            <div className="sm:col-span-4">
              <button type="submit" className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
                Guardar metadatos
              </button>
            </div>
          ) : null}
        </form>
      </section>

      {/* Líneas */}
      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-medium">Líneas ({lineas?.length ?? 0})</h2>
        <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-950/50 dark:text-zinc-400">
              <tr>
                <th className="px-3 py-2 font-medium">Categoría</th>
                <th className="px-3 py-2 font-medium">Descripción</th>
                <th className="px-3 py-2 font-medium">Cantidad</th>
                <th className="px-3 py-2 font-medium">Ud.</th>
                <th className="px-3 py-2 font-medium">Precio/ud</th>
                <th className="px-3 py-2 font-medium">Desc.</th>
                <th className="px-3 py-2 font-medium">Total</th>
                {editable ? <th className="px-3 py-2" /> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {(lineas ?? []).map((l) => {
                const upd = async (fd: FormData) => { "use server"; await actualizarLinea(id, l.id, fd); };
                const del = async () => { "use server"; await eliminarLinea(id, l.id); };
                return (
                  <tr key={l.id}>
                    <td className="px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400">{CAT_LBL[l.categoria] ?? l.categoria}</td>
                    {editable ? (
                      <td colSpan={5} className="px-3 py-2">
                        <form action={upd} className="grid gap-2 sm:grid-cols-5">
                          <input name="descripcion" defaultValue={l.descripcion} className="col-span-2 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950" />
                          <input name="cantidad" type="number" step="0.01" defaultValue={l.cantidad} className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950" />
                          <input name="precio_unitario_eur" type="number" step="0.01" defaultValue={l.precio_unitario_eur} className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950" />
                          <div className="flex items-center gap-1">
                            <input name="descuento_linea_pct" type="number" step="0.01" defaultValue={l.descuento_linea_pct} placeholder="%" className="w-16 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950" />
                            <button type="submit" className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
                              OK
                            </button>
                          </div>
                        </form>
                      </td>
                    ) : (
                      <>
                        <td className="px-3 py-2">{l.descripcion}</td>
                        <td className="px-3 py-2 font-mono text-xs">{Number(l.cantidad).toLocaleString("es-ES")}</td>
                        <td className="px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400">{l.unidad}</td>
                        <td className="px-3 py-2 font-mono text-xs">{formatEur(Number(l.precio_unitario_eur))}</td>
                        <td className="px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400">{Number(l.descuento_linea_pct) > 0 ? `${l.descuento_linea_pct}%` : "—"}</td>
                      </>
                    )}
                    <td className="px-3 py-2 font-mono text-sm font-medium">{formatEur(Number(l.total_linea_eur))}</td>
                    {editable ? (
                      <td className="px-3 py-2 text-right">
                        <form action={del}><button type="submit" className="text-xs text-red-700 hover:underline dark:text-red-300">×</button></form>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {editable ? (
          <form action={nuevaLinea} className="mt-4 grid gap-2 rounded-lg border border-dashed border-zinc-300 p-4 sm:grid-cols-6 dark:border-zinc-700">
            <select name="categoria" defaultValue="otro" className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950">
              {CATEGORIAS_LINEA.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <input name="descripcion" placeholder="Descripción" required className="sm:col-span-2 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950" />
            <input name="cantidad" type="number" step="0.01" placeholder="Cantidad" required className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950" />
            <select name="unidad" defaultValue="ud" className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950">
              <option value="ud">ud</option><option value="m2">m²</option><option value="ml">ml</option><option value="h">h</option><option value="global">global</option>
            </select>
            <div className="flex items-center gap-2">
              <input name="precio_unitario_eur" type="number" step="0.01" placeholder="€" required className="flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950" />
              <button type="submit" className="rounded-md bg-zinc-900 px-2 py-1.5 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">+</button>
            </div>
          </form>
        ) : null}
      </section>
    </div>
  );
}

function Big({ label, v, highlight = false }: { label: string; v: string; highlight?: boolean }) {
  return (
    <div className={highlight ? "rounded-lg bg-zinc-900 p-3 text-white dark:bg-zinc-100 dark:text-zinc-900" : ""}>
      <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={`mt-0.5 font-mono text-lg font-semibold ${highlight ? "text-white dark:text-zinc-900" : ""}`}>{v}</p>
    </div>
  );
}

function ChangeEstadoButtons({ id, estado }: { id: string; estado: EstadoPresupuesto }) {
  const aceptar = async () => { "use server"; await cambiarEstadoPresupuesto(id, "aceptado"); };
  const rechazar = async () => { "use server"; await cambiarEstadoPresupuesto(id, "rechazado"); };
  const caducar = async () => { "use server"; await cambiarEstadoPresupuesto(id, "caducado"); };
  if (estado === "enviado") {
    return (
      <>
        <form action={aceptar}><button type="submit" className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">Marcar aceptado</button></form>
        <form action={rechazar}><button type="submit" className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 dark:border-red-900 dark:bg-zinc-950 dark:text-red-300">Rechazado</button></form>
        <form action={caducar}><button type="submit" className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium dark:border-zinc-700 dark:bg-zinc-950">Caducado</button></form>
      </>
    );
  }
  return null;
}
