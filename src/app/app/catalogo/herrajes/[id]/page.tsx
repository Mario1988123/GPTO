import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { actualizar, alternar, eliminar } from "../actions";
import { HerrajeForm } from "../form";
import { ActivoPill, CatalogoDetalleActions, CatalogoFormCard, ToastFromSearchParams } from "../../shared";
import type { Herraje } from "@/lib/tipos/catalogo";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default async function DetalleHerrajePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await createClient();
  const { data: h } = await s.from("herrajes").select("*").eq("id", id).maybeSingle<Herraje>();
  if (!h) notFound();
  const { data: proveedores } = await s.from("proveedores").select("id, nombre").eq("activo", true).order("nombre");

  const update = async (fd: FormData) => { "use server"; await actualizar(id, fd); };
  const toggle = async () => { "use server"; await alternar(id, !h.activo); };
  const del = async () => { "use server"; await eliminar(id); };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <Link href="/app/catalogo/herrajes" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Herrajes
      </Link>
      <PageHeader eyebrow="Herraje" title={h.nombre} actions={<ActivoPill activo={h.activo} />} />
      <CatalogoFormCard>
        <HerrajeForm herraje={h} proveedores={proveedores ?? []} action={update} submitLabel="Guardar cambios" />
      </CatalogoFormCard>
      <CatalogoDetalleActions activo={h.activo} toggle={toggle} del={del} />
    </div>
  );
}
