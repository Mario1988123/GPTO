import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Power, Trash2, FolderPlus, Building2, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { actualizarCliente, alternarActivo, eliminarCliente } from "../actions";
import { ClienteForm } from "../cliente-form";
import { ToastFromSearchParams } from "../toasts";
import type { Cliente } from "@/lib/tipos/cliente";
import { nombreCompletoCliente } from "@/lib/tipos/cliente";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function DetalleClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: cliente, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", id)
    .maybeSingle<Cliente>();

  if (error || !cliente) notFound();

  const actualizar = async (formData: FormData) => {
    "use server";
    await actualizarCliente(id, formData);
  };

  const toggle = async () => {
    "use server";
    await alternarActivo(id, !cliente.activo);
  };

  const borrar = async () => {
    "use server";
    await eliminarCliente(id);
  };

  const tituloCompleto = nombreCompletoCliente(cliente);

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
        eyebrow={cliente.es_empresa ? "Empresa" : "Particular"}
        title={tituloCompleto}
        description={cliente.nif ? `NIF · ${cliente.nif}` : undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {cliente.es_empresa ? <Building2 className="h-4 w-4 text-blue-600" /> : <User className="h-4 w-4 text-muted-foreground" />}
            {cliente.activo ? (
              <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400">Activo</Badge>
            ) : (
              <Badge variant="secondary">Inactivo</Badge>
            )}
            <Link
              href={`/app/proyectos/nuevo?cliente_id=${cliente.id}`}
              className={buttonVariants({ size: "sm", className: "bg-gradient-to-br from-blue-500 to-cyan-400 text-white hover:shadow-lg hover:shadow-blue-500/30" })}
            >
              <FolderPlus className="h-3.5 w-3.5" />
              Crear proyecto
            </Link>
            <form action={toggle} className="inline">
              <Button type="submit" variant="outline" size="sm">
                <Power className="h-3.5 w-3.5" />
                {cliente.activo ? "Desactivar" : "Reactivar"}
              </Button>
            </form>
            <form action={borrar} className="inline">
              <Button type="submit" variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
                Eliminar
              </Button>
            </form>
          </div>
        }
      />

      <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <ClienteForm
          cliente={cliente}
          action={actualizar}
          submitLabel="Guardar cambios"
        />
      </div>

      <p className="mt-4 text-right text-xs text-muted-foreground">
        Creado {new Date(cliente.created_at).toLocaleDateString("es-ES")}
      </p>
    </div>
  );
}
