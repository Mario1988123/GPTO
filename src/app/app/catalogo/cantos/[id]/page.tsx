import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { actualizar, alternar, eliminar } from "../actions";
import { CantoForm } from "../form";
import { ActivoPill, CatalogoDetalleActions, CatalogoFormCard, ToastFromSearchParams } from "../../shared";
import type { Canto } from "@/lib/tipos/catalogo";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default async function DetalleCantoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await createClient();
  const { data: c } = await s.from("cantos").select("*").eq("id", id).maybeSingle<Canto>();
  if (!c) notFound();

  const [{ data: acabados }, { data: proveedores }] = await Promise.all([
    s.from("acabados").select("id, nombre, color_hex, foto_url").eq("activo", true).order("nombre"),
    s.from("proveedores").select("id, nombre").eq("activo", true).order("nombre"),
  ]);

  const update = async (fd: FormData) => { "use server"; await actualizar(id, fd); };
  const toggle = async () => { "use server"; await alternar(id, !c.activo); };
  const del = async () => { "use server"; await eliminar(id); };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <Link href="/app/catalogo/cantos" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Cantos
      </Link>
      <PageHeader eyebrow="Canto" title={c.nombre} actions={<ActivoPill activo={c.activo} />} />
      <CatalogoFormCard>
        <CantoForm canto={c} acabados={acabados ?? []} proveedores={proveedores ?? []} action={update} submitLabel="Guardar cambios" />
      </CatalogoFormCard>
      <CatalogoDetalleActions activo={c.activo} toggle={toggle} del={del} />
    </div>
  );
}
