import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Calendar, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { actualizarPedido, cambiarEstadoPedido } from "../actions";
import { ToastFromSearchParams } from "../../catalogo/shared";
import { ESTADOS_PEDIDO, type Pedido } from "@/lib/tipos/pedidos";
import { formatEur } from "@/lib/tipos/presupuestos";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
    <div className="mx-auto max-w-5xl px-6 py-8">
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
            ? `${ped.proyectos.clientes.nombre} · ${ped.proyectos.nombre}${ped.presupuestos?.numero ? ` · Presupuesto ${ped.presupuestos.numero}` : ""}`
            : undefined
        }
        actions={
          <Badge className={`${ESTADO_VARIANT[ped.estado] ?? ""} border-0`}>
            {EST[ped.estado]?.label}
          </Badge>
        }
      />

      {/* Métricas clave */}
      <section className="mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="p-5">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Fecha pedido
              </p>
            </div>
            <p className="mt-2 font-mono text-xl font-bold tracking-tight">
              {new Date(ped.fecha_pedido).toLocaleDateString("es-ES")}
            </p>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Entrega prevista
              </p>
            </div>
            <p className="mt-2 font-mono text-xl font-bold tracking-tight">
              {ped.fecha_entrega_prevista
                ? new Date(ped.fecha_entrega_prevista).toLocaleDateString("es-ES")
                : "—"}
            </p>
          </div>
          <div className="bg-gradient-to-br from-foreground to-foreground/90 p-5 text-background">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 opacity-70" />
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-70">
                Importe
              </p>
            </div>
            <p className="mt-2 font-mono text-2xl font-bold tracking-tight">
              {formatEur(Number(ped.importe_eur))}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
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
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/15"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="block text-xs font-semibold text-muted-foreground">Notas</label>
            <textarea
              name="notas"
              rows={3}
              defaultValue={ped.notas ?? ""}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/15"
            />
          </div>
          <div className="sm:col-span-2 border-t border-border pt-4">
            <Button type="submit">Guardar cambios</Button>
          </div>
        </form>
      </section>

      <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Flujo
          </p>
          <h2 className="mt-0.5 text-lg font-bold tracking-tight">Cambiar estado</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {ESTADOS_PEDIDO.filter((e) => e.value !== ped.estado).map((e) => {
            const setEstado = async () => { "use server"; await cambiarEstadoPedido(id, e.value); };
            return (
              <form key={e.value} action={setEstado}>
                <Button type="submit" variant="outline" size="sm">
                  → {e.label}
                </Button>
              </form>
            );
          })}
        </div>
      </section>
    </div>
  );
}
