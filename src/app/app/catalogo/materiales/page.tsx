import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, Plus, Layers } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ActivoPill, ToastFromSearchParams, VerSelect } from "../shared";
import type { Material } from "@/lib/tipos/catalogo";
import { CATEGORIAS_MATERIAL } from "@/lib/tipos/catalogo";
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

const LABEL = Object.fromEntries(CATEGORIAS_MATERIAL.map((c) => [c.value, c.label]));

export default async function MaterialesPage({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string }>;
}) {
  const { ver = "activos" } = await searchParams;
  const supabase = await createClient();
  let q = supabase.from("materiales").select("*").order("categoria").order("nombre");
  if (ver === "activos") q = q.eq("activo", true);
  if (ver === "inactivos") q = q.eq("activo", false);
  const { data } = await q.returns<Material[]>();

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Suspense>
        <ToastFromSearchParams />
      </Suspense>

      <Link
        href="/app/catalogo"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Catálogo
      </Link>

      <PageHeader
        eyebrow="Catálogo"
        title="Materiales"
        description="Tablero, melamina, DM, MDF, contrachapado..."
        actions={
          <Link href="/app/catalogo/materiales/nuevo" className={buttonVariants()}>
            <Plus className="h-4 w-4" />
            Nuevo material
          </Link>
        }
      />

      <div className="mt-6">
        <VerSelect ver={ver} />
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {!data || data.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Layers} title="Sin materiales" description="Crea el primer material para empezar a construir el catálogo." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <Link href={`/app/catalogo/materiales/${m.id}`} className="font-semibold">
                      {m.nombre}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{LABEL[m.categoria]}</TableCell>
                  <TableCell className="text-muted-foreground">{m.descripcion ?? "—"}</TableCell>
                  <TableCell><ActivoPill activo={m.activo} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
