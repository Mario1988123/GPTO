import Link from "next/link";
import { Suspense } from "react";
import { Receipt, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ToastFromSearchParams } from "../catalogo/shared";
import { ESTADOS_PRESUPUESTO, formatEur, type EstadoPresupuesto } from "@/lib/tipos/presupuestos";
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

const EST = Object.fromEntries(ESTADOS_PRESUPUESTO.map((e) => [e.value, e]));

const ESTADO_VARIANT: Record<string, string> = {
  borrador: "bg-muted text-muted-foreground",
  enviado: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  aceptado: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  rechazado: "bg-red-500/10 text-red-700 dark:text-red-400",
  expirado: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

type Fila = {
  id: string;
  numero: string | null;
  numero_borrador: string | null;
  fecha_emision: string | null;
  estado: EstadoPresupuesto;
  total_eur: number;
  created_at: string;
  proyectos: { nombre: string; clientes: { nombre: string } | null } | null;
};

export default async function PresupuestosPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { estado = "" } = await searchParams;
  const s = await createClient();
  let q = s
    .from("presupuestos")
    .select("id, numero, numero_borrador, fecha_emision, estado, total_eur, created_at, proyectos(nombre, clientes(nombre))")
    .order("created_at", { ascending: false });
  if (estado) q = q.eq("estado", estado);
  const { data } = await q.returns<Fila[]>();

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Suspense>
        <ToastFromSearchParams />
      </Suspense>

      <PageHeader
        eyebrow="Ventas"
        title="Presupuestos"
        description="Cálculo de precio a partir de tableros, cantos, herrajes y mano de obra del proyecto."
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
            {ESTADOS_PRESUPUESTO.map((e) => (
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
              icon={Receipt}
              title="Aún no hay presupuestos"
              description="Entra en un proyecto y pulsa Calcular presupuesto para generar el primero."
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
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((p) => (
                <TableRow key={p.id} className="group">
                  <TableCell>
                    <Link
                      href={`/app/presupuestos/${p.id}`}
                      className="font-mono text-xs font-bold"
                    >
                      {p.numero ?? p.numero_borrador ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">
                    {p.proyectos?.nombre ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.proyectos?.clientes?.nombre ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.fecha_emision
                      ? new Date(p.fecha_emision).toLocaleDateString("es-ES")
                      : new Date(p.created_at).toLocaleDateString("es-ES")}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-bold tabular-nums">
                    {formatEur(Number(p.total_eur))}
                  </TableCell>
                  <TableCell>
                    <Badge className={`${ESTADO_VARIANT[p.estado] ?? ""} border-0`}>
                      {EST[p.estado]?.label ?? p.estado}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/app/presupuestos/${p.id}`}
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
