import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { actualizarCliente, alternarActivo, eliminarCliente } from "../actions";
import { ClienteForm } from "../cliente-form";
import { ToastFromSearchParams } from "../toasts";
import type { Cliente } from "@/lib/tipos/cliente";

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

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Suspense>
        <ToastFromSearchParams />
      </Suspense>

      <nav className="text-sm">
        <Link
          href="/app/clientes"
          className="text-zinc-500 hover:underline dark:text-zinc-400"
        >
          ← Clientes
        </Link>
      </nav>

      <div className="mt-2 flex items-baseline justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {cliente.nombre}
        </h1>
        {cliente.activo ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            activo
          </span>
        ) : (
          <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
            inactivo
          </span>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <ClienteForm
          cliente={cliente}
          action={actualizar}
          submitLabel="Guardar cambios"
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <form action={toggle}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            {cliente.activo ? "Desactivar" : "Reactivar"}
          </button>
        </form>
        <form action={borrar}>
          <button
            type="submit"
            className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50 dark:border-red-900 dark:bg-zinc-950 dark:text-red-300 dark:hover:bg-red-950/50"
          >
            Eliminar
          </button>
        </form>
        <p className="ml-auto text-xs text-zinc-500 dark:text-zinc-400">
          Creado {new Date(cliente.created_at).toLocaleDateString("es-ES")}
        </p>
      </div>
    </div>
  );
}
