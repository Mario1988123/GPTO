import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, Plus, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ActivoPill, ToastFromSearchParams, euros } from "../shared";
import { TIPOS_HERRAJE } from "@/lib/tipos/catalogo";
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

const LABEL_TIPO = Object.fromEntries(TIPOS_HERRAJE.map((t) => [t.value, t.label]));

type Fila = {
  id: string;
  tipo: string;
  nombre: string;
  precio_unidad: number;
  stock_disponible: number;
  activo: boolean;
  proveedores: { nombre: string } | null;
};

export default async function HerrajesPage({ searchParams }: { searchParams: Promise<{ ver?: string; tipo?: string }> }) {
  const { ver = "activos", tipo = "" } = await searchParams;
  const supabase = await createClient();
  let q = supabase
    .from("herrajes")
    .select("id, tipo, nombre, precio_unidad, stock_disponible, activo, proveedores(nombre)")
    .order("tipo")
    .order("nombre");
  if (ver === "activos") q = q.eq("activo", true);
  if (ver === "inactivos") q = q.eq("activo", false);
  if (tipo) q = q.eq("tipo", tipo);
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
        title="Herrajes"
        description="Bisagras, tiradores, guías, patas, portarrollos..."
        actions={
          <Link href="/app/catalogo/herrajes/nuevo" className={buttonVariants()}>
            <Plus className="h-4 w-4" />
            Nuevo herraje
          </Link>
        }
      />

      <form className="mt-6 flex flex-wrap items-end gap-3">
        <div className="w-[180px] space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Ver</label>
          <select name="ver" defaultValue={ver} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/15">
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
            <option value="todos">Todos</option>
          </select>
        </div>
        <div className="w-[200px] space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Tipo</label>
          <select name="tipo" defaultValue={tipo} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/15">
            <option value="">Todos los tipos</option>
            {TIPOS_HERRAJE.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <button type="submit" className="inline-flex h-9 items-center rounded-md border border-border bg-background px-4 text-sm font-medium transition hover:bg-muted">Filtrar</button>
      </form>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {!data || data.length === 0 ? (
          <div className="p-6"><EmptyState icon={Wrench} title="Sin herrajes" description="Añade el primer herraje (bisagra, tirador, guía...)." /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead className="text-right">Precio / ud</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((h) => (
                <TableRow key={h.id}>
                  <TableCell><Badge variant="secondary" className="font-normal">{LABEL_TIPO[h.tipo] ?? h.tipo}</Badge></TableCell>
                  <TableCell><Link href={`/app/catalogo/herrajes/${h.id}`} className="font-semibold">{h.nombre}</Link></TableCell>
                  <TableCell className="text-right font-mono font-bold tabular-nums">{euros(h.precio_unidad)}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    <span className={h.stock_disponible <= 5 ? "text-amber-700 dark:text-amber-400 font-bold" : ""}>
                      {h.stock_disponible}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{h.proveedores?.nombre ?? "—"}</TableCell>
                  <TableCell><ActivoPill activo={h.activo} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
