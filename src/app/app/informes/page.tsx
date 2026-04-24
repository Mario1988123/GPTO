import Link from "next/link";
import { BarChart3, TrendingUp, Users, Target, Wallet, Boxes, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatEur } from "@/lib/tipos/presupuestos";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";

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

  // Ventas por mes
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

  // Top clientes
  const porCliente = new Map<string, number>();
  for (const p of pedidosAll.data ?? []) {
    if (!["fabricado", "entregado"].includes(p.estado)) continue;
    const n = p.proyectos?.clientes?.nombre ?? "Sin cliente";
    porCliente.set(n, (porCliente.get(n) ?? 0) + Number(p.importe_eur));
  }
  const topClientes = [...porCliente.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxTopCliente = Math.max(1, ...topClientes.map((c) => c[1]));

  // Conversión
  const presEnviados = (presupuestosAll.data ?? []).filter((p) => ["enviado", "aceptado", "rechazado", "caducado"].includes(p.estado)).length;
  const presAceptados = (presupuestosAll.data ?? []).filter((p) => p.estado === "aceptado").length;
  const conversion = presEnviados > 0 ? Math.round((presAceptados / presEnviados) * 100) : 0;
  const valorPresEnviados = (presupuestosAll.data ?? []).filter((p) => p.estado === "enviado").reduce((a, p) => a + Number(p.total_eur), 0);

  // Estado proyectos
  const estProyMap = new Map<string, number>();
  for (const p of proyectosGrupo.data ?? []) {
    const e = (p as { estado: string }).estado;
    estProyMap.set(e, (estProyMap.get(e) ?? 0) + 1);
  }
  const totalProy = Array.from(estProyMap.values()).reduce((a, b) => a + b, 0);
  const ESTADOS_PROY_COLOR: Record<string, string> = {
    borrador: "bg-muted-foreground/60",
    presupuestado: "bg-blue-500",
    confirmado: "bg-emerald-500",
    en_fabricacion: "bg-amber-500",
    entregado: "bg-violet-500",
    cancelado: "bg-red-500",
  };

  // Merma
  const recortes = recortesAgg.data ?? [];
  const areaRecortesMm2 = recortes.reduce((a, r) => a + Number(r.largo_mm) * Number(r.ancho_mm), 0);
  const areaRecortesConservados = recortes.filter((r) => r.estado === "conservado").reduce((a, r) => a + Number(r.largo_mm) * Number(r.ancho_mm), 0);
  const areaRecortesDescartados = recortes.filter((r) => r.estado === "descartado").reduce((a, r) => a + Number(r.largo_mm) * Number(r.ancho_mm), 0);
  const mermaConservadosM2 = areaRecortesConservados / 1_000_000;
  const mermaDescartadosM2 = areaRecortesDescartados / 1_000_000;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <PageHeader
        eyebrow="Análisis"
        title="Informes"
        description="Métricas del negocio de los últimos 12 meses."
      />

      {/* KPIs */}
      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Facturación 12m" value={formatEur(totalVentas12m)} icon={TrendingUp} hint="Pedidos fabricados + entregados" />
        <StatCard label="Conversión" value={`${conversion}%`} icon={Target} hint={`${presAceptados}/${presEnviados} aceptados`} />
        <StatCard label="Clientes activos" value={clientesCount.count ?? 0} icon={Users} />
        <StatCard label="Pipeline" value={formatEur(valorPresEnviados)} icon={Wallet} hint="Presupuestos enviados sin respuesta" variant="accent" />
      </section>

      {/* Ventas por mes */}
      <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Facturación</p>
            <h2 className="mt-0.5 text-lg font-bold tracking-tight">Ventas por mes</h2>
          </div>
          <p className="text-xs text-muted-foreground">Últimos 12 meses · pedidos fabricados y entregados</p>
        </div>
        <div className="mt-8 flex h-48 items-end justify-between gap-1">
          {ventasPorMes.map((v, i) => {
            const h = (v.total / maxVentaMes) * 100;
            const esActual = i === ventasPorMes.length - 1;
            return (
              <div key={v.label} className="group flex flex-1 flex-col items-center gap-2">
                <div className="relative flex w-full flex-1 items-end">
                  <div
                    className={`w-full rounded-t-md transition ${
                      esActual
                        ? "bg-gradient-to-t from-foreground to-foreground/80"
                        : "bg-muted group-hover:bg-muted-foreground/40"
                    }`}
                    style={{ height: `${Math.max(h, 2)}%` }}
                    title={`${v.label}: ${formatEur(v.total)}`}
                  />
                  <span className="pointer-events-none absolute -top-7 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 font-mono text-[10px] font-bold text-background opacity-0 shadow-lg transition group-hover:opacity-100">
                    {formatEur(v.total)}
                  </span>
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">{v.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Top clientes + Estado proyectos */}
      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Ranking</p>
            <h2 className="mt-0.5 text-lg font-bold tracking-tight">Top 5 clientes</h2>
          </div>
          {topClientes.length === 0 ? (
            <div className="mt-6"><EmptyState icon={Users} title="Sin ventas todavía" /></div>
          ) : (
            <ul className="mt-6 space-y-3.5">
              {topClientes.map(([nombre, total], i) => (
                <li key={nombre}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="flex items-center gap-2.5">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
                        {i + 1}
                      </span>
                      <span className="font-semibold">{nombre}</span>
                    </span>
                    <span className="font-mono font-bold tabular-nums">{formatEur(total)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-foreground to-foreground/80"
                      style={{ width: `${(total / maxTopCliente) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Estado</p>
            <h2 className="mt-0.5 text-lg font-bold tracking-tight">Proyectos por estado</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{totalProy} proyecto{totalProy === 1 ? "" : "s"}</p>
          </div>
          {totalProy === 0 ? (
            <div className="mt-6"><EmptyState icon={BarChart3} title="Sin proyectos" /></div>
          ) : (
            <>
              <div className="mt-6 flex h-6 w-full overflow-hidden rounded-full bg-muted">
                {Array.from(estProyMap.entries()).map(([estado, n]) => (
                  <div
                    key={estado}
                    className={ESTADOS_PROY_COLOR[estado] ?? "bg-muted-foreground"}
                    style={{ width: `${(n / totalProy) * 100}%` }}
                    title={`${estado}: ${n}`}
                  />
                ))}
              </div>
              <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                {Array.from(estProyMap.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([estado, n]) => (
                    <li key={estado} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className={`inline-block h-2.5 w-2.5 rounded-full ${ESTADOS_PROY_COLOR[estado] ?? "bg-muted-foreground"}`} />
                        <span className="text-sm capitalize">{estado.replace(/_/g, " ")}</span>
                      </span>
                      <span className="font-mono font-bold tabular-nums">{n}</span>
                    </li>
                  ))}
              </ul>
            </>
          )}
        </div>
      </section>

      {/* Merma + Stock bajo */}
      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Taller</p>
              <h2 className="mt-0.5 text-lg font-bold tracking-tight">Recortes y merma</h2>
            </div>
            <Boxes className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3">
            <MermaBox label="Aprovechada" value={`${mermaConservadosM2.toFixed(2)} m²`} variant="emerald" />
            <MermaBox label="Descartada" value={`${mermaDescartadosM2.toFixed(2)} m²`} variant="red" />
            <MermaBox label="Total" value={`${(areaRecortesMm2 / 1_000_000).toFixed(2)} m²`} variant="neutral" />
          </div>
          <Link
            href="/app/recortes"
            className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            Ver almacén de recortes →
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Alertas</p>
              <h2 className="mt-0.5 text-lg font-bold tracking-tight">Stock bajo de herrajes</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">≤ 10 unidades disponibles</p>
            </div>
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          </div>
          {(herrajesBajos.data ?? []).length === 0 ? (
            <div className="mt-6"><EmptyState title="Todo ok" description="Sin alertas de stock." /></div>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {(herrajesBajos.data ?? []).map((h) => {
                const row = h as { nombre: string; tipo: string; stock_disponible: number; precio_unidad: number };
                const critico = row.stock_disponible <= 2;
                return (
                  <li key={row.nombre} className="flex items-center justify-between py-3 text-sm">
                    <div>
                      <p className="font-semibold">{row.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.tipo} · {formatEur(Number(row.precio_unidad))}/ud
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-xs font-bold ${
                        critico
                          ? "bg-red-500/10 text-red-700 dark:text-red-400"
                          : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      }`}
                    >
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

function MermaBox({ label, value, variant }: { label: string; value: string; variant: "emerald" | "red" | "neutral" }) {
  const cls = {
    emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    red: "bg-red-500/10 text-red-700 dark:text-red-400",
    neutral: "bg-muted text-foreground",
  }[variant];
  return (
    <div className={`rounded-xl ${cls} p-3`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] opacity-80">{label}</p>
      <p className="mt-1 font-mono text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}
