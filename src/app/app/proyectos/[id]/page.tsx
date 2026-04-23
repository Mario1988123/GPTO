import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  actualizarProyecto,
  crearArmario,
  eliminarArmario,
  eliminarProyecto,
} from "../actions";
import { ProyectoForm } from "../proyecto-form";
import { ToastFromSearchParams } from "../../catalogo/shared";
import { ESTADOS_PROYECTO, type Armario, type Proyecto } from "@/lib/tipos/proyectos";

export const dynamic = "force-dynamic";

const LBL = Object.fromEntries(ESTADOS_PROYECTO.map((e) => [e.value, e]));

export default async function DetalleProyectoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await createClient();

  const { data: proyecto } = await s.from("proyectos").select("*").eq("id", id).maybeSingle<Proyecto>();
  if (!proyecto) notFound();

  const [{ data: clientes }, { data: armarios }] = await Promise.all([
    s.from("clientes").select("id, nombre").eq("activo", true).order("nombre"),
    s.from("armarios").select("*").eq("proyecto_id", id).order("orden").returns<Armario[]>(),
  ]);

  const update = async (fd: FormData) => { "use server"; await actualizarProyecto(id, fd); };
  const del = async () => { "use server"; await eliminarProyecto(id); };
  const addArm = async (fd: FormData) => { "use server"; await crearArmario(id, fd); };

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <nav className="text-sm"><Link href="/app/proyectos" className="text-zinc-500 hover:underline dark:text-zinc-400">← Proyectos</Link></nav>

      <div className="mt-2 flex items-baseline justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">{proyecto.nombre}</h1>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${LBL[proyecto.estado]?.color ?? ""}`}>
          {LBL[proyecto.estado]?.label}
        </span>
      </div>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">Datos</h2>
        <ProyectoForm proyecto={proyecto} clientes={clientes ?? []} action={update} submitLabel="Guardar cambios" />
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <form action={del}>
            <button type="submit" className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-zinc-950 dark:text-red-300">
              Eliminar proyecto
            </button>
          </form>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Armarios ({armarios?.length ?? 0})</h2>
        </div>

        {(armarios ?? []).length === 0 ? (
          <p className="rounded-md bg-zinc-50 p-4 text-sm text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
            Este proyecto aún no tiene armarios. Añade el primero abajo.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-950/50 dark:text-zinc-400">
                <tr>
                  <th className="px-3 py-2 font-medium">Nombre</th>
                  <th className="px-3 py-2 font-medium">Dimensiones hueco (mm)</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {(armarios ?? []).map((a) => {
                  const delA = async () => { "use server"; await eliminarArmario(id, a.id); };
                  return (
                    <tr key={a.id}>
                      <td className="px-3 py-2">
                        <Link href={`/app/proyectos/${id}/armarios/${a.id}`} className="font-medium hover:underline">
                          {a.nombre}
                        </Link>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                        {a.ancho_total_mm} × {a.alto_total_mm} × {a.fondo_mm}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <form action={delA}>
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

        <form action={addArm} className="mt-4 grid gap-3 rounded-lg border border-dashed border-zinc-300 p-4 sm:grid-cols-5 dark:border-zinc-700">
          <div className="sm:col-span-2 space-y-1">
            <label htmlFor="nombre" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Nombre</label>
            <input id="nombre" name="nombre" defaultValue="Armario" className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
          <div className="space-y-1">
            <label htmlFor="ancho_total_mm" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Ancho (mm) *</label>
            <input id="ancho_total_mm" name="ancho_total_mm" type="number" required defaultValue="2400" className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
          <div className="space-y-1">
            <label htmlFor="alto_total_mm" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Alto (mm) *</label>
            <input id="alto_total_mm" name="alto_total_mm" type="number" required defaultValue="2500" className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
          <div className="space-y-1">
            <label htmlFor="fondo_mm" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Fondo (mm) *</label>
            <input id="fondo_mm" name="fondo_mm" type="number" required defaultValue="600" className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
          <div className="sm:col-span-5">
            <button type="submit" className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
              + Añadir armario
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
