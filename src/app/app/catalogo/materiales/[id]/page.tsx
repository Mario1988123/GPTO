import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { actualizar, alternar, eliminar } from "../actions";
import { MaterialForm } from "../form";
import { ActivoPill, CatalogoDetalleActions, CatalogoFormCard, ToastFromSearchParams } from "../../shared";
import type { Material } from "@/lib/tipos/catalogo";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default async function DetalleMaterialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await createClient();
  const { data: m } = await s.from("materiales").select("*").eq("id", id).maybeSingle<Material>();
  if (!m) notFound();

  const update = async (fd: FormData) => { "use server"; await actualizar(id, fd); };
  const toggle = async () => { "use server"; await alternar(id, !m.activo); };
  const del = async () => { "use server"; await eliminar(id); };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <Link href="/app/catalogo/materiales" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Materiales
      </Link>
      <PageHeader eyebrow="Material" title={m.nombre} actions={<ActivoPill activo={m.activo} />} />
      <CatalogoFormCard>
        <MaterialForm material={m} action={update} submitLabel="Guardar cambios" />
      </CatalogoFormCard>
      <CatalogoDetalleActions activo={m.activo} toggle={toggle} del={del} />
    </div>
  );
}
