import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { ActivoPill, ToastFromSearchParams, euros } from "../shared";
import { TIPOS_HERRAJE } from "@/lib/tipos/catalogo";

export const dynamic = "force-dynamic";

const LABEL_TIPO = Object.fromEntries(TIPOS_HERRAJE.map((t) => [t.value, t.label]));

type Fila = {
  id: string;
  tipo: string;
  nombre: string;
  precio_unidad: number;
  stock_disponible: number;
  activo: boolean;
  proveedores: { nombre: string } | null;
};

export default async function HerrajesPage({ searchParams }: { searchParams: Promise<{ ver?: string; tipo?: string }> }) {
  const { ver = "activos", tipo = "" } = await searchParams;
  const supabase = await createClient();
  let q = supabase
    .from("herrajes")
    .select("id, tipo, nombre, precio_unidad, stock_disponible, activo, proveedores(nombre)")
    .order("tipo")
    .order("nombre");
  if (ver === "activos") q = q.eq("activo", true);
  if (ver === "inactivos") q = q.eq("activo", false);
  if (tipo) q = q.eq("tipo", tipo);
  const { data } = await q.returns<Fila[]>();

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <nav className="text-sm"><Link href="/app/catalogo" className="text-zinc-500 hover:underline dark:text-zinc-400">← Catálogo</Link></nav>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">Herrajes</h1>
        <Link href="/app/catalogo/herrajes/nuevo" className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">+ Nuevo</Link>
      </div>
      <form className="mt-4 flex flex-wrap items-end gap-2">
        <select name="ver" defaultValue={ver} className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950">
          <option value="activos">Activos</option><option value="inactivos">Inactivos</option><option value="todos">Todos</option>
        </select>
        <select name="tipo" defaultValue={tipo} className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950">
          <option value="">Todos los tipos</option>
          {TIPOS_HERRAJE.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button type="submit" className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium dark:border-zinc-700 dark:bg-zinc-950">Filtrar</button>
      </form>
      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {!data || data.length === 0 ? (
          <div className="p-10 text-center text-sm text-zinc-500 dark:text-zinc-400">Sin herrajes.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-400">
              <tr><th className="px-4 py-2 font-medium">Tipo</th><th className="px-4 py-2 font-medium">Nombre</th><th className="px-4 py-2 font-medium">Precio/ud</th><th className="px-4 py-2 font-medium">Stock</th><th className="px-4 py-2 font-medium">Proveedor</th><th className="px-4 py-2 font-medium">Estado</th></tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {data.map((h) => (
                <tr key={h.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{LABEL_TIPO[h.tipo] ?? h.tipo}</td>
                  <td className="px-4 py-3"><Link href={`/app/catalogo/herrajes/${h.id}`} className="font-medium hover:underline">{h.nombre}</Link></td>
                  <td className="px-4 py-3 font-mono">{euros(h.precio_unidad)}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{h.stock_disponible}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{h.proveedores?.nombre ?? "—"}</td>
                  <td className="px-4 py-3"><ActivoPill activo={h.activo} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
