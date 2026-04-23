import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { ActivoPill, ToastFromSearchParams } from "../catalogo/shared";

export const dynamic = "force-dynamic";

type Fila = {
  id: string;
  nombre: string;
  ancho_default_mm: number;
  alto_default_mm: number;
  fondo_default_mm: number;
  horas_fabricacion_default: number;
  activo: boolean;
  tipo_modulo_piezas: { count: number }[];
  tipo_modulo_herrajes: { count: number }[];
};

export default async function TiposModuloPage({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const { ver = "activos" } = await searchParams;
  const supabase = await createClient();
  let q = supabase
    .from("tipos_modulo")
    .select("id, nombre, ancho_default_mm, alto_default_mm, fondo_default_mm, horas_fabricacion_default, activo, tipo_modulo_piezas(count), tipo_modulo_herrajes(count)")
    .order("nombre");
  if (ver === "activos") q = q.eq("activo", true);
  if (ver === "inactivos") q = q.eq("activo", false);
  const { data } = await q.returns<Fila[]>();

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">Tipos de módulo</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Plantillas paramétricas. Al configurar un armario, cada módulo se basa en uno de estos tipos.
          </p>
        </div>
        <Link href="/app/tipos-modulo/nuevo" className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
          + Nuevo tipo
        </Link>
      </div>
      <form className="mt-4 flex items-end gap-2">
        <select name="ver" defaultValue={ver} className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950">
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
          <option value="todos">Todos</option>
        </select>
        <button type="submit" className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium dark:border-zinc-700 dark:bg-zinc-950">
          Filtrar
        </button>
      </form>
      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {!data || data.length === 0 ? (
          <div className="p-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Sin tipos de módulo. Crea el primero.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2 font-medium">Nombre</th>
                <th className="px-4 py-2 font-medium">Dimensiones</th>
                <th className="px-4 py-2 font-medium">Horas</th>
                <th className="px-4 py-2 font-medium">Piezas</th>
                <th className="px-4 py-2 font-medium">Herrajes</th>
                <th className="px-4 py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {data.map((t) => (
                <tr key={t.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-4 py-3">
                    <Link href={`/app/tipos-modulo/${t.id}`} className="font-medium hover:underline">
                      {t.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-zinc-600 dark:text-zinc-400">
                    {t.ancho_default_mm}×{t.alto_default_mm}×{t.fondo_default_mm} mm
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{t.horas_fabricacion_default} h</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{t.tipo_modulo_piezas?.[0]?.count ?? 0}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{t.tipo_modulo_herrajes?.[0]?.count ?? 0}</td>
                  <td className="px-4 py-3"><ActivoPill activo={t.activo} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
