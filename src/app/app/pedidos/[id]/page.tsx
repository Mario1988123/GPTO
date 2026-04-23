import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { actualizarPedido, cambiarEstadoPedido } from "../actions";
import { ToastFromSearchParams } from "../../catalogo/shared";
import { ESTADOS_PEDIDO, type Pedido } from "@/lib/tipos/pedidos";
import { formatEur } from "@/lib/tipos/presupuestos";

export const dynamic = "force-dynamic";

const EST = Object.fromEntries(ESTADOS_PEDIDO.map((e) => [e.value, e]));

export default async function DetallePedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await createClient();

  const { data: ped } = await s
    .from("pedidos")
    .select("*, proyectos(id, nombre, clientes(nombre, email, telefono)), presupuestos(id, numero)")
    .eq("id", id)
    .maybeSingle<
      Pedido & {
        proyectos: { id: string; nombre: string; clientes: { nombre: string; email: string | null; telefono: string | null } | null } | null;
        presupuestos: { id: string; numero: string | null } | null;
      }
    >();
  if (!ped) notFound();

  const upd = async (fd: FormData) => { "use server"; await actualizarPedido(id, fd); };

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <nav className="text-sm"><Link href="/app/pedidos" className="text-zinc-500 hover:underline dark:text-zinc-400">← Pedidos</Link></nav>

      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {ped.numero ?? "Pedido"}
            </h1>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${EST[ped.estado]?.color ?? ""}`}>
              {EST[ped.estado]?.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {ped.proyectos?.clientes?.nombre} · {ped.proyectos?.nombre}
            {ped.presupuestos?.numero ? ` · Presupuesto ${ped.presupuestos.numero}` : ""}
          </p>
        </div>
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Fecha pedido</p>
          <p className="mt-0.5 font-mono text-base font-medium">{new Date(ped.fecha_pedido).toLocaleDateString("es-ES")}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Entrega prevista</p>
          <p className="mt-0.5 font-mono text-base font-medium">
            {ped.fecha_entrega_prevista ? new Date(ped.fecha_entrega_prevista).toLocaleDateString("es-ES") : "—"}
          </p>
        </div>
        <div className="rounded-lg bg-zinc-900 p-3 text-white dark:bg-zinc-100 dark:text-zinc-900">
          <p className="text-xs uppercase tracking-wide opacity-75">Importe</p>
          <p className="mt-0.5 font-mono text-lg font-semibold">{formatEur(Number(ped.importe_eur))}</p>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-medium">Datos del pedido</h2>
        <form action={upd} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Fecha entrega prevista</label>
            <input name="fecha_entrega_prevista" type="date" defaultValue={ped.fecha_entrega_prevista ?? ""}
              className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
          <div className="sm:col-span-2 space-y-1">
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Notas</label>
            <textarea name="notas" rows={3} defaultValue={ped.notas ?? ""}
              className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
              Guardar
            </button>
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-medium">Cambiar estado</h2>
        <div className="flex flex-wrap gap-2">
          {ESTADOS_PEDIDO.filter((e) => e.value !== ped.estado).map((e) => {
            const setEstado = async () => { "use server"; await cambiarEstadoPedido(id, e.value); };
            return (
              <form key={e.value} action={setEstado}>
                <button type="submit" className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${e.color} border-transparent hover:opacity-80`}>
                  → {e.label}
                </button>
              </form>
            );
          })}
        </div>
      </section>
    </div>
  );
}
