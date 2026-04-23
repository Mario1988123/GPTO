import Link from "next/link";
import {
  Users,
  BookOpen,
  Boxes,
  FolderKanban,
  Receipt,
  PackageCheck,
  Hammer,
  Scissors,
  BarChart3,
  Settings,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatEur } from "@/lib/tipos/presupuestos";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AppHomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("nombre, rol, empresas(nombre)")
    .eq("id", user!.id)
    .maybeSingle();

  const [clientesAct, proyectosAct, presupuestosPend, pedidosEnFab, totalFacturado, ultimosProyectos, ultimosPresupuestos] = await Promise.all([
    supabase.from("clientes").select("*", { count: "exact", head: true }).eq("activo", true),
    supabase.from("proyectos").select("*", { count: "exact", head: true }).in("estado", ["borrador", "presupuestado", "confirmado", "en_fabricacion"]),
    supabase.from("presupuestos").select("*", { count: "exact", head: true }).in("estado", ["borrador", "enviado"]),
    supabase.from("pedidos").select("*", { count: "exact", head: true }).in("estado", ["pendiente", "en_fabricacion", "fabricado"]),
    supabase.from("pedidos").select("importe_eur").in("estado", ["fabricado", "entregado"]),
    supabase.from("proyectos").select("id, nombre, estado, updated_at, clientes(nombre)").order("updated_at", { ascending: false }).limit(5),
    supabase.from("presupuestos").select("id, numero, estado, total_eur, updated_at, proyectos(nombre)").order("updated_at", { ascending: false }).limit(5),
  ]);

  type PedRow = { importe_eur: number };
  const facturadoTotal = ((totalFacturado.data ?? []) as PedRow[]).reduce((a, p) => a + Number(p.importe_eur), 0);

  // @ts-expect-error relacion
  const empresaNombre = usuario?.empresas?.nombre ?? "GPTO";
  const primerNombre = usuario?.nombre?.split(" ")[0] ?? "admin";

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 lg:py-10">
      <PageHeader
        eyebrow={empresaNombre}
        title={`Hola, ${primerNombre}`}
        description="Resumen del estado actual del taller."
      />

      {/* KPIs */}
      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Clientes activos" value={clientesAct.count ?? 0} icon={Users} />
        <StatCard label="Proyectos en curso" value={proyectosAct.count ?? 0} icon={FolderKanban} />
        <StatCard label="Presupuestos abiertos" value={presupuestosPend.count ?? 0} icon={Receipt} />
        <StatCard label="Pedidos en fabricación" value={pedidosEnFab.count ?? 0} icon={PackageCheck} variant="accent" />
      </section>

      {/* Banner facturación */}
      <section className="relative mt-6 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-foreground via-foreground to-sidebar-primary p-6 text-background shadow-xl lg:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,_rgba(255,255,255,0.15)_0%,_transparent_50%)]" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-70">
              Facturado · pedidos fabricados y entregados
            </p>
            <p className="mt-2 font-mono text-4xl font-bold tracking-tight sm:text-5xl">
              {formatEur(facturadoTotal)}
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-background/10 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm">
            <TrendingUp className="h-3.5 w-3.5" />
            Acumulado histórico
          </div>
        </div>
      </section>

      {/* Gestión */}
      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Áreas de trabajo
            </p>
            <h2 className="mt-0.5 text-lg font-bold tracking-tight">Gestión diaria</h2>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <NavCard href="/app/clientes" title="Clientes" desc="Gestión de clientes finales" icon={Users} />
          <NavCard href="/app/proyectos" title="Proyectos" desc="Configurador 3D + estancias" icon={FolderKanban} />
          <NavCard href="/app/presupuestos" title="Presupuestos" desc="Cálculo con IVA y PDF" icon={Receipt} />
          <NavCard href="/app/pedidos" title="Pedidos" desc="Flujo de fabricación" icon={PackageCheck} />
          <NavCard href="/app/produccion" title="Producción" desc="Kanban de piezas con QR" icon={Hammer} accent />
          <NavCard href="/app/recortes" title="Recortes" desc="Almacén de merma reutilizable" icon={Scissors} />
          <NavCard href="/app/catalogo" title="Catálogo" desc="Materiales, acabados, herrajes" icon={BookOpen} />
          <NavCard href="/app/tipos-modulo" title="Tipos de módulo" desc="Plantillas paramétricas" icon={Boxes} />
          <NavCard href="/app/informes" title="Informes" desc="Facturación, merma, conversión" icon={BarChart3} />
        </div>
      </section>

      {/* Actividad reciente */}
      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <ActivityCard title="Últimos proyectos" href="/app/proyectos" icon={FolderKanban}>
          {(ultimosProyectos.data ?? []).length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="Sin proyectos todavía"
              description="Crea el primer proyecto para empezar a diseñar armarios."
            />
          ) : (
            <ul className="divide-y divide-border">
              {((ultimosProyectos.data ?? []) as unknown as { id: string; nombre: string; estado: string; updated_at: string; clientes: { nombre: string } | null }[]).map((p) => (
                <li key={p.id}>
                  <Link href={`/app/proyectos/${p.id}`} className="group flex items-center justify-between gap-3 px-5 py-3.5 text-sm transition hover:bg-muted/50">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{p.nombre}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {p.clientes?.nombre ?? "—"}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                      {p.estado}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </ActivityCard>

        <ActivityCard title="Últimos presupuestos" href="/app/presupuestos" icon={Receipt}>
          {(ultimosPresupuestos.data ?? []).length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="Aún no has creado presupuestos"
              description="Al aceptar un proyecto se generará automáticamente."
            />
          ) : (
            <ul className="divide-y divide-border">
              {((ultimosPresupuestos.data ?? []) as unknown as { id: string; numero: string | null; estado: string; total_eur: number; proyectos: { nombre: string } | null }[]).map((p) => (
                <li key={p.id}>
                  <Link href={`/app/presupuestos/${p.id}`} className="group flex items-center justify-between gap-3 px-5 py-3.5 text-sm transition hover:bg-muted/50">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-xs font-bold">
                        {p.numero ?? "(borrador)"}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {p.proyectos?.nombre ?? "—"}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                      {p.estado}
                    </Badge>
                    <p className="font-mono text-sm font-bold tabular-nums">{formatEur(Number(p.total_eur))}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </ActivityCard>
      </section>

      {/* Ajustes discreto */}
      <section className="mt-10 pb-8">
        <Link
          href="/app/ajustes"
          className="flex items-center justify-between rounded-xl border border-dashed border-border bg-muted/30 px-5 py-4 text-sm transition hover:border-foreground/20 hover:bg-muted/50"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background text-muted-foreground ring-1 ring-border">
              <Settings className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">Ajustes de la empresa</p>
              <p className="text-xs text-muted-foreground">IVA, datos fiscales, numeración, usuarios</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </section>
    </div>
  );
}

function NavCard({
  href,
  title,
  desc,
  icon: Icon,
  accent = false,
}: {
  href: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group relative overflow-hidden rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg ${
        accent
          ? "border-foreground/20 bg-gradient-to-br from-card to-muted shadow-sm"
          : "border-border bg-card hover:border-foreground/20"
      }`}
    >
      {accent ? (
        <div className="absolute right-0 top-0 h-16 w-16 -translate-y-1/2 translate-x-1/2 rounded-full bg-sidebar-primary/10 blur-2xl" />
      ) : null}
      <div className="relative flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition ${
            accent
              ? "bg-foreground text-background shadow-md shadow-foreground/20"
              : "bg-muted text-foreground group-hover:bg-foreground group-hover:text-background"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-base font-bold tracking-tight">{title}</p>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
    </Link>
  );
}

function ActivityCard({
  title,
  href,
  icon: Icon,
  children,
}: {
  title: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2">
          {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
          <h3 className="text-sm font-bold tracking-tight">{title}</h3>
        </div>
        {href ? (
          <Link
            href={href}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            Ver todo
            <ArrowRight className="h-3 w-3" />
          </Link>
        ) : null}
      </div>
      {children}
    </div>
  );
}
