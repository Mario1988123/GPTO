import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { actualizar, alternar, eliminar } from "../actions";
import { ProveedorForm } from "../form";
import { ActivoPill, CatalogoDetalleActions, CatalogoFormCard, ToastFromSearchParams } from "../../shared";
import type { Proveedor } from "@/lib/tipos/catalogo";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default async function DetalleProveedorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const s = await createClient();
  const { data: p } = await s.from("proveedores").select("*").eq("id", id).maybeSingle<Proveedor>();
  if (!p) notFound();

  const update = async (fd: FormData) => { "use server"; await actualizar(id, fd); };
  const toggle = async () => { "use server"; await alternar(id, !p.activo); };
  const del = async () => { "use server"; await eliminar(id); };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <Link href="/app/catalogo/proveedores" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Proveedores
      </Link>
      <PageHeader eyebrow="Proveedor" title={p.nombre} actions={<ActivoPill activo={p.activo} />} />
      <CatalogoFormCard>
        <ProveedorForm proveedor={p} action={update} submitLabel="Guardar cambios" />
      </CatalogoFormCard>
      <CatalogoDetalleActions activo={p.activo} toggle={toggle} del={del} />
    </div>
  );
}
