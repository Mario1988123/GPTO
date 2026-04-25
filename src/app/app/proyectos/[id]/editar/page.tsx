import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { actualizarProyecto } from "../../actions";
import { ProyectoForm } from "../../proyecto-form";
import { ToastFromSearchParams } from "../../../catalogo/shared";
import type { Proyecto } from "@/lib/tipos/proyectos";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default async function EditarProyectoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const s = await createClient();

  const { data: proyecto } = await s.from("proyectos").select("*").eq("id", id).maybeSingle<Proyecto>();
  if (!proyecto) notFound();

  const { data: clientes } = await s
    .from("clientes")
    .select("id, nombre")
    .eq("activo", true)
    .order("nombre");

  const update = async (fd: FormData) => {
    "use server";
    await actualizarProyecto(id, fd);
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <Suspense>
        <ToastFromSearchParams />
      </Suspense>

      <Link
        href={`/app/proyectos/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver al proyecto
      </Link>

      <PageHeader
        eyebrow="Editar proyecto"
        title={proyecto.nombre}
        description="Cambia el nombre, el cliente o las notas."
      />

      <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <ProyectoForm proyecto={proyecto} clientes={clientes ?? []} action={update} submitLabel="Guardar cambios" />
      </div>
    </div>
  );
}
