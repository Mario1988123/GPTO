import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { ActivoPill, ToastFromSearchParams, euros } from "../shared";

export const dynamic = "force-dynamic";

type Fila = {
  id: string;
  nombre: string;
  grosor_mm: number | null;
  precio_ml: number;
  activo: boolean;
  acabados: { nombre: string } | null;
  proveedores: { nombre: string } | null;
};

export default async function CantosPage({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const { ver = "activos" } = await searchParams;
  const supabase = await createClient();
  let q = supabase
    .from("cantos")
    .select("id, nombre, grosor_mm, precio_ml, activo, acabados(nombre), proveedores(nombre)")
    .order("nombre");
  if (ver === "activos") q = q.eq("activo", true);
  if (ver === "inactivos") q = q.eq("activo", false);
  const { data } = await q.returns<Fila[]>();

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <nav className="text-sm"><Link href="/app/catalogo" className="text-zinc-500 hover:underline dark:text-zinc-400">← Catálogo</Link></nav>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">Cantos</h1>
        <Link href="/app/catalogo/cantos/nuevo" className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">+ Nuevo</Link>
      </div>
      <form className="mt-4 flex items-end gap-2">
        <select name="ver" defaultValue={ver} className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950">
          <option value="activos">Activos</option><option value="inactivos">Inactivos</option><option value="todos">Todos</option>
        </select>
        <button type="submit" className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium dark:border-zinc-700 dark:bg-zinc-950">Filtrar</button>
      </form>
      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {!data || data.length === 0 ? (
          <div className="p-10 text-center text-sm text-zinc-500 dark:text-zinc-400">Sin cantos.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-400">
              <tr><th className="px-4 py-2 font-medium">Nombre</th><th className="px-4 py-2 font-medium">Acabado</th><th className="px-4 py-2 font-medium">Grosor</th><th className="px-4 py-2 font-medium">Precio/ml</th><th className="px-4 py-2 font-medium">Proveedor</th><th className="px-4 py-2 font-medium">Estado</th></tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {data.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-4 py-3"><Link href={`/app/catalogo/cantos/${c.id}`} className="font-medium hover:underline">{c.nombre}</Link></td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{c.acabados?.nombre ?? "todos"}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{c.grosor_mm ? `${c.grosor_mm} mm` : "todos"}</td>
                  <td className="px-4 py-3 font-mono">{euros(c.precio_ml)}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{c.proveedores?.nombre ?? "—"}</td>
                  <td className="px-4 py-3"><ActivoPill activo={c.activo} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
