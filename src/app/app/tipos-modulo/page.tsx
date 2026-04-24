import Link from "next/link";
import { Suspense } from "react";
import { Plus, Boxes } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ActivoPill, ToastFromSearchParams, VerSelect } from "../catalogo/shared";
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
  ancho_default_mm: number;
  alto_default_mm: number;
  fondo_default_mm: number;
  horas_fabricacion_default: number;
  activo: boolean;
  tipo_modulo_piezas: { count: number }[];
  tipo_modulo_herrajes: { count: number }[];
};

export default async function TiposModuloPage({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const { ver = "activos" } = await searchParams;
  const supabase = await createClient();
  let q = supabase
    .from("tipos_modulo")
    .select("id, nombre, ancho_default_mm, alto_default_mm, fondo_default_mm, horas_fabricacion_default, activo, tipo_modulo_piezas(count), tipo_modulo_herrajes(count)")
    .order("nombre");
  if (ver === "activos") q = q.eq("activo", true);
  if (ver === "inactivos") q = q.eq("activo", false);
  const { data } = await q.returns<Fila[]>();

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <PageHeader
        eyebrow="Configuración"
        title="Tipos de módulo"
        description="Plantillas paramétricas. Al configurar un armario, cada módulo se basa en uno de estos tipos."
        actions={
          <Link href="/app/tipos-modulo/nuevo" className={buttonVariants()}>
            <Plus className="h-4 w-4" />
            Nuevo tipo
          </Link>
        }
      />
      <div className="mt-6"><VerSelect ver={ver} /></div>
      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {!data || data.length === 0 ? (
          <div className="p-6"><EmptyState icon={Boxes} title="Sin tipos de módulo" description="Crea plantillas como caja, cajonera, zapatero... para usarlas al armar proyectos." /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Dimensiones</TableHead>
                <TableHead className="text-right">Horas</TableHead>
                <TableHead className="text-right">Piezas</TableHead>
                <TableHead className="text-right">Herrajes</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((t) => (
                <TableRow key={t.id}>
                  <TableCell><Link href={`/app/tipos-modulo/${t.id}`} className="font-semibold">{t.nombre}</Link></TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {t.ancho_default_mm}×{t.alto_default_mm}×{t.fondo_default_mm} <span className="opacity-60">mm</span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">{t.horas_fabricacion_default} h</TableCell>
                  <TableCell className="text-right font-mono">{t.tipo_modulo_piezas?.[0]?.count ?? 0}</TableCell>
                  <TableCell className="text-right font-mono">{t.tipo_modulo_herrajes?.[0]?.count ?? 0}</TableCell>
                  <TableCell><ActivoPill activo={t.activo} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
