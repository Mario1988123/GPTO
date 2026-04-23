import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { ToastFromSearchParams } from "../catalogo/shared";
import { cambiarEstadoRecorte } from "../proyectos/nesting-actions";
import { ESTADOS_RECORTE, type EstadoRecorte } from "@/lib/tipos/nesting";

export const dynamic = "force-dynamic";

const EST = Object.fromEntries(ESTADOS_RECORTE.map((e) => [e.value, e]));

type Fila = {
  id: string;
  largo_mm: number;
  ancho_mm: number;
  estado: EstadoRecorte;
  notas: string | null;
  created_at: string;
  referencias_tablero: { grosor_mm: number; materiales: { nombre: string } | null; acabados: { nombre: string } | null } | null;
};

export default async function RecortesPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { estado = "conservado" } = await searchParams;
  const s = await createClient();

  let q = s
    .from("recortes")
    .select("id, largo_mm, ancho_mm, estado, notas, created_at, referencias_tablero(grosor_mm, materiales(nombre), acabados(nombre))")
    .order("created_at", { ascending: false });
  if (estado && estado !== "todos") q = q.eq("estado", estado);
  const { data } = await q.returns<Fila[]>();

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">Almacén de recortes</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Retales reutilizables. Filtrables por estado.
      </p>

      <form className="mt-4 flex items-end gap-2">
        <select name="estado" defaultValue={estado} className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950">
          <option value="conservado">Conservados</option>
          <option value="pendiente">Pendientes de validar</option>
          <option value="descartado">Descartados</option>
          <option value="usado">Ya utilizados</option>
          <option value="todos">Todos</option>
        </select>
        <button type="submit" className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium dark:border-zinc-700 dark:bg-zinc-950">Filtrar</button>
      </form>

      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {!data || data.length === 0 ? (
          <div className="p-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Sin recortes {estado !== "todos" ? `en estado "${EST[estado]?.label ?? estado}"` : ""}.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2 font-medium">Referencia</th>
                <th className="px-4 py-2 font-medium">Dimensiones</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2 font-medium">Creado</th>
                <th className="px-4 py-2 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {data.map((rec) => {
                const est = EST[rec.estado];
                const conservar = async () => { "use server"; await cambiarEstadoRecorte(rec.id, "conservado", "/app/recortes"); };
                const descartar = async () => { "use server"; await cambiarEstadoRecorte(rec.id, "descartado", "/app/recortes"); };
                const usar = async () => { "use server"; await cambiarEstadoRecorte(rec.id, "usado", "/app/recortes"); };
                return (
                  <tr key={rec.id}>
                    <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400">
                      {rec.referencias_tablero?.materiales?.nombre ?? "?"} · {rec.referencias_tablero?.acabados?.nombre ?? "?"} · {rec.referencias_tablero?.grosor_mm ?? "?"} mm
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">{rec.largo_mm} × {rec.ancho_mm} mm</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${est?.color ?? ""}`}>{est?.label ?? rec.estado}</span></td>
                    <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">{new Date(rec.created_at).toLocaleDateString("es-ES")}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 text-xs">
                        {rec.estado === "pendiente" ? (
                          <>
                            <form action={conservar}><button type="submit" className="text-emerald-700 hover:underline dark:text-emerald-400">Conservar</button></form>
                            <form action={descartar}><button type="submit" className="text-red-700 hover:underline dark:text-red-300">Descartar</button></form>
                          </>
                        ) : null}
                        {rec.estado === "conservado" ? (
                          <>
                            <form action={usar}><button type="submit" className="text-violet-700 hover:underline dark:text-violet-400">Marcar usado</button></form>
                            <form action={descartar}><button type="submit" className="text-red-700 hover:underline dark:text-red-300">Descartar</button></form>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
        <Link href="/app/proyectos" className="underline">Volver a proyectos</Link>
      </p>
    </div>
  );
}
