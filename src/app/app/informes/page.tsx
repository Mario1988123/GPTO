import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatEur } from "@/lib/tipos/presupuestos";

export const dynamic = "force-dynamic";

type PedidoRow = { importe_eur: number; fecha_pedido: string; estado: string; proyectos: { clientes: { nombre: string } | null } | null };
type PresRow = { estado: string; total_eur: number; created_at: string };

const MESES_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default async function InformesPage() {
  const s = await createClient();
  const ahora = new Date();
  const haceDoceMeses = new Date(ahora.getFullYear() - 1, ahora.getMonth(), 1);

  const [pedidosAll, presupuestosAll, clientesCount, recortesAgg, herrajesBajos, proyectosGrupo] = await Promise.all([
    s.from("pedidos").select("importe_eur, fecha_pedido, estado, proyectos(clientes(nombre))").gte("fecha_pedido", haceDoceMeses.toISOString().slice(0, 10)).returns<PedidoRow[]>(),
    s.from("presupuestos").select("estado, total_eur, created_at").gte("created_at", haceDoceMeses.toISOString()).returns<PresRow[]>(),
    s.from("clientes").select("*", { count: "exact", head: true }).eq("activo", true),
    s.from("recortes").select("estado, largo_mm, ancho_mm"),
    s.from("herrajes").select("nombre, tipo, stock_disponible, precio_unidad").eq("activo", true).lte("stock_disponible", 10).order("stock_disponible"),
    s.from("proyectos").select("estado"),
  ]);

  // ============== Ventas por mes (últimos 12 meses) ==============
  const ventasPorMes: { label: string; total: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    const label = `${MESES_ES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
    const total = (pedidosAll.data ?? [])
      .filter((p) => {
        const fp = new Date(p.fecha_pedido);
        return fp.getFullYear() === d.getFullYear() && fp.getMonth() === d.getMonth() && ["fabricado", "entregado"].includes(p.estado);
      })
      .reduce((acc, p) => acc + Number(p.importe_eur), 0);
    ventasPorMes.push({ label, total });
  }
  const maxVentaMes = Math.max(1, ...ventasPorMes.map((v) => v.total));
  const totalVentas12m = ventasPorMes.reduce((a, v) => a + v.total, 0);

  // ============== Top clientes por facturación ==============
  const porCliente = new Map<string, number>();
  for (const p of pedidosAll.data ?? []) {
    if (!["fabricado", "entregado"].includes(p.estado)) continue;
    const n = p.proyectos?.clientes?.nombre ?? "Sin cliente";
    porCliente.set(n, (porCliente.get(n) ?? 0) + Number(p.importe_eur));
  }
  const topClientes = [...porCliente.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxTopCliente = Math.max(1, ...topClientes.map((c) => c[1]));

  // ============== Conversión presupuestos ==============
  const presEnviados = (presupuestosAll.data ?? []).filter((p) => ["enviado", "aceptado", "rechazado", "caducado"].includes(p.estado)).length;
  const presAceptados = (presupuestosAll.data ?? []).filter((p) => p.estado === "aceptado").length;
  const conversion = presEnviados > 0 ? Math.round((presAceptados / presEnviados) * 100) : 0;
  const valorPresEnviados = (presupuestosAll.data ?? []).filter((p) => p.estado === "enviado").reduce((a, p) => a + Number(p.total_eur), 0);

  // ============== Estado proyectos (donut simple) ==============
  const estProyMap = new Map<string, number>();
  for (const p of proyectosGrupo.data ?? []) {
    const e = (p as { estado: string }).estado;
    estProyMap.set(e, (estProyMap.get(e) ?? 0) + 1);
  }
  const totalProy = Array.from(estProyMap.values()).reduce((a, b) => a + b, 0);
  const ESTADOS_PROY_COLOR: Record<string, string> = {
    borrador: "bg-zinc-400",
    presupuestado: "bg-blue-500",
    confirmado: "bg-emerald-500",
    en_fabricacion: "bg-amber-500",
    entregado: "bg-violet-500",
    cancelado: "bg-red-500",
  };

  // ============== Merma ==============
  const recortes = recortesAgg.data ?? [];
  const areaRecortesMm2 = recortes.reduce((a, r) => a + Number(r.largo_mm) * Number(r.ancho_mm), 0);
  const areaRecortesConservados = recortes.filter((r) => r.estado === "conservado").reduce((a, r) => a + Number(r.largo_mm) * Number(r.ancho_mm), 0);
  const areaRecortesDescartados = recortes.filter((r) => r.estado === "descartado").reduce((a, r) => a + Number(r.largo_mm) * Number(r.ancho_mm), 0);
  const mermaConservadosM2 = areaRecortesConservados / 1_000_000;
  const mermaDescartadosM2 = areaRecortesDescartados / 1_000_000;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">Informes</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Métricas del negocio de los últimos 12 meses.
        </p>
      </div>

      {/* Fila 1: KPIs */}
      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Facturación 12m" value={formatEur(totalVentas12m)} sub="Pedidos fabricados o entregados" />
        <KpiCard label="Conversión presupuestos" value={`${conversion}%`} sub={`${presAceptados} aceptados / ${presEnviados} enviados`} />
        <KpiCard label="Clientes activos" value={String(clientesCount.count ?? 0)} sub="En la base de datos" />
        <KpiCard label="Pipeline" value={formatEur(valorPresEnviados)} sub="Presupuestos enviados sin respuesta" accent />
      </section>

      {/* Ventas por mes */}
      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold">Ventas por mes</h2>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Últimos 12 meses · pedidos fabricados y entregados</p>
        <div className="mt-6 flex items-end justify-between gap-1 h-48">
          {ventasPorMes.map((v, i) => {
            const h = (v.total / maxVentaMes) * 100;
            const esActual = i === ventasPorMes.length - 1;
            return (
              <div key={v.label} className="group flex flex-1 flex-col items-center gap-2">
                <div className="relative flex w-full flex-1 items-end">
                  <div
                    className={`w-full rounded-t transition ${esActual ? "bg-zinc-900 dark:bg-zinc-100" : "bg-zinc-300 group-hover:bg-zinc-500 dark:bg-zinc-700 dark:group-hover:bg-zinc-500"}`}
                    style={{ height: `${Math.max(h, 2)}%` }}
                    title={`${v.label}: ${formatEur(v.total)}`}
                  />
                  <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition group-hover:opacity-100 dark:bg-zinc-100 dark:text-zinc-900">
                    {formatEur(v.total)}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400">{v.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Fila 2: Top clientes + Estado proyectos */}
      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold">Top 5 clientes</h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Por facturación 12 meses</p>
          {topClientes.length === 0 ? (
            <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">Sin ventas todavía.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {topClientes.map(([nombre, total], i) => (
                <li key={nombre}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">{i + 1}</span>
                      {nombre}
                    </span>
                    <span className="font-mono font-medium">{formatEur(total)}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div className="h-full bg-zinc-900 dark:bg-zinc-100" style={{ width: `${(total / maxTopCliente) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold">Estado de proyectos</h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{totalProy} proyecto(s) en total</p>
          {totalProy === 0 ? (
            <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">Sin proyectos.</p>
          ) : (
            <>
              <div className="mt-4 h-6 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800 flex">
                {Array.from(estProyMap.entries()).map(([estado, n]) => (
                  <div
                    key={estado}
                    className={`${ESTADOS_PROY_COLOR[estado] ?? "bg-zinc-500"}`}
                    style={{ width: `${(n / totalProy) * 100}%` }}
                    title={`${estado}: ${n}`}
                  />
                ))}
              </div>
              <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {Array.from(estProyMap.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([estado, n]) => (
                    <li key={estado} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className={`inline-block h-2.5 w-2.5 rounded-full ${ESTADOS_PROY_COLOR[estado] ?? "bg-zinc-500"}`} />
                        <span className="capitalize text-zinc-700 dark:text-zinc-300">{estado.replace(/_/g, " ")}</span>
                      </span>
                      <span className="font-mono font-medium">{n}</span>
                    </li>
                  ))}
              </ul>
            </>
          )}
        </div>
      </section>

      {/* Fila 3: Merma + Stock bajo */}
      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold">Recortes y merma</h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Histórico total de todos los nestings</p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <MermaBox label="Aprovechada" value={`${mermaConservadosM2.toFixed(2)} m²`} color="emerald" />
            <MermaBox label="Descartada" value={`${mermaDescartadosM2.toFixed(2)} m²`} color="red" />
            <MermaBox label="Total" value={`${(areaRecortesMm2 / 1_000_000).toFixed(2)} m²`} color="zinc" />
          </div>
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            <Link href="/app/recortes" className="underline">Ver almacén de recortes →</Link>
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold">Stock bajo de herrajes</h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Herrajes con ≤ 10 unidades disponibles</p>
          {(herrajesBajos.data ?? []).length === 0 ? (
            <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">Todo ok. Sin alertas de stock.</p>
          ) : (
            <ul className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
              {(herrajesBajos.data ?? []).map((h) => {
                const row = h as { nombre: string; tipo: string; stock_disponible: number; precio_unidad: number };
                const critico = row.stock_disponible <= 2;
                return (
                  <li key={row.nombre} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <p className="font-medium">{row.nombre}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{row.tipo} · {formatEur(Number(row.precio_unidad))}/ud</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${critico ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>
                      {row.stock_disponible} uds
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, value, sub, accent = false }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 shadow-sm ${accent ? "border-zinc-900 bg-gradient-to-br from-zinc-900 to-zinc-800 text-white dark:border-zinc-100 dark:from-zinc-100 dark:to-zinc-50 dark:text-zinc-900" : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"}`}>
      <p className={`text-xs font-medium uppercase tracking-wider ${accent ? "opacity-75" : "text-zinc-500 dark:text-zinc-400"}`}>{label}</p>
      <p className="mt-2 font-mono text-2xl font-semibold">{value}</p>
      {sub ? <p className={`mt-1 text-xs ${accent ? "opacity-75" : "text-zinc-500 dark:text-zinc-400"}`}>{sub}</p> : null}
    </div>
  );
}

function MermaBox({ label, value, color }: { label: string; value: string; color: "emerald" | "red" | "zinc" }) {
  const cls = {
    emerald: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    red: "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300",
    zinc: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300",
  }[color];
  return (
    <div className={`rounded-lg ${cls} p-3`}>
      <p className="text-[10px] uppercase tracking-wider opacity-80">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold">{value}</p>
    </div>
  );
}
