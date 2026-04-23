import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { crearTipo } from "../actions";
import { TipoModuloForm } from "../tipo-form";
import { ToastFromSearchParams } from "../../catalogo/shared";

export const dynamic = "force-dynamic";

export default async function NuevoTipoPage() {
  const s = await createClient();
  const { data: referencias } = await s
    .from("referencias_tablero")
    .select("id, grosor_mm, materiales(nombre), acabados(nombre)")
    .eq("activo", true)
    .order("grosor_mm");

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <nav className="text-sm"><Link href="/app/tipos-modulo" className="text-zinc-500 hover:underline dark:text-zinc-400">← Tipos de módulo</Link></nav>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">Nuevo tipo de módulo</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Crea primero el tipo con sus dimensiones por defecto. Luego podrás añadir piezas y herrajes en la pantalla de detalle.
      </p>
      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        {/* @ts-expect-error relación supabase llega como objeto/array según tipos */}
        <TipoModuloForm referencias={referencias ?? []} action={crearTipo} submitLabel="Crear tipo" />
      </div>
    </div>
  );
}
