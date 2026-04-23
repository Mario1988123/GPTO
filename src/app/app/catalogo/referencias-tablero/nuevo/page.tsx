import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { crear } from "../actions";
import { ReferenciaTableroForm } from "../form";
import { ToastFromSearchParams } from "../../shared";

export const dynamic = "force-dynamic";

export default async function NuevaReferenciaTableroPage() {
  const s = await createClient();
  const [{ data: materiales }, { data: acabados }, { data: proveedores }] = await Promise.all([
    s.from("materiales").select("id, nombre, categoria").eq("activo", true).order("nombre"),
    s.from("acabados").select("id, nombre").eq("activo", true).order("nombre"),
    s.from("proveedores").select("id, nombre").eq("activo", true).order("nombre"),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <nav className="text-sm"><Link href="/app/catalogo/referencias-tablero" className="text-zinc-500 hover:underline dark:text-zinc-400">← Referencias</Link></nav>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">Nueva referencia de tablero</h1>
      {(materiales ?? []).length === 0 || (acabados ?? []).length === 0 ? (
        <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          Necesitas crear al menos un <Link href="/app/catalogo/materiales/nuevo" className="underline">material</Link> y un{" "}
          <Link href="/app/catalogo/acabados/nuevo" className="underline">acabado</Link> antes.
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <ReferenciaTableroForm
            materiales={materiales ?? []}
            acabados={acabados ?? []}
            proveedores={proveedores ?? []}
            action={crear}
            submitLabel="Crear referencia"
          />
        </div>
      )}
    </div>
  );
}
