import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { ToastFromSearchParams } from "../catalogo/shared";
import { ESTADOS_PROYECTO, type EstadoProyecto } from "@/lib/tipos/proyectos";

export const dynamic = "force-dynamic";

const LBL = Object.fromEntries(ESTADOS_PROYECTO.map((e) => [e.value, e]));

type Fila = {
  id: string;
  nombre: string;
  estado: EstadoProyecto;
  created_at: string;
  updated_at: string;
  clientes: { nombre: string } | null;
  armarios: { count: number }[];
};

export default async function ProyectosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado = "" } = await searchParams;
  const supabase = await createClient();
  let q = supabase
    .from("proyectos")
    .select("id, nombre, estado, created_at, updated_at, clientes(nombre), armarios(count)")
    .order("updated_at", { ascending: false });
  if (estado) q = q.eq("estado", estado);
  const { data } = await q.returns<Fila[]>();

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">Proyectos</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Un proyecto agrupa los armarios a fabricar para un cliente.
          </p>
        </div>
        <Link href="/app/proyectos/nuevo" className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
          + Nuevo proyecto
        </Link>
      </div>

      <form className="mt-4 flex items-end gap-2">
        <select name="estado" defaultValue={estado} className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950">
          <option value="">Todos los estados</option>
          {ESTADOS_PROYECTO.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>
        <button type="submit" className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium dark:border-zinc-700 dark:bg-zinc-950">Filtrar</button>
      </form>

      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {!data || data.length === 0 ? (
          <div className="p-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No hay proyectos{estado ? ` en estado "${LBL[estado]?.label ?? estado}"` : ""}.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2 font-medium">Proyecto</th>
                <th className="px-4 py-2 font-medium">Cliente</th>
                <th className="px-4 py-2 font-medium">Armarios</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2 font-medium">Actualizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {data.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-4 py-3">
                    <Link href={`/app/proyectos/${p.id}`} className="font-medium hover:underline">{p.nombre}</Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{p.clientes?.nombre ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{p.armarios?.[0]?.count ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${LBL[p.estado]?.color ?? ""}`}>
                      {LBL[p.estado]?.label ?? p.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                    {new Date(p.updated_at).toLocaleDateString("es-ES")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
