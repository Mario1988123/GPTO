import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  actualizarArmario,
  anadirModulo,
  eliminarArmario,
  eliminarModulo,
  moverModulo,
} from "../../../actions";
import { ToastFromSearchParams } from "../../../../catalogo/shared";
import { AnadirModuloForm } from "./anadir-modulo";
import { Armario3D } from "./armario-3d";
import { ProponerDisenoForm } from "./proponer-diseno";
import { cambiarEstadoPieza, regenerarPiezasArmario } from "../../../piezas-actions";
import { actualizarDatosInstalacion } from "../../../estancias-actions";
import { aplicarDisenoPropuesto } from "../../../diseno-actions";
import { TIPOS_INSTALACION } from "@/lib/tipos/estancias";
import type { Armario, ModuloArmario, Proyecto } from "@/lib/tipos/proyectos";
import type { CategoriaModulo } from "@/lib/tipos/tipos_modulo";
import { ESTADOS_PIEZA, type EstadoPieza, type PiezaModulo } from "@/lib/tipos/piezas";

export const dynamic = "force-dynamic";

type ModuloVista = ModuloArmario & {
  tipos_modulo: { nombre: string } | null;
};

// paleta estable por orden
const COLORS = [
  "bg-blue-200 dark:bg-blue-900/40",
  "bg-emerald-200 dark:bg-emerald-900/40",
  "bg-amber-200 dark:bg-amber-900/40",
  "bg-violet-200 dark:bg-violet-900/40",
  "bg-rose-200 dark:bg-rose-900/40",
  "bg-cyan-200 dark:bg-cyan-900/40",
];

export default async function ConfiguradorArmarioPage({
  params,
}: {
  params: Promise<{ id: string; armarioId: string }>;
}) {
  const { id: proyectoId, armarioId } = await params;
  const s = await createClient();

  const { data: armario } = await s.from("armarios").select("*").eq("id", armarioId).maybeSingle<Armario>();
  if (!armario) notFound();

  const [{ data: proyecto }, { data: modulos }, { data: tipos }, { data: refs }, { data: piezasRaw }] = await Promise.all([
    s.from("proyectos").select("*").eq("id", proyectoId).maybeSingle<Proyecto>(),
    s.from("modulos_armario")
      .select("*, tipos_modulo(nombre)")
      .eq("armario_id", armarioId)
      .order("orden")
      .returns<ModuloVista[]>(),
    s.from("tipos_modulo")
      .select("id, nombre, ancho_default_mm, alto_default_mm, fondo_default_mm, categoria, es_estandar")
      .eq("activo", true)
      .order("categoria")
      .order("nombre"),
    s.from("referencias_tablero")
      .select("id, grosor_mm, materiales(nombre), acabados(nombre)")
      .eq("activo", true)
      .order("grosor_mm"),
    s.from("piezas_modulo")
      .select("*, modulos_armario!inner(armario_id, orden, nombre_override, tipos_modulo(nombre))")
      .eq("modulos_armario.armario_id", armarioId)
      .order("orden"),
  ]);

  if (!proyecto) notFound();

  const refOpciones = (refs ?? []).map((r) => ({
    id: r.id as string,
    // @ts-expect-error relacion
    label: `${r.materiales?.nombre ?? "?"} · ${r.acabados?.nombre ?? "?"} · ${r.grosor_mm} mm`,
  }));

  const { data: empCfg } = await s.from("empresas").select("config_empresa").limit(1).maybeSingle<{ config_empresa: Record<string, number> }>();
  const tabUtilAltoMm = Number(empCfg?.config_empresa?.tablero_util_alto_cm ?? 120) * 10;

  const anchoOcupado = (modulos ?? []).reduce((acc, m) => acc + m.ancho_mm, 0);
  const anchoLibre = armario.ancho_total_mm - anchoOcupado;
  const porcentajeOcupado = Math.min(100, Math.round((anchoOcupado / armario.ancho_total_mm) * 100));

  const updArm = async (fd: FormData) => { "use server"; await actualizarArmario(proyectoId, armarioId, fd); };
  const delArm = async () => { "use server"; await eliminarArmario(proyectoId, armarioId); };
  const addMod = async (fd: FormData) => { "use server"; await anadirModulo(proyectoId, armarioId, fd); };

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <nav className="text-sm space-x-2">
        <Link href="/app/proyectos" className="text-zinc-500 hover:underline dark:text-zinc-400">Proyectos</Link>
        <span className="text-zinc-400">/</span>
        <Link href={`/app/proyectos/${proyectoId}`} className="text-zinc-500 hover:underline dark:text-zinc-400">
          {proyecto.nombre}
        </Link>
      </nav>

      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        {armario.nombre}
      </h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Hueco: {armario.ancho_total_mm} × {armario.alto_total_mm} × {armario.fondo_mm} mm
        <span className="ml-2 text-xs rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">
          {armario.tipo_instalacion === "empotrado" ? `Empotrado · tapeta ${armario.margen_tapeta_mm}mm` : "Suelto"}
        </span>
      </p>

      {/* Proponer diseño (tipos estándar) */}
      <section className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">✨ Auto-diseño</h3>
            <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-400">
              Selecciona cuántos módulos estándar quieres (cajonera, colgador, zapatero…) y GPTO los encaja automáticamente en el hueco.
            </p>
          </div>
          <ProponerDisenoForm
            ancho_armario_mm={armario.ancho_total_mm - (armario.tipo_instalacion === "empotrado" ? 2 * armario.margen_tapeta_mm : 0)}
            tipos={(tipos ?? []).filter((t) => (t as { es_estandar?: boolean }).es_estandar).map((t) => ({
              id: (t as { id: string }).id,
              nombre: (t as { nombre: string }).nombre,
              categoria: ((t as { categoria?: CategoriaModulo }).categoria ?? "otro") as CategoriaModulo,
              ancho_default_mm: (t as { ancho_default_mm: number }).ancho_default_mm,
              alto_default_mm: (t as { alto_default_mm: number }).alto_default_mm,
              fondo_default_mm: (t as { fondo_default_mm: number }).fondo_default_mm,
            }))}
            action={async (pl) => {
              "use server";
              await aplicarDisenoPropuesto(proyectoId, armarioId, pl);
            }}
          />
        </div>
      </section>

      {/* Vista 3D */}
      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-medium">Vista 3D</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Arrastra para rotar · rueda para zoom</p>
        </div>
        <Armario3D
          armario_ancho_mm={armario.ancho_total_mm}
          armario_alto_mm={armario.alto_total_mm}
          armario_fondo_mm={armario.fondo_mm}
          tipo_instalacion={armario.tipo_instalacion}
          margen_tapeta_mm={armario.margen_tapeta_mm}
          modulos={(modulos ?? []).map((m, i) => ({
            id: m.id,
            nombre: m.nombre_override ?? m.tipos_modulo?.nombre ?? "Módulo",
            ancho_mm: m.ancho_mm,
            alto_mm: m.alto_mm,
            fondo_mm: m.fondo_mm,
            particiones: m.particiones_verticales ?? 1,
            color: ["#93c5fd","#86efac","#fcd34d","#d8b4fe","#fda4af","#67e8f9","#bef264","#f0abfc"][i % 8],
          }))}
        />
      </section>

      {/* Preview visual del armario */}
      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Vista frontal (esquemática)</h2>
          <div className="text-xs text-zinc-600 dark:text-zinc-400">
            Ocupado: <span className="font-mono">{anchoOcupado} mm</span>{" "}
            {anchoLibre >= 0
              ? <>· Libre: <span className="font-mono text-emerald-700 dark:text-emerald-400">{anchoLibre} mm</span></>
              : <span className="font-mono text-red-700 dark:text-red-400"> · Exceso: {Math.abs(anchoLibre)} mm</span>}
          </div>
        </div>
        <div
          className="relative mx-auto flex items-stretch overflow-hidden rounded-md border-2 border-zinc-400 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950"
          style={{ aspectRatio: `${armario.ancho_total_mm} / ${armario.alto_total_mm}`, maxHeight: 360 }}
        >
          {(modulos ?? []).length === 0 ? (
            <div className="flex w-full items-center justify-center text-xs text-zinc-400">
              Añade módulos para empezar
            </div>
          ) : (
            (modulos ?? []).map((m, i) => {
              const w = (m.ancho_mm / armario.ancho_total_mm) * 100;
              const part = m.particiones_verticales ?? 1;
              return (
                <div
                  key={m.id}
                  className={`${COLORS[i % COLORS.length]} relative flex flex-col items-center justify-center border-r border-zinc-400/60 px-1 text-center text-[10px] leading-tight dark:border-zinc-600/60`}
                  style={{ width: `${w}%` }}
                  title={`${m.tipos_modulo?.nombre ?? ""} · ${m.ancho_mm}×${m.alto_mm}×${m.fondo_mm} mm${part > 1 ? ` · ${part} apilados` : ""}`}
                >
                  <span className="font-semibold text-zinc-800 dark:text-zinc-100">
                    {m.nombre_override ?? m.tipos_modulo?.nombre ?? "?"}
                  </span>
                  <span className="font-mono text-[9px] text-zinc-700 dark:text-zinc-300">
                    {m.ancho_mm} mm
                  </span>
                  {part > 1 ? (
                    <span className="font-mono text-[9px] text-zinc-700 dark:text-zinc-300">
                      {part}× apilados
                    </span>
                  ) : null}
                  {/* Líneas divisorias por partición */}
                  {part > 1
                    ? Array.from({ length: part - 1 }).map((_, k) => (
                        <div
                          key={k}
                          className="pointer-events-none absolute left-0 right-0 border-t-2 border-dashed border-zinc-700/60 dark:border-zinc-200/40"
                          style={{ top: `${((k + 1) / part) * 100}%` }}
                        />
                      ))
                    : null}
                </div>
              );
            })
          )}
          {anchoLibre > 0 ? (
            <div
              className="flex flex-col items-center justify-center border-l-2 border-dashed border-zinc-400 bg-zinc-100/40 text-[10px] text-zinc-500 dark:border-zinc-600 dark:bg-zinc-800/40"
              style={{ width: `${(anchoLibre / armario.ancho_total_mm) * 100}%` }}
            >
              <span>libre</span>
              <span className="font-mono">{anchoLibre} mm</span>
            </div>
          ) : null}
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className={`h-full ${anchoLibre < 0 ? "bg-red-500" : "bg-emerald-500"}`}
            style={{ width: `${porcentajeOcupado}%` }}
          />
        </div>
      </section>

      {/* Form editar armario */}
      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">Dimensiones del hueco y tipo de instalación</h2>
        <form action={async (fd: FormData) => { "use server"; await actualizarDatosInstalacion(proyectoId, armarioId, fd); }} className="grid gap-3 sm:grid-cols-6">
          <div className="sm:col-span-2 space-y-1">
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Tipo instalación</label>
            <select name="tipo_instalacion" defaultValue={armario.tipo_instalacion} className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950">
              {TIPOS_INSTALACION.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Tapeta (mm)</label>
            <input name="margen_tapeta_mm" type="number" min="0" max="50" defaultValue={armario.margen_tapeta_mm} className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">solo empotrado</p>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Nombre</label>
            <input name="nombre" defaultValue={armario.nombre} className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Ancho (mm)</label>
            <input name="ancho_total_mm" type="number" required defaultValue={armario.ancho_total_mm} className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Alto (mm)</label>
            <input name="alto_total_mm" type="number" required defaultValue={armario.alto_total_mm} className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Fondo (mm)</label>
            <input name="fondo_mm" type="number" required defaultValue={armario.fondo_mm} className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
          <div className="sm:col-span-6 flex items-center gap-3">
            <button type="submit" className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
              Guardar cambios
            </button>
            <form action={delArm} className="inline">
              <button type="submit" className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-zinc-950 dark:text-red-300">
                Eliminar armario
              </button>
            </form>
          </div>
        </form>
      </section>

      {/* Form editar armario antiguo (campos basicos) - oculto ahora que lo reemplaza el form de arriba */}
      <section className="hidden rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">(oculto)</h2>
        <form action={updArm} className="grid gap-3 sm:grid-cols-5">
          <div className="sm:col-span-2 space-y-1">
            <label htmlFor="nombre" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Nombre</label>
            <input id="nombre" name="nombre" defaultValue={armario.nombre} className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
          <div className="space-y-1">
            <label htmlFor="ancho_total_mm" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Ancho (mm)</label>
            <input id="ancho_total_mm" name="ancho_total_mm" type="number" required defaultValue={armario.ancho_total_mm} className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
          <div className="space-y-1">
            <label htmlFor="alto_total_mm" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Alto (mm)</label>
            <input id="alto_total_mm" name="alto_total_mm" type="number" required defaultValue={armario.alto_total_mm} className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
          <div className="space-y-1">
            <label htmlFor="fondo_mm" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Fondo (mm)</label>
            <input id="fondo_mm" name="fondo_mm" type="number" required defaultValue={armario.fondo_mm} className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
          <div className="sm:col-span-5 flex items-center gap-3">
            <button type="submit" className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
              Guardar cambios
            </button>
            <form action={delArm} className="inline">
              <button type="submit" className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-zinc-950 dark:text-red-300">
                Eliminar armario
              </button>
            </form>
          </div>
        </form>
      </section>

      {/* Lista módulos */}
      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">Módulos ({modulos?.length ?? 0})</h2>

        {(modulos ?? []).length === 0 ? (
          <p className="rounded-md bg-zinc-50 p-4 text-sm text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
            Sin módulos. Añade el primero abajo.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-950/50 dark:text-zinc-400">
                <tr>
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Tipo</th>
                  <th className="px-3 py-2 font-medium">Dimensiones (mm)</th>
                  <th className="px-3 py-2 font-medium">Part. ↕</th>
                  <th className="px-3 py-2 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {(modulos ?? []).map((m, i) => {
                  const up = async () => { "use server"; await moverModulo(proyectoId, armarioId, m.id, "arriba"); };
                  const down = async () => { "use server"; await moverModulo(proyectoId, armarioId, m.id, "abajo"); };
                  const del = async () => { "use server"; await eliminarModulo(proyectoId, armarioId, m.id); };
                  return (
                    <tr key={m.id}>
                      <td className="px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400">{i + 1}</td>
                      <td className="px-3 py-2">
                        <span className="font-medium">{m.nombre_override ?? m.tipos_modulo?.nombre ?? "?"}</span>
                        {m.nombre_override ? (
                          <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                            ({m.tipos_modulo?.nombre})
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                        {m.ancho_mm} × {m.alto_mm} × {m.fondo_mm}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {(m.particiones_verticales ?? 1) > 1 ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                            {m.particiones_verticales}× de {Math.round(m.alto_mm / (m.particiones_verticales ?? 1))} mm
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <form action={up}><button type="submit" disabled={i === 0} className="text-xs text-zinc-700 hover:underline disabled:opacity-40 dark:text-zinc-300">↑</button></form>
                          <form action={down}><button type="submit" disabled={i === (modulos?.length ?? 0) - 1} className="text-xs text-zinc-700 hover:underline disabled:opacity-40 dark:text-zinc-300">↓</button></form>
                          <form action={del}><button type="submit" className="text-xs text-red-700 hover:underline dark:text-red-300">Quitar</button></form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4">
          <h3 className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">Añadir módulo</h3>
          <AnadirModuloForm
            action={addMod}
            tipos={tipos ?? []}
            referencias={refOpciones}
            alto_total_mm={armario.alto_total_mm}
            fondo_mm={armario.fondo_mm}
            tablero_util_alto_mm={tabUtilAltoMm}
          />
        </div>
      </section>

      {/* Sección 4: piezas físicas */}
      {(() => {
        const regen = async () => {
          "use server";
          await regenerarPiezasArmario(proyectoId, armarioId);
        };
        const EST_PIEZA = Object.fromEntries(ESTADOS_PIEZA.map((e) => [e.value, e]));
        return (
          <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Piezas físicas ({piezasRaw?.length ?? 0})</h2>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Generadas aplicando las fórmulas del tipo_modulo a las medidas reales de cada módulo.
                </p>
              </div>
              <form action={regen}>
                <button
                  type="submit"
                  disabled={(modulos?.length ?? 0) === 0}
                  className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
                >
                  {(piezasRaw?.length ?? 0) === 0 ? "Explosionar piezas" : "Regenerar piezas"}
                </button>
              </form>
            </div>

            {(piezasRaw ?? []).length === 0 ? (
              <p className="rounded-md bg-zinc-50 p-4 text-sm text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                No hay piezas calculadas. Pulsa <strong>Explosionar piezas</strong> para generarlas a partir de los módulos configurados.
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-950/50 dark:text-zinc-400">
                    <tr>
                      <th className="px-3 py-2 font-medium">Módulo</th>
                      <th className="px-3 py-2 font-medium">Pieza</th>
                      <th className="px-3 py-2 font-medium">Ud.</th>
                      <th className="px-3 py-2 font-medium">Dimensiones (mm)</th>
                      <th className="px-3 py-2 font-medium">Estado</th>
                      <th className="px-3 py-2 font-medium">QR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {(piezasRaw ?? []).map((p) => {
                      const rel = (p as unknown as { modulos_armario?: { nombre_override: string | null; orden: number; tipos_modulo?: { nombre?: string } | null } }).modulos_armario;
                      const modNombre = rel?.nombre_override ?? rel?.tipos_modulo?.nombre ?? "?";
                      const modOrden = (rel?.orden ?? 0) + 1;
                      const est = EST_PIEZA[p.estado as EstadoPieza];
                      return (
                        <tr key={p.id}>
                          <td className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400">#{modOrden} · {modNombre}</td>
                          <td className="px-3 py-2 font-medium">{p.nombre}</td>
                          <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{p.cantidad}</td>
                          <td className="px-3 py-2 font-mono text-xs">{p.largo_mm} × {p.ancho_mm} × {p.grosor_mm}</td>
                          <td className="px-3 py-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${est?.color ?? ""}`}>
                              {est?.label ?? p.estado}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <Link href={`/t/${p.qr_code}`} target="_blank" className="text-xs text-zinc-600 hover:underline dark:text-zinc-400">
                              ver
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })()}
    </div>
  );
}
