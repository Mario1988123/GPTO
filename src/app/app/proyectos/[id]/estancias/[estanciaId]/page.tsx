import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  actualizarEstancia,
  crearArmarioEnEstancia,
  eliminarEstancia,
} from "../../../estancias-actions";
import { ToastFromSearchParams } from "../../../../catalogo/shared";
import { TIPOS_ESTANCIA, TIPOS_INSTALACION, type Estancia } from "@/lib/tipos/estancias";
import type { Armario, Proyecto } from "@/lib/tipos/proyectos";

export const dynamic = "force-dynamic";

const TIPO_LBL = Object.fromEntries(TIPOS_ESTANCIA.map((t) => [t.value, t]));

export default async function DetalleEstanciaPage({
  params,
}: {
  params: Promise<{ id: string; estanciaId: string }>;
}) {
  const { id: proyectoId, estanciaId } = await params;
  const s = await createClient();

  const [{ data: proyecto }, { data: estancia }, { data: armarios }] = await Promise.all([
    s.from("proyectos").select("*").eq("id", proyectoId).maybeSingle<Proyecto>(),
    s.from("estancias").select("*").eq("id", estanciaId).maybeSingle<Estancia>(),
    s.from("armarios").select("*").eq("estancia_id", estanciaId).order("orden").returns<Armario[]>(),
  ]);

  if (!proyecto || !estancia) notFound();

  const updEst = async (fd: FormData) => { "use server"; await actualizarEstancia(proyectoId, estanciaId, fd); };
  const delEst = async () => { "use server"; await eliminarEstancia(proyectoId, estanciaId); };
  const addArm = async (fd: FormData) => { "use server"; await crearArmarioEnEstancia(proyectoId, estanciaId, fd); };

  const tipoInfo = TIPO_LBL[estancia.tipo];

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <nav className="text-sm space-x-2">
        <Link href="/app/proyectos" className="text-zinc-500 hover:underline dark:text-zinc-400">Proyectos</Link>
        <span className="text-zinc-400">/</span>
        <Link href={`/app/proyectos/${proyectoId}`} className="text-zinc-500 hover:underline dark:text-zinc-400">{proyecto.nombre}</Link>
      </nav>

      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        {tipoInfo?.emoji ?? ""} {estancia.nombre}
      </h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        {tipoInfo?.label ?? estancia.tipo}
        {estancia.largo_mm || estancia.ancho_mm || estancia.alto_mm ? (
          <> · {estancia.largo_mm ?? "—"} × {estancia.ancho_mm ?? "—"} × {estancia.alto_mm ?? "—"} mm</>
        ) : null}
      </p>

      {/* Datos de la estancia */}
      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-medium">Datos de la estancia</h2>
        <form action={updEst} className="grid gap-3 sm:grid-cols-5">
          <div className="sm:col-span-2 space-y-1">
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Nombre *</label>
            <input name="nombre" required defaultValue={estancia.nombre} className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
          <div className="sm:col-span-2 space-y-1">
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Tipo</label>
            <select name="tipo" defaultValue={estancia.tipo} className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950">
              {TIPOS_ESTANCIA.map((t) => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Largo estancia (mm)</label>
            <input name="largo_mm" type="number" placeholder="opcional" defaultValue={estancia.largo_mm ?? ""} className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Ancho estancia (mm)</label>
            <input name="ancho_mm" type="number" placeholder="opcional" defaultValue={estancia.ancho_mm ?? ""} className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Alto estancia (mm)</label>
            <input name="alto_mm" type="number" placeholder="opcional" defaultValue={estancia.alto_mm ?? ""} className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
          <div className="sm:col-span-5 space-y-1">
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Notas</label>
            <textarea name="notas" rows={2} defaultValue={estancia.notas ?? ""} className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
          <div className="sm:col-span-5 flex items-center gap-3">
            <button type="submit" className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">Guardar</button>
            <form action={delEst} className="inline">
              <button type="submit" className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-zinc-950 dark:text-red-300">Eliminar estancia</button>
            </form>
          </div>
        </form>
      </section>

      {/* Armarios */}
      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-medium">Armarios ({(armarios ?? []).length})</h2>
        {(armarios ?? []).length === 0 ? (
          <p className="rounded-md bg-zinc-50 p-4 text-sm text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">Sin armarios. Añade el primero abajo.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {(armarios ?? []).map((a) => (
              <li key={a.id}>
                <Link href={`/app/proyectos/${proyectoId}/armarios/${a.id}`} className="block rounded-lg border border-zinc-200 p-4 transition hover:border-zinc-400 hover:shadow-sm dark:border-zinc-800 dark:hover:border-zinc-600">
                  <div className="flex items-baseline justify-between">
                    <p className="font-medium">{a.nombre}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${a.tipo_instalacion === "empotrado" ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"}`}>
                      {a.tipo_instalacion === "empotrado" ? "empotrado" : "suelto"}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                    {a.ancho_total_mm} × {a.alto_total_mm} × {a.fondo_mm} mm
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <form action={addArm} className="mt-5 grid gap-3 rounded-lg border border-dashed border-zinc-300 p-4 sm:grid-cols-6 dark:border-zinc-700">
          <div className="sm:col-span-2 space-y-1">
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Tipo instalación</label>
            <select name="tipo_instalacion" defaultValue="suelto" className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950">
              {TIPOS_INSTALACION.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Tapeta (mm)</label>
            <input name="margen_tapeta_mm" type="number" min="0" max="50" defaultValue="5" className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
          <div className="sm:col-span-3 space-y-1">
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Nombre</label>
            <input name="nombre" defaultValue="Armario" className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
          <div className="sm:col-span-2 space-y-1">
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Ancho (mm) *</label>
            <input name="ancho_total_mm" type="number" required defaultValue="2400" className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
          <div className="sm:col-span-2 space-y-1">
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Alto (mm) *</label>
            <input name="alto_total_mm" type="number" required defaultValue="2400" className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
          <div className="sm:col-span-2 space-y-1">
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Fondo (mm) *</label>
            <input name="fondo_mm" type="number" required defaultValue="600" className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
          <div className="sm:col-span-6">
            <button type="submit" className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">+ Añadir armario</button>
          </div>
        </form>
      </section>
    </div>
  );
}
