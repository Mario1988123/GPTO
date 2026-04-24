import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { crearCliente } from "../actions";
import { ClienteForm } from "../cliente-form";
import { ToastFromSearchParams } from "../toasts";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default function NuevoClientePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Suspense>
        <ToastFromSearchParams />
      </Suspense>

      <Link
        href="/app/clientes"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a clientes
      </Link>

      <PageHeader
        eyebrow="Nuevo registro"
        title="Nuevo cliente"
        description="Rellena los datos básicos para poder crear proyectos y facturar."
      />

      <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <ClienteForm action={crearCliente} submitLabel="Crear cliente" />
      </div>
    </div>
  );
}
