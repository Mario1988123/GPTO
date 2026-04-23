import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { actualizar, alternar, eliminar } from "../actions";
import { CantoForm } from "../form";
import { ActivoPill, ToastFromSearchParams } from "../../shared";
import type { Canto } from "@/lib/tipos/catalogo";

export const dynamic = "force-dynamic";

export default async function DetalleCantoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await createClient();
  const { data: c } = await s.from("cantos").select("*").eq("id", id).maybeSingle<Canto>();
  if (!c) notFound();

  const [{ data: acabados }, { data: proveedores }] = await Promise.all([
    s.from("acabados").select("id, nombre").eq("activo", true).order("nombre"),
    s.from("proveedores").select("id, nombre").eq("activo", true).order("nombre"),
  ]);

  const update = async (fd: FormData) => { "use server"; await actualizar(id, fd); };
  const toggle = async () => { "use server"; await alternar(id, !c.activo); };
  const del = async () => { "use server"; await eliminar(id); };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <nav className="text-sm"><Link href="/app/catalogo/cantos" className="text-zinc-500 hover:underline dark:text-zinc-400">← Cantos</Link></nav>
      <div className="mt-2 flex items-baseline justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">{c.nombre}</h1>
        <ActivoPill activo={c.activo} />
      </div>
      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <CantoForm canto={c} acabados={acabados ?? []} proveedores={proveedores ?? []} action={update} submitLabel="Guardar cambios" />
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <form action={toggle}><button type="submit" className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium dark:border-zinc-700 dark:bg-zinc-950">{c.activo ? "Desactivar" : "Reactivar"}</button></form>
        <form action={del}><button type="submit" className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-zinc-950 dark:text-red-300">Eliminar</button></form>
      </div>
    </div>
  );
}
