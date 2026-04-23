import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { crearProyecto } from "../actions";
import { ProyectoForm } from "../proyecto-form";
import { ToastFromSearchParams } from "../../catalogo/shared";

export const dynamic = "force-dynamic";

export default async function NuevoProyectoPage() {
  const s = await createClient();
  const { data: clientes } = await s.from("clientes").select("id, nombre").eq("activo", true).order("nombre");

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <nav className="text-sm"><Link href="/app/proyectos" className="text-zinc-500 hover:underline dark:text-zinc-400">← Proyectos</Link></nav>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">Nuevo proyecto</h1>
      {(clientes ?? []).length === 0 ? (
        <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          Necesitas al menos un <Link href="/app/clientes/nuevo" className="underline">cliente</Link> activo antes de crear un proyecto.
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <ProyectoForm clientes={clientes ?? []} action={crearProyecto} submitLabel="Crear proyecto" />
        </div>
      )}
    </div>
  );
}
