import Link from "next/link";
import { Suspense } from "react";
import { Receipt, Plus, Settings, FileDown, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ToastFromSearchParams } from "../catalogo/shared";
import { ESTADOS_FACTURA, fmtEur, type EstadoFactura } from "@/lib/tipos/facturas";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

const LBL = Object.fromEntries(ESTADOS_FACTURA.map((e) => [e.value, e]));

type Fila = {
  id: string;
  numero_completo: string;
  estado: EstadoFactura;
  tipo: string;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  total: number;
  pagada: boolean;
  clientes: { nombre: string; apellido1: string | null; es_empresa: boolean } | null;
};

export default async function FacturasPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado = "" } = await searchParams;
  const s = await createClient();

  let q = s
    .from("facturas")
    .select("id, numero_completo, estado, tipo, fecha_emision, fecha_vencimiento, total, pagada, clientes(nombre, apellido1, es_empresa)")
    .order("fecha_emision", { ascending: false });
  if (estado) q = q.eq("estado", estado);
  const { data } = await q.returns<Fila[]>();

  const { count: numSeries } = await s.from("series_facturacion").select("id", { count: "exact", head: true });

  // Stats rápidas
  const hoy = new Date().toISOString().slice(0, 10);
  const pendientes = (data ?? []).filter((f) => !f.pagada && (f.estado === "emitida" || f.estado === "enviada"));
  const vencidas = pendientes.filter((f) => f.fecha_vencimiento && f.fecha_vencimiento < hoy);
  const totalPendiente = pendientes.reduce((a, f) => a + Number(f.total), 0);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>

      <PageHeader
        eyebrow="Facturación"
        title="Facturas"
        description="Facturación legal según RD 1619/2012. Numeración correlativa por serie e inmutabilidad tras emisión."
        actions={
          <>
            <Link href="/app/facturas/series" className={buttonVariants({ variant: "outline" })}>
              <Settings className="h-4 w-4" />
              Series
            </Link>
            <a href="/api/facturas/libro-iva" download className={buttonVariants({ variant: "outline" })}>
              <FileDown className="h-4 w-4" />
              Libro IVA
            </a>
          </>
        }
      />

      {(numSeries ?? 0) === 0 && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-300/60 bg-amber-50/50 p-5 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Necesitas configurar al menos una serie de facturación</p>
            <p className="mt-1 text-xs">
              Una serie agrupa la numeración correlativa (p.ej. "F2026"). <Link href="/app/facturas/series" className="underline">Crear serie →</Link>
            </p>
          </div>
        </div>
      )}

      {(numSeries ?? 0) > 0 && (
        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <Stat label="Pendiente cobro" value={fmtEur(totalPendiente)} sub={`${pendientes.length} factura${pendientes.length === 1 ? "" : "s"}`} />
          <Stat label="Vencidas" value={`${vencidas.length}`} sub={fmtEur(vencidas.reduce((a, f) => a + Number(f.total), 0))} alert={vencidas.length > 0} />
          <Stat label="Total facturado" value={fmtEur((data ?? []).reduce((a, f) => a + Number(f.total), 0))} sub={`${data?.length ?? 0} facturas`} />
        </section>
      )}

      <form className="mt-6 flex flex-wrap items-end gap-3">
        <div className="w-[220px] space-y-1.5">
          <label htmlFor="estado" className="text-xs font-medium text-muted-foreground">Estado</label>
          <select id="estado" name="estado" defaultValue={estado} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs">
            <option value="">Todos los estados</option>
            {ESTADOS_FACTURA.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>
        </div>
        <button type="submit" className={buttonVariants({ variant: "outline" })}>Filtrar</button>
      </form>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {!data || data.length === 0 ? (
          <div className="p-6"><EmptyState icon={Receipt} title="Sin facturas" description="Las facturas se crean desde un presupuesto aceptado o desde la ficha del cliente." /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha emisión</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((f) => {
                const meta = LBL[f.estado];
                const venc = f.fecha_vencimiento;
                const vencida = venc && !f.pagada && venc < hoy && (f.estado === "emitida" || f.estado === "enviada");
                const cliNombre = f.clientes
                  ? f.clientes.es_empresa
                    ? f.clientes.nombre
                    : [f.clientes.nombre, f.clientes.apellido1].filter(Boolean).join(" ")
                  : "—";
                return (
                  <TableRow key={f.id}>
                    <TableCell>
                      <Link href={`/app/facturas/${f.id}`} className="font-mono font-semibold">
                        {f.numero_completo}
                      </Link>
                      {f.tipo === "rectificativa" && <Badge variant="secondary" className="ml-2">RECT</Badge>}
                    </TableCell>
                    <TableCell>{cliNombre}</TableCell>
                    <TableCell className="text-xs">{new Date(f.fecha_emision).toLocaleDateString("es-ES")}</TableCell>
                    <TableCell className={`text-xs ${vencida ? "font-bold text-red-600" : ""}`}>
                      {venc ? new Date(venc).toLocaleDateString("es-ES") : "—"}
                      {vencida && " ⚠"}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${meta?.color ?? ""} border-0`}>{meta?.label ?? f.estado}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">{fmtEur(f.total)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, sub, alert }: { label: string; value: string; sub: string; alert?: boolean }) {
  return (
    <div className={`rounded-2xl border ${alert ? "border-red-300 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20" : "border-border bg-card"} p-5 shadow-sm`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-bold ${alert ? "text-red-700 dark:text-red-400" : ""}`}>{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

void Plus; // export usage
