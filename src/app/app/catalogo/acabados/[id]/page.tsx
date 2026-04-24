import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { actualizar, alternar, eliminar } from "../actions";
import { AcabadoForm } from "../form";
import { ActivoPill, CatalogoDetalleActions, CatalogoFormCard, ToastFromSearchParams } from "../../shared";
import type { Acabado } from "@/lib/tipos/catalogo";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default async function DetalleAcabadoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await createClient();
  const { data: a } = await s.from("acabados").select("*").eq("id", id).maybeSingle<Acabado>();
  if (!a) notFound();

  const update = async (fd: FormData) => { "use server"; await actualizar(id, fd); };
  const toggle = async () => { "use server"; await alternar(id, !a.activo); };
  const del = async () => { "use server"; await eliminar(id); };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <Link href="/app/catalogo/acabados" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Acabados
      </Link>
      <PageHeader
        eyebrow="Acabado"
        title={a.nombre}
        actions={
          <div className="flex items-center gap-3">
            <span
              className="inline-block h-8 w-8 rounded-md border border-border shadow-sm"
              style={{ backgroundColor: a.color_hex ?? "transparent" }}
            />
            <ActivoPill activo={a.activo} />
          </div>
        }
      />
      <CatalogoFormCard>
        <AcabadoForm acabado={a} action={update} submitLabel="Guardar cambios" />
      </CatalogoFormCard>
      <CatalogoDetalleActions activo={a.activo} toggle={toggle} del={del} />
    </div>
  );
}
