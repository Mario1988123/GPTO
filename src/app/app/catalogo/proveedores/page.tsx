import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, Plus, Truck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ActivoPill, ToastFromSearchParams, VerSelect } from "../shared";
import type { Proveedor } from "@/lib/tipos/catalogo";
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

export default async function ProveedoresPage({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string }>;
}) {
  const { ver = "activos" } = await searchParams;
  const supabase = await createClient();
  let q = supabase.from("proveedores").select("*").order("nombre");
  if (ver === "activos") q = q.eq("activo", true);
  if (ver === "inactivos") q = q.eq("activo", false);
  const { data } = await q.returns<Proveedor[]>();

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <Link href="/app/catalogo" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Catálogo
      </Link>
      <PageHeader
        eyebrow="Catálogo"
        title="Proveedores"
        description="Tus proveedores de tableros, herrajes y cantos."
        actions={
          <Link href="/app/catalogo/proveedores/nuevo" className={buttonVariants()}>
            <Plus className="h-4 w-4" />
            Nuevo proveedor
          </Link>
        }
      />
      <div className="mt-6">
        <VerSelect ver={ver} />
      </div>
      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {!data || data.length === 0 ? (
          <div className="p-6"><EmptyState icon={Truck} title="Sin proveedores" description="Añade el primer proveedor para empezar." /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell><Link href={`/app/catalogo/proveedores/${p.id}`} className="font-semibold">{p.nombre}</Link></TableCell>
                  <TableCell className="text-muted-foreground">{p.contacto ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.email ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.telefono ?? "—"}</TableCell>
                  <TableCell><ActivoPill activo={p.activo} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
