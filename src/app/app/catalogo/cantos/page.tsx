import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, Plus, Ruler } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ActivoPill, ToastFromSearchParams, VerSelect, euros } from "../shared";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
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
  nombre: string;
  grosor_mm: number | null;
  precio_ml: number;
  activo: boolean;
  acabados: { nombre: string } | null;
  proveedores: { nombre: string } | null;
};

export default async function CantosPage({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const { ver = "activos" } = await searchParams;
  const supabase = await createClient();
  let q = supabase
    .from("cantos")
    .select("id, nombre, grosor_mm, precio_ml, activo, acabados(nombre), proveedores(nombre)")
    .order("nombre");
  if (ver === "activos") q = q.eq("activo", true);
  if (ver === "inactivos") q = q.eq("activo", false);
  const { data } = await q.returns<Fila[]>();

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <Link href="/app/catalogo" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Catálogo
      </Link>
      <PageHeader
        eyebrow="Catálogo"
        title="Cantos"
        description="Precio por metro lineal según acabado y grosor."
        actions={
          <Link href="/app/catalogo/cantos/nuevo" className={buttonVariants()}>
            <Plus className="h-4 w-4" />
            Nuevo canto
          </Link>
        }
      />
      <div className="mt-6"><VerSelect ver={ver} /></div>
      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {!data || data.length === 0 ? (
          <div className="p-6"><EmptyState icon={Ruler} title="Sin cantos" description="Añade el primer canto con su precio por metro lineal." /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Acabado</TableHead>
                <TableHead>Grosor</TableHead>
                <TableHead className="text-right">Precio / ml</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((c) => (
                <TableRow key={c.id}>
                  <TableCell><Link href={`/app/catalogo/cantos/${c.id}`} className="font-semibold">{c.nombre}</Link></TableCell>
                  <TableCell className="text-muted-foreground">{c.acabados?.nombre ?? "todos"}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{c.grosor_mm ? `${c.grosor_mm} mm` : "todos"}</TableCell>
                  <TableCell className="text-right font-mono font-bold tabular-nums">{euros(c.precio_ml)}</TableCell>
                  <TableCell className="text-muted-foreground">{c.proveedores?.nombre ?? "—"}</TableCell>
                  <TableCell><ActivoPill activo={c.activo} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
