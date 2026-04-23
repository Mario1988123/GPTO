import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { ToastFromSearchParams } from "../catalogo/shared";
import { ESTADOS_PEDIDO, type EstadoPedido } from "@/lib/tipos/pedidos";
import { formatEur } from "@/lib/tipos/presupuestos";

export const dynamic = "force-dynamic";

const EST = Object.fromEntries(ESTADOS_PEDIDO.map((e) => [e.value, e]));

type Fila = {
  id: string;
  numero: string | null;
  fecha_pedido: string;
  fecha_entrega_prevista: string | null;
  importe_eur: number;
  estado: EstadoPedido;
  proyectos: { nombre: string; clientes: { nombre: string } | null } | null;
};

export default async function PedidosPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { estado = "" } = await searchParams;
  const s = await createClient();
  let q = s
    .from("pedidos")
    .select("id, numero, fecha_pedido, fecha_entrega_prevista, importe_eur, estado, proyectos(nombre, clientes(nombre))")
    .order("fecha_pedido", { ascending: false });
  if (estado) q = q.eq("estado", estado);
  const { data } = await q.returns<Fila[]>();

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">Pedidos</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Presupuestos aceptados en fase de fabricación.
        </p>
      </div>

      <form className="mt-4 flex items-end gap-2">
        <select name="estado" defaultValue={estado} className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950">
          <option value="">Todos</option>
          {ESTADOS_PEDIDO.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>
        <button type="submit" className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium dark:border-zinc-700 dark:bg-zinc-950">Filtrar</button>
      </form>

      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {!data || data.length === 0 ? (
          <div className="p-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No hay pedidos. Los pedidos se generan automáticamente al marcar un presupuesto como <strong>aceptado</strong>.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2 font-medium">Número</th>
                <th className="px-4 py-2 font-medium">Proyecto</th>
                <th className="px-4 py-2 font-medium">Cliente</th>
                <th className="px-4 py-2 font-medium">Fecha</th>
                <th className="px-4 py-2 font-medium">Entrega</th>
                <th className="px-4 py-2 font-medium">Importe</th>
                <th className="px-4 py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {data.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link href={`/app/pedidos/${p.id}`} className="font-medium text-zinc-950 hover:underline dark:text-zinc-50">
                      {p.numero ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{p.proyectos?.nombre ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{p.proyectos?.clientes?.nombre ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">{new Date(p.fecha_pedido).toLocaleDateString("es-ES")}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                    {p.fecha_entrega_prevista ? new Date(p.fecha_entrega_prevista).toLocaleDateString("es-ES") : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm font-medium">{formatEur(Number(p.importe_eur))}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${EST[p.estado]?.color ?? ""}`}>
                      {EST[p.estado]?.label ?? p.estado}
                    </span>
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
