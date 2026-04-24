import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { crearProyecto } from "../actions";
import { ProyectoForm } from "../proyecto-form";
import { ToastFromSearchParams } from "../../catalogo/shared";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function NuevoProyectoPage() {
  const s = await createClient();
  const { data: clientes } = await s
    .from("clientes")
    .select("id, nombre")
    .eq("activo", true)
    .order("nombre");

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Suspense>
        <ToastFromSearchParams />
      </Suspense>

      <Link
        href="/app/proyectos"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a proyectos
      </Link>

      <PageHeader
        eyebrow="Nuevo registro"
        title="Nuevo proyecto"
        description="Un proyecto se asigna a un cliente y agrupa estancias y armarios."
      />

      {(clientes ?? []).length === 0 ? (
        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Necesitas al menos un cliente activo</p>
            <p className="mt-1 text-xs opacity-80">
              Crea un cliente antes de poder iniciar un proyecto.
            </p>
            <Link href="/app/clientes/nuevo" className={`${buttonVariants({ size: "sm" })} mt-3`}>
              Crear cliente
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <ProyectoForm clientes={clientes ?? []} action={crearProyecto} submitLabel="Crear proyecto" />
        </div>
      )}
    </div>
  );
}
