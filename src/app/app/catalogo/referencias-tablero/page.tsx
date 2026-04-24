import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, Plus, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ActivoPill, ToastFromSearchParams, VerSelect, euros } from "../shared";
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

type Fila = {
  id: string;
  grosor_mm: number;
  precio_m2: number;
  respeta_veta: boolean;
  referencia_proveedor: string | null;
  activo: boolean;
  materiales: { nombre: string; categoria: string } | null;
  acabados: { nombre: string } | null;
  proveedores: { nombre: string } | null;
};

export default async function ReferenciasTableroPage({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string }>;
}) {
  const { ver = "activos" } = await searchParams;
  const supabase = await createClient();
  let q = supabase
    .from("referencias_tablero")
    .select(
      "id, grosor_mm, precio_m2, respeta_veta, referencia_proveedor, activo, materiales(nombre, categoria), acabados(nombre), proveedores(nombre)",
    )
    .order("grosor_mm")
    .order("precio_m2");
  if (ver === "activos") q = q.eq("activo", true);
  if (ver === "inactivos") q = q.eq("activo", false);
  const { data } = await q.returns<Fila[]>();

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <Link href="/app/catalogo" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Catálogo
      </Link>
      <PageHeader
        eyebrow="Catálogo"
        title="Referencias de tablero"
        description="SKU real: material + acabado + grosor + precio por m²."
        actions={
          <Link href="/app/catalogo/referencias-tablero/nuevo" className={buttonVariants()}>
            <Plus className="h-4 w-4" />
            Nueva referencia
          </Link>
        }
      />
      <div className="mt-6"><VerSelect ver={ver} /></div>
      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {!data || data.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Package}
              title="Sin referencias"
              description="Crea primero los materiales y acabados, luego crea referencias combinando ambos con grosor y precio."
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Acabado</TableHead>
                <TableHead>Grosor</TableHead>
                <TableHead className="text-right">Precio / m²</TableHead>
                <TableHead>Veta</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link href={`/app/catalogo/referencias-tablero/${r.id}`} className="font-semibold">
                      {r.materiales?.nombre ?? "—"}
                    </Link>
                    <p className="text-xs text-muted-foreground">{r.materiales?.categoria}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.acabados?.nombre ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{r.grosor_mm} mm</TableCell>
                  <TableCell className="text-right font-mono font-bold tabular-nums">{euros(r.precio_m2)}</TableCell>
                  <TableCell>
                    {r.respeta_veta ? (
                      <Badge className="bg-blue-500/10 text-blue-700 hover:bg-blue-500/15 dark:text-blue-400">Veta</Badge>
                    ) : (
                      <Badge variant="secondary">Libre</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.proveedores?.nombre ?? "—"}</TableCell>
                  <TableCell><ActivoPill activo={r.activo} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
