import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Trash2, Truck, Calendar, Euro, ClipboardCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { actualizarPedidoCorte, eliminarPedidoCorte } from "../../../pedidos-tableros-actions";
import { ToastFromSearchParams } from "../../../../catalogo/shared";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

const ESTADOS = [
  { v: "borrador",       l: "Borrador",        c: "bg-muted text-muted-foreground" },
  { v: "enviado",        l: "Enviado",         c: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  { v: "confirmado",     l: "Confirmado",      c: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  { v: "en_produccion",  l: "En producción",   c: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  { v: "entregado",      l: "Entregado",       c: "bg-violet-500/10 text-violet-700 dark:text-violet-400" },
  { v: "cancelado",      l: "Cancelado",       c: "bg-red-500/10 text-red-700 dark:text-red-400" },
];

type Pedido = {
  id: string;
  estado: string;
  proveedor_id: string | null;
  fecha_pedido: string | null;
  fecha_entrega_prometida: string | null;
  fecha_entrega_real: string | null;
  coste_total_eur: number | null;
  notas: string | null;
  proveedores: { nombre: string } | null;
};

export default async function DetallePedidoCortePage({
  params,
}: {
  params: Promise<{ id: string; pedidoId: string }>;
}) {
  const { id: proyectoId, pedidoId } = await params;
  const s = await createClient();

  const [{ data: pedido }, { data: proyecto }, { data: tableros }, { data: proveedores }] = await Promise.all([
    s.from("pedidos_tableros_corte").select("*, proveedores(nombre)").eq("id", pedidoId).maybeSingle<Pedido>(),
    s.from("proyectos").select("id, nombre").eq("id", proyectoId).maybeSingle(),
    s.from("tableros_corte")
      .select("id, numero, ancho_mm, alto_mm, area_ocupada_mm2, referencias_tablero(materiales(nombre), grosor_mm)")
      .eq("pedido_id", pedidoId)
      .order("numero"),
    s.from("proveedores").select("id, nombre").eq("activo", true).order("nombre"),
  ]);

  if (!pedido || !proyecto) notFound();

  const estadoMeta = ESTADOS.find((e) => e.v === pedido.estado);

  const update = async (fd: FormData) => { "use server"; await actualizarPedidoCorte(proyectoId, pedidoId, fd); };
  const borrar = async () => { "use server"; await eliminarPedidoCorte(proyectoId, pedidoId); };

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>

      <Link
        href={`/app/proyectos/${proyectoId}`}
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver al proyecto
      </Link>

      <PageHeader
        eyebrow="Pedido de corte"
        title={`Pedido ${pedido.id.slice(0, 8)}`}
        description={`Proyecto · ${(proyecto as { nombre: string }).nombre}`}
        actions={
          <>
            {estadoMeta && (
              <Badge className={`${estadoMeta.c} border-0`}>{estadoMeta.l}</Badge>
            )}
            <Link
              href={`/app/proyectos/${proyectoId}/pedido-corte/${pedidoId}/recepcion`}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-muted"
            >
              <ClipboardCheck className="h-3.5 w-3.5" />
              Recepción & incidencias
            </Link>
            <form action={borrar} className="inline">
              <Button type="submit" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" title="Eliminar pedido">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </form>
          </>
        }
      />

      <form action={update} className="mt-8 grid gap-6 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="estado">Estado</Label>
            <select id="estado" name="estado" defaultValue={pedido.estado} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs">
              {ESTADOS.map((e) => <option key={e.v} value={e.v}>{e.l}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="proveedor_id">Proveedor de corte</Label>
            <select id="proveedor_id" name="proveedor_id" defaultValue={pedido.proveedor_id ?? ""} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs">
              <option value="">— sin asignar —</option>
              {(proveedores ?? []).map((p) => <option key={p.id as string} value={p.id as string}>{p.nombre as string}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fecha_pedido">Fecha del pedido</Label>
            <Input id="fecha_pedido" name="fecha_pedido" type="date" defaultValue={pedido.fecha_pedido ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fecha_entrega_prometida">Entrega prometida</Label>
            <Input id="fecha_entrega_prometida" name="fecha_entrega_prometida" type="date" defaultValue={pedido.fecha_entrega_prometida ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fecha_entrega_real">Entrega real</Label>
            <Input id="fecha_entrega_real" name="fecha_entrega_real" type="date" defaultValue={pedido.fecha_entrega_real ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="coste_total_eur">Coste total (€)</Label>
            <Input id="coste_total_eur" name="coste_total_eur" type="number" step="0.01" defaultValue={pedido.coste_total_eur ?? ""} />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="notas">Notas</Label>
            <Input id="notas" name="notas" defaultValue={pedido.notas ?? ""} placeholder="Ref pedido proveedor, incidencias, etc." />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit">Guardar cambios</Button>
        </div>
      </form>

      {/* Tableros del pedido */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-baseline justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Tableros incluidos</p>
            <h2 className="mt-0.5 text-lg font-bold tracking-tight">
              {tableros?.length ?? 0} tablero{(tableros?.length ?? 0) === 1 ? "" : "s"}
            </h2>
          </div>
          <Link href={`/app/proyectos/${proyectoId}/nesting`} className="text-xs font-medium text-blue-600 hover:underline">
            Ver nesting
          </Link>
        </div>
        {!tableros || tableros.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin tableros ligados. Ejecuta el nesting primero.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {tableros.map((t) => {
              const occ = (t.area_ocupada_mm2 as number) / ((t.ancho_mm as number) * (t.alto_mm as number));
              // @ts-expect-error relación
              const mat = t.referencias_tablero?.materiales?.nombre ?? "?";
              // @ts-expect-error relación
              const grosor = t.referencias_tablero?.grosor_mm ?? "?";
              return (
                <li key={t.id as string} className="flex items-center gap-4 px-4 py-2.5">
                  <span className="font-mono text-sm font-bold">#{t.numero as number}</span>
                  <span className="text-sm">{mat} · {grosor}mm</span>
                  <span className="text-xs text-muted-foreground">{t.ancho_mm}×{t.alto_mm} mm</span>
                  <span className="ml-auto text-xs font-mono">
                    {(occ * 100).toFixed(1)}% ocupación
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Resumen visual */}
      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <InfoCard icon={Truck} label="Proveedor" value={pedido.proveedores?.nombre ?? "Sin asignar"} />
        <InfoCard icon={Calendar} label="Entrega prometida" value={pedido.fecha_entrega_prometida ? new Date(pedido.fecha_entrega_prometida).toLocaleDateString("es-ES") : "—"} />
        <InfoCard icon={Euro} label="Coste total" value={pedido.coste_total_eur != null ? `${Number(pedido.coste_total_eur).toFixed(2)} €` : "—"} />
      </section>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}
