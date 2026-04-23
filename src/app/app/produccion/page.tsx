import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { ToastFromSearchParams } from "../catalogo/shared";
import { ESTADOS_PIEZA, type EstadoPieza } from "@/lib/tipos/piezas";
import { moverPiezaProduccion } from "./actions";

export const dynamic = "force-dynamic";

type PiezaKanban = {
  id: string;
  nombre: string;
  cantidad: number;
  largo_mm: number;
  ancho_mm: number;
  grosor_mm: number;
  estado: EstadoPieza;
  qr_code: string;
  modulos_armario: {
    armarios: {
      nombre: string;
      proyectos: {
        id: string;
        nombre: string;
        clientes: { nombre: string } | null;
        pedidos: { id: string; numero: string | null }[] | null;
      } | null;
    } | null;
  } | null;
};

export default async function ProduccionPage({
  searchParams,
}: {
  searchParams: Promise<{ pedido?: string }>;
}) {
  const { pedido: pedidoId } = await searchParams;
  const s = await createClient();

  // Lista de pedidos activos para el filtro
  const { data: pedidos } = await s
    .from("pedidos")
    .select("id, numero, estado, proyectos(nombre, clientes(nombre))")
    .in("estado", ["pendiente", "en_fabricacion", "fabricado"])
    .order("created_at", { ascending: false });

  // Obtener piezas. Si hay filtro por pedido, aplicar; si no, todas de pedidos activos.
  let q = s
    .from("piezas_modulo")
    .select(
      "id, nombre, cantidad, largo_mm, ancho_mm, grosor_mm, estado, qr_code, modulos_armario!inner(armarios!inner(nombre, proyectos!inner(id, nombre, clientes(nombre), pedidos(id, numero))))",
    );

  if (pedidoId) {
    // piezas del proyecto concreto del pedido
    const { data: ped } = await s.from("pedidos").select("proyecto_id").eq("id", pedidoId).maybeSingle();
    if (ped?.proyecto_id) q = q.eq("modulos_armario.armarios.proyectos.id", ped.proyecto_id);
  } else {
    // sólo piezas cuyo proyecto tenga pedido activo
    const proyIds = (pedidos ?? []).map((p) => (p as { id: string }).id);
    const { data: pedsPorId } = await s.from("pedidos").select("proyecto_id").in("estado", ["pendiente", "en_fabricacion", "fabricado"]);
    const proyectosIds = (pedsPorId ?? []).map((x) => x.proyecto_id as string);
    if (proyectosIds.length === 0) proyectosIds.push("00000000-0000-0000-0000-000000000000");
    q = q.in("modulos_armario.armarios.proyectos.id", proyectosIds);
    // silence unused
    void proyIds;
  }

  const { data: piezas } = await q.returns<PiezaKanban[]>();

  // Agrupar por estado
  const porEstado: Record<EstadoPieza, PiezaKanban[]> = {
    pendiente: [],
    cortada: [],
    producida: [],
    entregada: [],
  };
  for (const p of piezas ?? []) {
    porEstado[p.estado].push(p);
  }

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">Producción</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Kanban de piezas por estado. Las piezas se generan al <strong>Explosionar</strong> desde cada armario.
        </p>
      </div>

      <form className="mt-4 flex items-end gap-2">
        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Filtrar por pedido activo</label>
          <select name="pedido" defaultValue={pedidoId ?? ""} className="mt-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950">
            <option value="">Todos los pedidos activos</option>
            {(pedidos ?? []).map((p) => {
              const pp = p as unknown as { id: string; numero: string | null; estado: string; proyectos: { nombre: string; clientes: { nombre: string } | null } | null };
              return (
                <option key={pp.id} value={pp.id}>
                  {pp.numero ?? "(sin nº)"} · {pp.proyectos?.nombre ?? "?"} · {pp.proyectos?.clientes?.nombre ?? "?"}
                </option>
              );
            })}
          </select>
        </div>
        <button type="submit" className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium dark:border-zinc-700 dark:bg-zinc-950">Filtrar</button>
      </form>

      {/* Kanban 4 columnas */}
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {ESTADOS_PIEZA.map((est) => {
          const piezasCol = porEstado[est.value];
          return (
            <section key={est.value} className="flex flex-col rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <h2 className="text-sm font-semibold">{est.label}</h2>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${est.color}`}>
                  {piezasCol.length}
                </span>
              </header>
              <div className="flex flex-col gap-2 p-3 max-h-[65vh] overflow-auto">
                {piezasCol.length === 0 ? (
                  <p className="py-10 text-center text-xs text-zinc-400 dark:text-zinc-600">—</p>
                ) : piezasCol.map((p) => {
                  const proy = p.modulos_armario?.armarios?.proyectos;
                  return (
                    <article key={p.id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 transition hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700">
                      <div className="flex items-baseline justify-between">
                        <p className="truncate text-sm font-medium">{p.nombre}</p>
                        <span className="shrink-0 text-[10px] text-zinc-500 dark:text-zinc-400">×{p.cantidad}</span>
                      </div>
                      <p className="mt-0.5 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                        {p.largo_mm} × {p.ancho_mm} × {p.grosor_mm}
                      </p>
                      <p className="mt-1 truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                        {proy?.nombre ?? "?"} · {p.modulos_armario?.armarios?.nombre ?? "?"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {ESTADOS_PIEZA.filter((e) => e.value !== p.estado).map((e) => {
                          const mover = async () => { "use server"; await moverPiezaProduccion(p.id, e.value, pedidoId); };
                          return (
                            <form key={e.value} action={mover}>
                              <button type="submit" className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${e.color} opacity-70 transition hover:opacity-100`}>
                                {e.label}
                              </button>
                            </form>
                          );
                        })}
                      </div>
                      <Link href={`/t/${p.qr_code}`} target="_blank" className="mt-2 block text-[10px] text-zinc-400 hover:underline">
                        Ver QR →
                      </Link>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
