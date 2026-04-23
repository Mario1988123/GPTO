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

  const [{ data: clientes }, { data: armarios }, { data: estancias }] = await Promise.all([
    s.from("clientes").select("id, nombre").eq("activo", true).order("nombre"),
    s.from("armarios").select("*").eq("proyecto_id", id).order("orden").returns<Armario[]>(),
    s.from("estancias").select("id, nombre, tipo, orden, largo_mm, ancho_mm, alto_mm").eq("proyecto_id", id).order("orden"),
  ]);

  const update = async (fd: FormData) => { "use server"; await actualizarProyecto(id, fd); };
  const del = async () => { "use server"; await eliminarProyecto(id); };
  const addArm = async (fd: FormData) => { "use server"; await crearArmario(id, fd); };
  const addEst = async (fd: FormData) => {
    "use server";
    const { crearEstancia } = await import("../estancias-actions");
    await crearEstancia(id, fd);
  };

  const armariosPorEstancia = new Map<string, Armario[]>();
  for (const a of armarios ?? []) {
    const arr = armariosPorEstancia.get(a.estancia_id) ?? [];
    arr.push(a);
    armariosPorEstancia.set(a.estancia_id, arr);
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <nav className="text-sm"><Link href="/app/proyectos" className="text-zinc-500 hover:underline dark:text-zinc-400">← Proyectos</Link></nav>

      <div className="mt-2 flex items-baseline justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">{proyecto.nombre}</h1>
        <div className="flex items-center gap-3">
          <form action={async () => { "use server"; const { crearBorrador } = await import("../presupuestos-actions"); await crearBorrador(id); }}>
            <button
              type="submit"
              className="rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-zinc-950 dark:text-emerald-300"
            >
              Calcular presupuesto →
            </button>
          </form>
          <Link
            href={`/app/proyectos/${id}/nesting`}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:bg-zinc-900"
          >
            Nesting →
          </Link>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${LBL[proyecto.estado]?.color ?? ""}`}>
            {LBL[proyecto.estado]?.label}
          </span>
        </div>
      </div>

      {/* Portal cliente (Capa 12) */}
      <section className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
        <div className="flex items-start gap-3">
          <span className="text-lg">🔗</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">Portal cliente</p>
            <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-400">
              Enlace privado para que el cliente vea el estado de su proyecto:
            </p>
            <code className="mt-2 block truncate rounded bg-white px-2 py-1 font-mono text-xs text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
              /c/{proyecto.acceso_token}
            </code>
          </div>
        </div>
      </section>

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

      {/* Estancias con armarios agrupados */}
      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
            Estancias ({estancias?.length ?? 0}) · Armarios ({armarios?.length ?? 0})
          </h2>
        </div>

        {(estancias ?? []).length === 0 ? (
          <p className="rounded-md bg-zinc-50 p-4 text-sm text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
            Sin estancias. Crea la primera para empezar (ej: &ldquo;Dormitorio principal&rdquo;, &ldquo;Vestidor&rdquo;, &ldquo;Cocina&rdquo;).
          </p>
        ) : (
          <div className="space-y-4">
            {(estancias ?? []).map((e) => {
              const arms = armariosPorEstancia.get(e.id as string) ?? [];
              return (
                <div key={e.id as string} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                  <div className="flex items-baseline justify-between">
                    <Link href={`/app/proyectos/${id}/estancias/${e.id}`} className="flex items-center gap-2 text-base font-semibold hover:underline">
                      <span className="text-sm">
                        {({
                          vestidor: "👔", armario_pasillo: "🚪", cocina: "🍳", comedor: "🍽️", dormitorio: "🛏️",
                          bano: "🛁", entrada: "🏠", salon: "🛋️", despacho: "💼", otro: "📦",
                        } as Record<string,string>)[e.tipo as string] ?? "📦"}
                      </span>
                      {e.nombre}
                    </Link>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">{arms.length} armario(s)</span>
                  </div>
                  {arms.length > 0 ? (
                    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                      {arms.map((a) => (
                        <li key={a.id}>
                          <Link href={`/app/proyectos/${id}/armarios/${a.id}`} className="flex items-baseline justify-between rounded-md border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50">
                            <span className="font-medium">{a.nombre}</span>
                            <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                              {a.ancho_total_mm}×{a.alto_total_mm}×{a.fondo_mm}
                              <span className="ml-2 text-[10px]">{a.tipo_instalacion === "empotrado" ? "emp." : "suel."}</span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                      Sin armarios en esta estancia. Entra y añade el primero.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Form crear estancia */}
        <form action={addEst} className="mt-5 grid gap-3 rounded-lg border border-dashed border-zinc-300 p-4 sm:grid-cols-4 dark:border-zinc-700">
          <div className="sm:col-span-2 space-y-1">
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Nombre estancia *</label>
            <input name="nombre" required placeholder="Vestidor del dormitorio" className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Tipo</label>
            <select name="tipo" defaultValue="vestidor" className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950">
              <option value="vestidor">Vestidor</option>
              <option value="armario_pasillo">Armario pasillo</option>
              <option value="cocina">Cocina</option>
              <option value="comedor">Comedor</option>
              <option value="dormitorio">Dormitorio</option>
              <option value="bano">Baño</option>
              <option value="entrada">Entrada</option>
              <option value="salon">Salón</option>
              <option value="despacho">Despacho</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div>
            <button type="submit" className="mt-5 w-full rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">+ Nueva estancia</button>
          </div>
        </form>

        {/* Form crear armario legacy (compatibilidad: crea en la primera estancia) */}
        <details className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
          <summary className="cursor-pointer">Crear armario directo (se añade a la primera estancia)</summary>
          <form action={addArm} className="mt-3 grid gap-3 rounded-lg border border-dashed border-zinc-200 p-4 sm:grid-cols-5 dark:border-zinc-800">
            <div className="sm:col-span-2 space-y-1">
              <label className="block text-[10px] font-medium">Nombre</label>
              <input name="nombre" defaultValue="Armario" className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-medium">Ancho</label>
              <input name="ancho_total_mm" type="number" required defaultValue="2400" className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-medium">Alto</label>
              <input name="alto_total_mm" type="number" required defaultValue="2400" className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-medium">Fondo</label>
              <input name="fondo_mm" type="number" required defaultValue="600" className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
            </div>
            <div className="sm:col-span-5">
              <button type="submit" className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">+ Añadir armario</button>
            </div>
          </form>
        </details>
      </section>
    </div>
  );
}
