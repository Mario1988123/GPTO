import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { crear } from "../actions";
import { HerrajeForm } from "../form";
import { ToastFromSearchParams } from "../../shared";

export const dynamic = "force-dynamic";

export default async function NuevoHerrajePage() {
  const s = await createClient();
  const { data: proveedores } = await s.from("proveedores").select("id, nombre").eq("activo", true).order("nombre");

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <nav className="text-sm"><Link href="/app/catalogo/herrajes" className="text-zinc-500 hover:underline dark:text-zinc-400">← Herrajes</Link></nav>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">Nuevo herraje</h1>
      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <HerrajeForm proveedores={proveedores ?? []} action={crear} submitLabel="Crear herraje" />
      </div>
    </div>
  );
}
