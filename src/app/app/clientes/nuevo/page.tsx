import Link from "next/link";
import { Suspense } from "react";
import { crearCliente } from "../actions";
import { ClienteForm } from "../cliente-form";
import { ToastFromSearchParams } from "../toasts";

export const dynamic = "force-dynamic";

export default function NuevoClientePage() {
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

      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        Nuevo cliente
      </h1>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <ClienteForm action={crearCliente} submitLabel="Crear cliente" />
      </div>
    </div>
  );
}
