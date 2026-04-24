import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { actualizar, alternar, eliminar } from "../actions";
import { ReferenciaTableroForm } from "../form";
import { ActivoPill, CatalogoDetalleActions, CatalogoFormCard, ToastFromSearchParams } from "../../shared";
import type { ReferenciaTablero } from "@/lib/tipos/catalogo";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default async function DetalleReferenciaTableroPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const s = await createClient();
  const { data: r } = await s
    .from("referencias_tablero")
    .select("*")
    .eq("id", id)
    .maybeSingle<ReferenciaTablero>();
  if (!r) notFound();

  const [{ data: materiales }, { data: acabados }, { data: proveedores }] = await Promise.all([
    s.from("materiales").select("id, nombre, categoria").eq("activo", true).order("nombre"),
    s.from("acabados").select("id, nombre").eq("activo", true).order("nombre"),
    s.from("proveedores").select("id, nombre").eq("activo", true).order("nombre"),
  ]);

  const update = async (fd: FormData) => { "use server"; await actualizar(id, fd); };
  const toggle = async () => { "use server"; await alternar(id, !r.activo); };
  const del = async () => { "use server"; await eliminar(id); };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <Link href="/app/catalogo/referencias-tablero" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Referencias
      </Link>
      <PageHeader eyebrow="Referencia tablero" title="Editar referencia" actions={<ActivoPill activo={r.activo} />} />
      <CatalogoFormCard>
        <ReferenciaTableroForm
          referencia={r}
          materiales={materiales ?? []}
          acabados={acabados ?? []}
          proveedores={proveedores ?? []}
          action={update}
          submitLabel="Guardar cambios"
        />
      </CatalogoFormCard>
      <CatalogoDetalleActions activo={r.activo} toggle={toggle} del={del} />
    </div>
  );
}
