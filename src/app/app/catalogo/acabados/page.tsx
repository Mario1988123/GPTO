import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, Plus, Palette } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ActivoPill, ToastFromSearchParams, VerSelect } from "../shared";
import type { Acabado } from "@/lib/tipos/catalogo";
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

export default async function AcabadosPage({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const { ver = "activos" } = await searchParams;
  const supabase = await createClient();
  let q = supabase.from("acabados").select("*").order("nombre");
  if (ver === "activos") q = q.eq("activo", true);
  if (ver === "inactivos") q = q.eq("activo", false);
  const { data } = await q.returns<Acabado[]>();

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <Link href="/app/catalogo" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Catálogo
      </Link>
      <PageHeader
        eyebrow="Catálogo"
        title="Acabados"
        description="Colores y texturas disponibles."
        actions={
          <Link href="/app/catalogo/acabados/nuevo" className={buttonVariants()}>
            <Plus className="h-4 w-4" />
            Nuevo acabado
          </Link>
        }
      />
      <div className="mt-6"><VerSelect ver={ver} /></div>
      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {!data || data.length === 0 ? (
          <div className="p-6"><EmptyState icon={Palette} title="Sin acabados" description="Crea el primer acabado con su color y textura." /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Color</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Textura</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <span
                      className="inline-block h-7 w-7 rounded-md border border-border shadow-sm"
                      style={{ backgroundColor: a.color_hex ?? "transparent" }}
                    />
                  </TableCell>
                  <TableCell><Link href={`/app/catalogo/acabados/${a.id}`} className="font-semibold">{a.nombre}</Link></TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{a.codigo ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{a.textura ?? "—"}</TableCell>
                  <TableCell><ActivoPill activo={a.activo} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
