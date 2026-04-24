import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  ArrowLeft,
  Calendar,
  TrendingUp,
  Receipt,
  Hammer,
  FileText,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { actualizarPedido, cambiarEstadoPedido } from "../actions";
import { ToastFromSearchParams } from "../../catalogo/shared";
import { ESTADOS_PEDIDO, type Pedido } from "@/lib/tipos/pedidos";
import { formatEur } from "@/lib/tipos/presupuestos";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const EST = Object.fromEntries(ESTADOS_PEDIDO.map((e) => [e.value, e]));

const ESTADO_VARIANT: Record<string, string> = {
  pendiente: "bg-muted text-muted-foreground",
  en_fabricacion: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  fabricado: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  entregado: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  cancelado: "bg-red-500/10 text-red-700 dark:text-red-400",
};

export default async function DetallePedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await createClient();

  const { data: ped } = await s
    .from("pedidos")
    .select("*, proyectos(id, nombre, clientes(nombre, email, telefono, nif)), presupuestos(id, numero)")
    .eq("id", id)
    .maybeSingle<
      Pedido & {
        proyectos: { id: string; nombre: string; clientes: { nombre: string; email: string | null; telefono: string | null; nif: string | null } | null } | null;
        presupuestos: { id: string; numero: string | null } | null;
      }
    >();
  if (!ped) notFound();

  const upd = async (fd: FormData) => { "use server"; await actualizarPedido(id, fd); };

  // Fecha estimada vs hoy (para alerta visual)
  const hoy = new Date().toISOString().slice(0, 10);
  const retrasado =
    ped.fecha_entrega_prevista &&
    ped.fecha_entrega_prevista < hoy &&
    ped.estado !== "entregado" &&
    ped.estado !== "cancelado";

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Suspense>
        <ToastFromSearchParams />
      </Suspense>

      <Link
        href="/app/pedidos"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a pedidos
      </Link>

      <PageHeader
        eyebrow="Pedido"
        title={ped.numero ?? "Pedido"}
        description={
          ped.proyectos?.clientes?.nombre
            ? `${ped.proyectos.clientes.nombre} · ${ped.proyectos.nombre}`
            : undefined
        }
        actions={
          <>
            <Badge className={`${ESTADO_VARIANT[ped.estado] ?? ""} border-0`}>
              {EST[ped.estado]?.label}
            </Badge>
            {retrasado ? (
              <Badge className="bg-red-500/10 text-red-700 border-0">⚠ Retrasado</Badge>
            ) : null}
          </>
        }
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6 min-w-0">
          {/* Fechas */}
          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="grid divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <div className="p-5">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Fecha pedido
                  </p>
                </div>
                <p className="mt-2 font-mono text-xl font-bold tracking-tight">
                  {new Date(ped.fecha_pedido).toLocaleDateString("es-ES")}
                </p>
              </div>
              <div className={`p-5 ${retrasado ? "bg-red-50" : ""}`}>
                <div className="flex items-center gap-2">
                  <Calendar className={`h-3.5 w-3.5 ${retrasado ? "text-red-600" : "text-slate-500"}`} />
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Entrega prevista
                  </p>
                </div>
                <p className={`mt-2 font-mono text-xl font-bold tracking-tight ${retrasado ? "text-red-700" : ""}`}>
                  {ped.fecha_entrega_prevista
                    ? new Date(ped.fecha_entrega_prevista).toLocaleDateString("es-ES")
                    : "—"}
                </p>
              </div>
            </div>
          </section>

          {/* Datos editables */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="mb-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Gestión
              </p>
              <h2 className="mt-0.5 text-lg font-bold tracking-tight">Datos del pedido</h2>
            </div>
            <form action={upd} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-muted-foreground">
                  Fecha entrega prevista
                </label>
                <input
                  name="fecha_entrega_prevista"
                  type="date"
                  defaultValue={ped.fecha_entrega_prevista ?? ""}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="block text-xs font-semibold text-muted-foreground">Notas</label>
                <textarea
                  name="notas"
                  rows={3}
                  defaultValue={ped.notas ?? ""}
                  placeholder="Información adicional, acuerdos con el cliente, instrucciones de entrega..."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs"
                />
              </div>
              <div className="sm:col-span-2 border-t border-border pt-4">
                <Button type="submit">Guardar cambios</Button>
              </div>
            </form>
          </section>

          {/* Flujo estado */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="mb-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Flujo
              </p>
              <h2 className="mt-0.5 text-lg font-bold tracking-tight">Cambiar estado</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Cada cambio se refleja automáticamente en el proyecto.
              </p>
            </div>
            {/* Estado actual destacado */}
            <div className="mb-4 flex items-center gap-3 rounded-lg bg-muted/30 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Actual:
              </span>
              <Badge className={`${ESTADO_VARIANT[ped.estado] ?? ""} border-0`}>
                {EST[ped.estado]?.label}
              </Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ESTADOS_PEDIDO.filter((e) => e.value !== ped.estado).map((e) => {
                const setEstado = async () => { "use server"; await cambiarEstadoPedido(id, e.value); };
                return (
                  <form key={e.value} action={setEstado}>
                    <Button type="submit" variant="outline" size="sm" className="w-full justify-start">
                      → {e.label}
                    </Button>
                  </form>
                );
              })}
            </div>
          </section>

          {/* Acciones relacionadas */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="mb-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Navegar
              </p>
              <h2 className="mt-0.5 text-lg font-bold tracking-tight">Enlaces relacionados</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {ped.proyectos ? (
                <Link
                  href={`/app/proyectos/${ped.proyectos.id}`}
                  className="group rounded-xl border border-border bg-muted/20 p-4 transition hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md"
                >
                  <FileText className="h-5 w-5 text-slate-500 group-hover:text-foreground" />
                  <p className="mt-2 text-sm font-semibold">Proyecto</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{ped.proyectos.nombre}</p>
                </Link>
              ) : null}
              {ped.presupuestos ? (
                <Link
                  href={`/app/presupuestos/${ped.presupuestos.id}`}
                  className="group rounded-xl border border-border bg-muted/20 p-4 transition hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md"
                >
                  <Receipt className="h-5 w-5 text-slate-500 group-hover:text-foreground" />
                  <p className="mt-2 text-sm font-semibold">Presupuesto origen</p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {ped.presupuestos.numero ?? "—"}
                  </p>
                </Link>
              ) : null}
              <Link
                href={`/app/produccion?pedido=${id}`}
                className="group rounded-xl border border-border bg-muted/20 p-4 transition hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md"
              >
                <Hammer className="h-5 w-5 text-slate-500 group-hover:text-foreground" />
                <p className="mt-2 text-sm font-semibold">Ver producción</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Kanban de piezas</p>
              </Link>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="sticky top-6 space-y-4">
            {/* Importe destacado */}
            <div className="overflow-hidden rounded-2xl border border-border shadow-lg">
              <div className="bg-gradient-to-br from-foreground to-foreground/90 p-6 text-background">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-3.5 w-3.5 opacity-70" />
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-70">
                    Importe
                  </p>
                </div>
                <p className="mt-2 font-mono text-3xl font-bold tracking-tight tabular-nums">
                  {formatEur(Number(ped.importe_eur))}
                </p>
                <p className="mt-1 text-xs opacity-70">
                  Copiado del presupuesto al aceptar
                </p>
              </div>
              {ped.presupuestos?.numero ? (
                <Link
                  href={`/app/presupuestos/${ped.presupuestos.id}`}
                  className={`${buttonVariants({ variant: "outline", size: "sm" })} w-full rounded-none border-x-0 border-b-0`}
                >
                  <Receipt className="h-3.5 w-3.5" />
                  Ver {ped.presupuestos.numero}
                </Link>
              ) : null}
            </div>

            {/* Cliente */}
            {ped.proyectos?.clientes ? (
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Cliente
                </p>
                <p className="mt-1 font-bold text-slate-900">{ped.proyectos.clientes.nombre}</p>
                {ped.proyectos.clientes.nif ? (
                  <p className="font-mono text-xs text-muted-foreground">{ped.proyectos.clientes.nif}</p>
                ) : null}
                <div className="mt-2 space-y-0.5 text-xs">
                  {ped.proyectos.clientes.email ? (
                    <a
                      href={`mailto:${ped.proyectos.clientes.email}`}
                      className="block text-blue-600 hover:underline"
                    >
                      {ped.proyectos.clientes.email}
                    </a>
                  ) : null}
                  {ped.proyectos.clientes.telefono ? (
                    <a
                      href={`tel:${ped.proyectos.clientes.telefono}`}
                      className="block text-blue-600 hover:underline"
                    >
                      {ped.proyectos.clientes.telefono}
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
