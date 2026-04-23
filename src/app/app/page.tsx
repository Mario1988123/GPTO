import Link from "next/link";
import {
  Users,
  BookOpen,
  Boxes,
  FolderKanban,
  Receipt,
  PackageCheck,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatEur } from "@/lib/tipos/presupuestos";

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

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {/* @ts-expect-error relacion */}
          {usuario?.empresas?.nombre ?? "GPTO"}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Hola, {usuario?.nombre?.split(" ")[0] ?? "admin"} 👋
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Resumen del estado actual del taller.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Clientes activos" value={String(clientesAct.count ?? 0)} Icon={Users} />
        <StatCard label="Proyectos en curso" value={String(proyectosAct.count ?? 0)} Icon={FolderKanban} />
        <StatCard label="Presupuestos abiertos" value={String(presupuestosPend.count ?? 0)} Icon={Receipt} />
        <StatCard label="Pedidos en fabricación" value={String(pedidosEnFab.count ?? 0)} Icon={PackageCheck} accent />
      </section>

      <section className="mt-4 rounded-xl border border-zinc-200 bg-gradient-to-br from-zinc-900 to-zinc-800 p-6 text-white shadow-sm dark:border-zinc-800 dark:from-zinc-100 dark:to-zinc-50 dark:text-zinc-900">
        <p className="text-xs font-medium uppercase tracking-wider opacity-75">Facturado (pedidos fabricados y entregados)</p>
        <p className="mt-2 font-mono text-4xl font-semibold">{formatEur(facturadoTotal)}</p>
      </section>

      <section className="mt-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Gestión</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <NavCard href="/app/clientes" title="Clientes" desc="Gestión de clientes finales" Icon={Users} />
          <NavCard href="/app/catalogo" title="Catálogo" desc="Materiales, acabados, referencias" Icon={BookOpen} />
          <NavCard href="/app/tipos-modulo" title="Tipos de módulo" desc="Plantillas paramétricas" Icon={Boxes} />
          <NavCard href="/app/proyectos" title="Proyectos" desc="Configurador de armarios 2D" Icon={FolderKanban} />
          <NavCard href="/app/presupuestos" title="Presupuestos" desc="Cálculo con IVA y PDF" Icon={Receipt} />
          <NavCard href="/app/pedidos" title="Pedidos" desc="Flujo de fabricación" Icon={PackageCheck} />
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card title="Últimos proyectos" href="/app/proyectos">
          {(ultimosProyectos.data ?? []).length === 0 ? (
            <Empty text="Sin proyectos todavía" />
          ) : (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {((ultimosProyectos.data ?? []) as unknown as { id: string; nombre: string; estado: string; updated_at: string; clientes: { nombre: string } | null }[]).map((p) => (
                <li key={p.id}>
                  <Link href={`/app/proyectos/${p.id}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">{p.nombre}</p>
                      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {p.clientes?.nombre ?? "—"} · {p.estado}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-zinc-400" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Últimos presupuestos" href="/app/presupuestos">
          {(ultimosPresupuestos.data ?? []).length === 0 ? (
            <Empty text="Aún no has creado presupuestos" />
          ) : (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {((ultimosPresupuestos.data ?? []) as unknown as { id: string; numero: string | null; estado: string; total_eur: number; proyectos: { nombre: string } | null }[]).map((p) => (
                <li key={p.id}>
                  <Link href={`/app/presupuestos/${p.id}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs font-medium text-zinc-900 dark:text-zinc-100">
                        {p.numero ?? "(borrador)"} <span className="ml-1 text-[10px] uppercase text-zinc-500">{p.estado}</span>
                      </p>
                      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {p.proyectos?.nombre ?? "—"}
                      </p>
                    </div>
                    <p className="font-mono text-sm font-medium">{formatEur(Number(p.total_eur))}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}

function StatCard({ label, value, Icon, accent = false }: { label: string; value: string; Icon: React.ComponentType<{ className?: string }>; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 shadow-sm transition hover:shadow ${accent ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900" : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"}`}>
      <div className="flex items-start justify-between">
        <p className={`text-xs font-medium uppercase tracking-wider ${accent ? "opacity-75" : "text-zinc-500 dark:text-zinc-400"}`}>{label}</p>
        <Icon className={`h-4 w-4 ${accent ? "opacity-75" : "text-zinc-400 dark:text-zinc-500"}`} />
      </div>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function NavCard({ href, title, desc, Icon }: { href: string; title: string; desc: string; Icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-400 hover:shadow dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
    >
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 transition group-hover:bg-zinc-900 group-hover:text-white dark:bg-zinc-800 dark:text-zinc-300 dark:group-hover:bg-zinc-100 dark:group-hover:text-zinc-900">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className="flex items-center justify-between text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {title}
          <ArrowRight className="h-4 w-4 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-zinc-900 dark:group-hover:text-zinc-100" />
        </p>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{desc}</p>
      </div>
    </Link>
  );
}

function Card({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
        {href ? (
          <Link href={href} className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
            Ver todo →
          </Link>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">{text}</div>;
}
