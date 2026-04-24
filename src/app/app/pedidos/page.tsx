import Link from "next/link";
import { Suspense } from "react";
import { PackageCheck, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ToastFromSearchParams } from "../catalogo/shared";
import { ESTADOS_PEDIDO, type EstadoPedido } from "@/lib/tipos/pedidos";
import { formatEur } from "@/lib/tipos/presupuestos";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

const EST = Object.fromEntries(ESTADOS_PEDIDO.map((e) => [e.value, e]));

const ESTADO_VARIANT: Record<string, string> = {
  pendiente: "bg-muted text-muted-foreground",
  en_fabricacion: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  fabricado: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  entregado: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  cancelado: "bg-red-500/10 text-red-700 dark:text-red-400",
};

type Fila = {
  id: string;
  numero: string | null;
  fecha_pedido: string;
  fecha_entrega_prevista: string | null;
  importe_eur: number;
  estado: EstadoPedido;
  proyectos: { nombre: string; clientes: { nombre: string } | null } | null;
};

export default async function PedidosPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { estado = "" } = await searchParams;
  const s = await createClient();
  let q = s
    .from("pedidos")
    .select("id, numero, fecha_pedido, fecha_entrega_prevista, importe_eur, estado, proyectos(nombre, clientes(nombre))")
    .order("fecha_pedido", { ascending: false });
  if (estado) q = q.eq("estado", estado);
  const { data } = await q.returns<Fila[]>();

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Suspense>
        <ToastFromSearchParams />
      </Suspense>

      <PageHeader
        eyebrow="Fabricación"
        title="Pedidos"
        description="Presupuestos aceptados en fase de fabricación."
      />

      <form className="mt-6 flex flex-wrap items-end gap-3">
        <div className="w-[200px] space-y-1.5">
          <label htmlFor="estado" className="text-xs font-medium text-muted-foreground">
            Estado
          </label>
          <select
            id="estado"
            name="estado"
            defaultValue={estado}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
          >
            <option value="">Todos los estados</option>
            {ESTADOS_PEDIDO.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {!data || data.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={PackageCheck}
              title="Aún no hay pedidos"
              description="Los pedidos se generan automáticamente al aceptar un presupuesto."
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Proyecto</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Entrega</TableHead>
                <TableHead className="text-right">Importe</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((p) => (
                <TableRow key={p.id} className="group">
                  <TableCell>
                    <Link href={`/app/pedidos/${p.id}`} className="font-mono text-xs font-bold">
                      {p.numero ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">{p.proyectos?.nombre ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.proyectos?.clientes?.nombre ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(p.fecha_pedido).toLocaleDateString("es-ES")}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.fecha_entrega_prevista ? new Date(p.fecha_entrega_prevista).toLocaleDateString("es-ES") : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-bold tabular-nums">
                    {formatEur(Number(p.importe_eur))}
                  </TableCell>
                  <TableCell>
                    <Badge className={`${ESTADO_VARIANT[p.estado] ?? ""} border-0`}>
                      {EST[p.estado]?.label ?? p.estado}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/app/pedidos/${p.id}`}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-muted hover:text-foreground"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
