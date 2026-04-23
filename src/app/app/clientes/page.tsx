import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { ToastFromSearchParams } from "./toasts";
import type { Cliente } from "@/lib/tipos/cliente";

export const dynamic = "force-dynamic";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; ver?: string }>;
}) {
  const { q = "", ver = "activos" } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("clientes")
    .select("id, nombre, email, telefono, nif, activo, created_at")
    .order("nombre");

  if (ver === "activos") query = query.eq("activo", true);
  if (ver === "inactivos") query = query.eq("activo", false);
  if (q) query = query.ilike("nombre", `%${q}%`);

  const { data: clientes, error } = await query;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Suspense>
        <ToastFromSearchParams />
      </Suspense>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Clientes
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {clientes?.length ?? 0} cliente(s){ver !== "todos" ? ` (${ver})` : ""}
          </p>
        </div>
        <Link
          href="/app/clientes/nuevo"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          + Nuevo cliente
        </Link>
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label
            htmlFor="q"
            className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
          >
            Buscar por nombre
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="..."
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
          />
        </div>
        <div>
          <label
            htmlFor="ver"
            className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
          >
            Ver
          </label>
          <select
            id="ver"
            name="ver"
            defaultValue={ver}
            className="mt-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
            <option value="todos">Todos</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
        >
          Filtrar
        </button>
      </form>

      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {error ? (
          <div className="p-6 text-sm text-red-600">Error cargando clientes: {error.message}</div>
        ) : !clientes || clientes.length === 0 ? (
          <div className="p-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No hay clientes{q ? ` para "${q}"` : ""}.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2 font-medium">Nombre</th>
                <th className="px-4 py-2 font-medium">NIF</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Teléfono</th>
                <th className="px-4 py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {(clientes as Pick<Cliente, "id" | "nombre" | "email" | "telefono" | "nif" | "activo" | "created_at">[]).map((c) => (
                <tr key={c.id} className="transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/app/clientes/${c.id}`}
                      className="font-medium text-zinc-950 hover:underline dark:text-zinc-50"
                    >
                      {c.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {c.nif ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {c.email ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {c.telefono ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {c.activo ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        activo
                      </span>
                    ) : (
                      <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                        inactivo
                      </span>
                    )}
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
