import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { crearGastoProyecto, eliminarGastoProyecto } from "../../gastos-actions";
import { ToastFromSearchParams } from "../../../catalogo/shared";
import { CATEGORIAS_GASTO } from "@/lib/tipos/stock";
import { fmtEur } from "@/lib/tipos/facturas";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

const CAT_LBL = Object.fromEntries(CATEGORIAS_GASTO.map((c) => [c.value, c]));

type Gasto = {
  id: string;
  categoria: string;
  descripcion: string;
  importe_eur: number;
  fecha: string;
  notas: string | null;
  proveedores: { nombre: string } | null;
};

export default async function GastosProyectoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: proyectoId } = await params;
  const s = await createClient();

  const [{ data: proyecto }, { data: gastos }, { data: presupuestos }, { data: proveedores }, { data: pedidosCorte }] = await Promise.all([
    s.from("proyectos").select("id, nombre").eq("id", proyectoId).maybeSingle(),
    s.from("gastos_proyecto")
      .select("id, categoria, descripcion, importe_eur, fecha, notas, proveedores(nombre)")
      .eq("proyecto_id", proyectoId)
      .order("fecha", { ascending: false })
      .returns<Gasto[]>(),
    s.from("presupuestos")
      .select("id, total, estado")
      .eq("proyecto_id", proyectoId)
      .in("estado", ["aceptado", "enviado"]),
    s.from("proveedores").select("id, nombre").eq("activo", true).order("nombre"),
    s.from("pedidos_tableros_corte").select("id, estado, fecha_pedido").eq("proyecto_id", proyectoId).order("fecha_pedido", { ascending: false }),
  ]);

  if (!proyecto) notFound();

  const totalGastos = (gastos ?? []).reduce((a, g) => a + Number(g.importe_eur), 0);
  const totalPresupuesto = (presupuestos ?? []).reduce((a, p) => a + Number(p.total ?? 0), 0);
  const beneficio = totalPresupuesto - totalGastos;
  const margen = totalPresupuesto > 0 ? (beneficio / totalPresupuesto) * 100 : 0;

  // Agrupar por categoría
  const porCategoria = new Map<string, number>();
  for (const g of gastos ?? []) {
    porCategoria.set(g.categoria, (porCategoria.get(g.categoria) ?? 0) + Number(g.importe_eur));
  }

  const crear = async (fd: FormData) => { "use server"; await crearGastoProyecto(proyectoId, fd); };

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <Link href={`/app/proyectos/${proyectoId}`} className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Volver al proyecto
      </Link>

      <PageHeader
        eyebrow="Rentabilidad"
        title="Gastos del proyecto"
        description={(proyecto as { nombre: string }).nombre}
      />

      {/* Stats */}
      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Presupuesto cliente" value={fmtEur(totalPresupuesto)} sub={`${(presupuestos ?? []).length} aceptado(s)/enviado(s)`} />
        <Stat label="Gastos reales" value={fmtEur(totalGastos)} sub={`${(gastos ?? []).length} entrada(s)`} />
        <Stat
          label="Beneficio bruto"
          value={fmtEur(beneficio)}
          sub={`${margen.toFixed(1)}% margen`}
          alert={beneficio < 0}
          good={beneficio > 0}
        />
      </section>

      {/* Resumen por categoría */}
      {porCategoria.size > 0 && (
        <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Por categoría</p>
          <ul className="grid gap-2 sm:grid-cols-3">
            {[...porCategoria.entries()].sort((a, b) => b[1] - a[1]).map(([cat, total]) => (
              <li key={cat} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm">
                <span>{CAT_LBL[cat]?.emoji} {CAT_LBL[cat]?.label ?? cat}</span>
                <span className="font-mono font-bold">{fmtEur(total)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Form alta */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Registrar gasto</p>
        <form action={crear} className="grid gap-3 sm:grid-cols-6">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="categoria">Categoría</Label>
            <select id="categoria" name="categoria" defaultValue="madera" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              {CATEGORIAS_GASTO.map((c) => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-3"><Label htmlFor="descripcion">Descripción *</Label><Input id="descripcion" name="descripcion" required /></div>
          <div className="space-y-1.5"><Label htmlFor="importe_eur">Importe €</Label><Input id="importe_eur" name="importe_eur" type="number" step="0.01" required /></div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="proveedor_id">Proveedor</Label>
            <select id="proveedor_id" name="proveedor_id" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">—</option>
              {(proveedores ?? []).map((p) => <option key={p.id as string} value={p.id as string}>{p.nombre as string}</option>)}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="pedido_corte_id">Pedido de corte</Label>
            <select id="pedido_corte_id" name="pedido_corte_id" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">—</option>
              {(pedidosCorte ?? []).map((p) => <option key={p.id as string} value={p.id as string}>{(p.fecha_pedido as string) ?? "?"} · {p.estado as string}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="fecha">Fecha</Label><Input id="fecha" name="fecha" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></div>
          <div className="space-y-1.5 sm:col-span-6"><Label htmlFor="notas">Notas</Label><Input id="notas" name="notas" /></div>
          <div className="sm:col-span-6"><Button type="submit"><Plus className="h-4 w-4" /> Registrar</Button></div>
        </form>
      </section>

      {/* Listado */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {!gastos || gastos.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">Sin gastos registrados.</p>
        ) : (
          <ul className="divide-y divide-border">
            {gastos.map((g) => {
              const borrar = async () => { "use server"; await eliminarGastoProyecto(proyectoId, g.id); };
              return (
                <li key={g.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-lg">{CAT_LBL[g.categoria]?.emoji ?? "📦"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{g.descripcion}</p>
                    <p className="text-xs text-muted-foreground">
                      {CAT_LBL[g.categoria]?.label ?? g.categoria}
                      {g.proveedores ? ` · ${g.proveedores.nombre}` : ""}
                      {` · ${new Date(g.fecha).toLocaleDateString("es-ES")}`}
                    </p>
                    {g.notas && <p className="text-xs italic text-muted-foreground">{g.notas}</p>}
                  </div>
                  <span className="font-mono font-bold">{fmtEur(Number(g.importe_eur))}</span>
                  <form action={borrar}><Button type="submit" variant="ghost" size="sm" className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button></form>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, sub, alert, good }: { label: string; value: string; sub: string; alert?: boolean; good?: boolean }) {
  const Icon = alert ? TrendingDown : good ? TrendingUp : null;
  return (
    <div className={`rounded-2xl border ${alert ? "border-red-300 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20" : good ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20" : "border-border bg-card"} p-5 shadow-sm`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 inline-flex items-center gap-2 font-mono text-2xl font-bold ${alert ? "text-red-700 dark:text-red-400" : good ? "text-emerald-700 dark:text-emerald-400" : ""}`}>
        {Icon && <Icon className="h-5 w-5" />}
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
