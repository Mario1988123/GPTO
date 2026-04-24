import Link from "next/link";
import {
  Users,
  FolderKanban,
  Receipt,
  PackageCheck,
  Hammer,
  Scissors,
  BookOpen,
  Boxes,
  BarChart3,
  TrendingUp,
  ArrowRight,
  Plus,
  FileText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatEur } from "@/lib/tipos/presupuestos";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
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
    supabase.from("presupuestos").select("id, numero, numero_borrador, estado, total_eur, updated_at, proyectos(nombre)").order("updated_at", { ascending: false }).limit(5),
  ]);

  type PedRow = { importe_eur: number };
  const facturadoTotal = ((totalFacturado.data ?? []) as PedRow[]).reduce((a, p) => a + Number(p.importe_eur), 0);

  const primerNombre = usuario?.nombre?.split(" ")[0] ?? "admin";

  return (
    <div className="mx-auto max-w-7xl p-6 md:p-8 space-y-8">
      {/* Bienvenida */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Hola, {primerNombre} 👋
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Resumen del estado del taller · {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Clientes activos" value={clientesAct.count ?? 0} hint="En la base de datos" icon={Users} />
        <StatCard label="Proyectos en curso" value={proyectosAct.count ?? 0} hint="Abiertos o en fabricación" icon={FolderKanban} />
        <StatCard label="Presupuestos abiertos" value={presupuestosPend.count ?? 0} hint="Borradores + enviados" icon={Receipt} />
        <StatCard label="Pedidos en taller" value={pedidosEnFab.count ?? 0} hint="Pendientes y en fábrica" icon={PackageCheck} />
      </div>

      {/* Facturación */}
      <Card className="overflow-hidden border-slate-200 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white">
        <CardContent className="p-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Facturación histórica
              </p>
              <p className="mt-2 font-mono text-4xl font-bold tracking-tight sm:text-5xl">
                {formatEur(facturadoTotal)}
              </p>
              <p className="mt-2 text-sm text-slate-300">
                Pedidos fabricados y entregados
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-500/25">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Últimos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Últimos proyectos</CardTitle>
                <CardDescription>Los 5 más recientes</CardDescription>
              </div>
              <Link
                href="/app/proyectos"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {(ultimosProyectos.data ?? []).length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">Sin proyectos todavía</p>
            ) : (
              <div className="space-y-3">
                {((ultimosProyectos.data ?? []) as unknown as { id: string; nombre: string; estado: string; clientes: { nombre: string } | null }[]).map((p) => (
                  <Link
                    key={p.id}
                    href={`/app/proyectos/${p.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border bg-slate-50 p-3 transition hover:border-slate-300 hover:bg-white hover:shadow-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900">{p.nombre}</p>
                      <p className="truncate text-xs text-slate-500">
                        {p.clientes?.nombre ?? "—"}
                      </p>
                    </div>
                    <Badge variant="secondary">{p.estado}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Últimos presupuestos</CardTitle>
                <CardDescription>Los 5 más recientes</CardDescription>
              </div>
              <Link
                href="/app/presupuestos"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {(ultimosPresupuestos.data ?? []).length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">Aún no has creado presupuestos</p>
            ) : (
              <div className="space-y-3">
                {((ultimosPresupuestos.data ?? []) as unknown as { id: string; numero: string | null; numero_borrador: string | null; estado: string; total_eur: number; proyectos: { nombre: string } | null }[]).map((p) => (
                  <Link
                    key={p.id}
                    href={`/app/presupuestos/${p.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border bg-slate-50 p-3 transition hover:border-slate-300 hover:bg-white hover:shadow-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-xs font-bold text-slate-900">
                        {p.numero ?? p.numero_borrador ?? "—"}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {p.proyectos?.nombre ?? "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <Badge variant="secondary">{p.estado}</Badge>
                      <span className="font-semibold text-sm tabular-nums">
                        {formatEur(Number(p.total_eur))}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Acciones rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones rápidas</CardTitle>
          <CardDescription>Empieza un nuevo trabajo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <QuickAction href="/app/clientes/nuevo" icon={Users} label="Nuevo cliente" />
            <QuickAction href="/app/proyectos/nuevo" icon={FolderKanban} label="Nuevo proyecto" />
            <QuickAction href="/app/produccion" icon={Hammer} label="Ver producción" />
            <QuickAction href="/app/recortes" icon={Scissors} label="Almacén recortes" />
            <QuickAction href="/app/informes" icon={BarChart3} label="Informes" />
          </div>
        </CardContent>
      </Card>

      {/* Áreas de gestión */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Gestión</h2>
          <p className="text-sm text-slate-500">Todas las áreas del taller</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <NavCard href="/app/clientes" icon={Users} label="Clientes" desc="Gestión CRM" />
          <NavCard href="/app/proyectos" icon={FolderKanban} label="Proyectos" desc="Configurador 3D" />
          <NavCard href="/app/presupuestos" icon={Receipt} label="Presupuestos" desc="IVA y PDF" />
          <NavCard href="/app/pedidos" icon={PackageCheck} label="Pedidos" desc="Confirmados" />
          <NavCard href="/app/produccion" icon={Hammer} label="Producción" desc="Kanban piezas" />
          <NavCard href="/app/recortes" icon={Scissors} label="Recortes" desc="Merma reutilizable" />
          <NavCard href="/app/catalogo" icon={BookOpen} label="Catálogo" desc="Materiales" />
          <NavCard href="/app/tipos-modulo" icon={Boxes} label="Tipos de módulo" desc="Plantillas" />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: LucideIcon;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-700">{label}</CardTitle>
        <Icon className="h-4 w-4 text-slate-500" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

function NavCard({
  href,
  icon: Icon,
  label,
  desc,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-md shadow-blue-500/20 transition group-hover:shadow-lg group-hover:shadow-blue-500/30">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-900">{label}</p>
      <p className="mt-0.5 text-xs text-slate-500">{desc}</p>
    </Link>
  );
}
