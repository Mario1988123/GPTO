import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { cambiarEstadoRecorte, ejecutarNesting } from "../../nesting-actions";
import { ToastFromSearchParams } from "../../../catalogo/shared";
import { ESTADOS_RECORTE, type EstadoRecorte } from "@/lib/tipos/nesting";
import type { Proyecto } from "@/lib/tipos/proyectos";
import { SugerenciasOptimizacion } from "./optimizacion";

export const dynamic = "force-dynamic";

const EST = Object.fromEntries(ESTADOS_RECORTE.map((e) => [e.value, e]));

const COLORES = [
  "fill-blue-300/70 stroke-blue-600 dark:fill-blue-900/60 dark:stroke-blue-400",
  "fill-emerald-300/70 stroke-emerald-600 dark:fill-emerald-900/60 dark:stroke-emerald-400",
  "fill-amber-300/70 stroke-amber-600 dark:fill-amber-900/60 dark:stroke-amber-400",
  "fill-violet-300/70 stroke-violet-600 dark:fill-violet-900/60 dark:stroke-violet-400",
  "fill-rose-300/70 stroke-rose-600 dark:fill-rose-900/60 dark:stroke-rose-400",
  "fill-cyan-300/70 stroke-cyan-600 dark:fill-cyan-900/60 dark:stroke-cyan-400",
  "fill-lime-300/70 stroke-lime-600 dark:fill-lime-900/60 dark:stroke-lime-400",
  "fill-fuchsia-300/70 stroke-fuchsia-600 dark:fill-fuchsia-900/60 dark:stroke-fuchsia-400",
];

type PiezaEnTabView = {
  id: string;
  x_mm: number;
  y_mm: number;
  largo_mm: number;
  ancho_mm: number;
  rotada: boolean;
  ocurrencia: number;
  piezas_modulo: { nombre: string; qr_code: string } | null;
};

type TableroView = {
  id: string;
  numero: number;
  ancho_mm: number;
  alto_mm: number;
  area_ocupada_mm2: number;
  referencias_tablero: {
    grosor_mm: number;
    materiales: { nombre: string } | null;
    acabados: { nombre: string } | null;
  } | null;
  piezas_en_tablero: PiezaEnTabView[];
};

type RecorteView = {
  id: string;
  largo_mm: number;
  ancho_mm: number;
  estado: EstadoRecorte;
  origen_tablero_id: string | null;
  referencias_tablero: { grosor_mm: number; materiales: { nombre: string } | null; acabados: { nombre: string } | null } | null;
};

export default async function NestingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await createClient();

  const { data: proyecto } = await s.from("proyectos").select("*").eq("id", id).maybeSingle<Proyecto>();
  if (!proyecto) notFound();

  // config_empresa para detectar piezas imposibles
  const { data: emp } = await s.from("empresas").select("config_empresa").limit(1).maybeSingle<{ config_empresa: Record<string, number> }>();
  const cfg = emp?.config_empresa ?? {};
  const tablUtilLargo = Number(cfg.tablero_util_ancho_cm ?? 240) * 10;
  const tablUtilAncho = Number(cfg.tablero_util_alto_cm ?? 120) * 10;

  const [{ data: tableros }, { data: recortes }, { data: todasPiezas }] = await Promise.all([
    s.from("tableros_corte")
      .select("id, numero, ancho_mm, alto_mm, area_ocupada_mm2, referencias_tablero(grosor_mm, materiales(nombre), acabados(nombre)), piezas_en_tablero(id, x_mm, y_mm, largo_mm, ancho_mm, rotada, ocurrencia, piezas_modulo(nombre, qr_code))")
      .eq("proyecto_id", id)
      .order("numero"),
    s.from("recortes")
      .select("id, largo_mm, ancho_mm, estado, origen_tablero_id, referencias_tablero(grosor_mm, materiales(nombre), acabados(nombre))")
      .in("origen_tablero_id", ((await s.from("tableros_corte").select("id").eq("proyecto_id", id)).data ?? []).map((t) => t.id as string).length > 0
        ? ((await s.from("tableros_corte").select("id").eq("proyecto_id", id)).data ?? []).map((t) => t.id as string)
        : ["00000000-0000-0000-0000-000000000000"])
      .order("created_at"),
    s.from("piezas_modulo")
      .select("id, nombre, cantidad, largo_mm, ancho_mm, respeta_veta, referencia_tablero_id, modulos_armario!inner(armarios!inner(proyecto_id, nombre))")
      .eq("modulos_armario.armarios.proyecto_id", id),
  ]);

  // Detectar piezas del proyecto que NO tienen fila en piezas_en_tablero (no se colocaron).
  const tablerosIds = ((await s.from("tableros_corte").select("id").eq("proyecto_id", id)).data ?? []).map((t) => t.id as string);
  const { data: piezasColocadas } = tablerosIds.length > 0
    ? await s.from("piezas_en_tablero").select("pieza_modulo_id").in("tablero_corte_id", tablerosIds)
    : { data: [] as { pieza_modulo_id: string }[] };
  const colocadasSet = new Set((piezasColocadas ?? []).map((p) => p.pieza_modulo_id));

  type PiezaRaw = { id: string; nombre: string; cantidad: number; largo_mm: number; ancho_mm: number; respeta_veta: boolean; referencia_tablero_id: string | null };
  const piezasNoColocadas = (todasPiezas as unknown as PiezaRaw[] ?? []).filter((p) => !colocadasSet.has(p.id));

  // Clasificar por motivo
  const tooBig = piezasNoColocadas.filter((p) => {
    const L = p.largo_mm, A = p.ancho_mm;
    const cabeSinRotar = L <= tablUtilLargo && A <= tablUtilAncho;
    const cabeRotado = !p.respeta_veta && L <= tablUtilAncho && A <= tablUtilLargo;
    return !cabeSinRotar && !cabeRotado;
  });
  const sinReferencia = piezasNoColocadas.filter((p) => !p.referencia_tablero_id);
  const otras = piezasNoColocadas.filter((p) => !tooBig.includes(p) && !sinReferencia.includes(p));

  const run = async () => { "use server"; await ejecutarNesting(id); };

  const t = (tableros ?? []) as unknown as TableroView[];
  const r = (recortes ?? []) as unknown as RecorteView[];

  const totalTableros = t.length;
  const totalPiezas = t.reduce((acc, x) => acc + (x.piezas_en_tablero?.length ?? 0), 0);
  const totalRecortes = r.length;
  const pendientes = r.filter((x) => x.estado === "pendiente").length;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <nav className="text-sm space-x-2">
        <Link href="/app/proyectos" className="text-zinc-500 hover:underline dark:text-zinc-400">Proyectos</Link>
        <span className="text-zinc-400">/</span>
        <Link href={`/app/proyectos/${id}`} className="text-zinc-500 hover:underline dark:text-zinc-400">{proyecto.nombre}</Link>
      </nav>

      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">Nesting</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {totalTableros === 0 ? (
              <>Sin plano de corte. Pulsa <strong>Ejecutar nesting</strong> para calcularlo.</>
            ) : (
              <>{totalTableros} tablero(s) · {totalPiezas} pieza(s) colocadas · {totalRecortes} recorte(s){pendientes > 0 ? ` (${pendientes} por validar)` : ""}</>
            )}
          </p>
        </div>
        <form action={run}>
          <button type="submit" className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
            {totalTableros === 0 ? "Ejecutar nesting" : "Recalcular"}
          </button>
        </form>
      </div>

      {/* Alerta de piezas no colocadas */}
      {totalTableros > 0 && piezasNoColocadas.length > 0 ? (
        <section className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/40">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-amber-600 dark:text-amber-400">⚠</span>
            <div className="flex-1">
              <h2 className="text-base font-medium text-amber-900 dark:text-amber-200">
                {piezasNoColocadas.length} pieza(s) no colocada(s) en el plano de corte
              </h2>
              {tooBig.length > 0 ? (
                <div className="mt-3">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                    🚫 Más grandes que el tablero útil ({tablUtilLargo}×{tablUtilAncho} mm):
                  </p>
                  <ul className="mt-1 space-y-0.5 text-sm text-amber-800 dark:text-amber-300">
                    {tooBig.map((p) => (
                      <li key={p.id} className="font-mono text-xs">
                        · {p.nombre} — {p.largo_mm}×{p.ancho_mm} mm {p.respeta_veta ? "(respeta veta, no rotable)" : ""}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 rounded-md bg-white/60 p-3 text-xs text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
                    <strong>Cómo resolverlo:</strong>
                    <ul className="mt-1 list-disc pl-5 space-y-1">
                      <li>Reducir el alto/ancho del armario para que la pieza quepa.</li>
                      <li>Crear una referencia de tablero más grande (ej: <em>altura cocina</em> 2750×1220) y asignarla al módulo o tipo.</li>
                      <li>
                        <span className="text-amber-700 dark:text-amber-300">Partir la pieza</span> en varias unibles con herraje de tarima/conector — <em>funcionalidad en hoja de ruta Capa 6.3</em>.
                      </li>
                    </ul>
                  </div>
                </div>
              ) : null}
              {sinReferencia.length > 0 ? (
                <div className="mt-3">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                    Sin referencia de tablero asignada:
                  </p>
                  <ul className="mt-1 space-y-0.5 text-sm text-amber-800 dark:text-amber-300">
                    {sinReferencia.map((p) => (
                      <li key={p.id} className="font-mono text-xs">· {p.nombre} — {p.largo_mm}×{p.ancho_mm} mm</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-amber-900 dark:text-amber-200">
                    Asegúrate de que el tipo_modulo tiene <strong>referencia_tablero_default_id</strong> o el módulo concreto la tiene en override.
                  </p>
                </div>
              ) : null}
              {otras.length > 0 ? (
                <div className="mt-3">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Otras piezas sin colocar:</p>
                  <ul className="mt-1 space-y-0.5 text-sm text-amber-800 dark:text-amber-300">
                    {otras.map((p) => <li key={p.id} className="font-mono text-xs">· {p.nombre} — {p.largo_mm}×{p.ancho_mm} mm</li>)}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* SVGs por tablero */}
      <section className="mt-8 space-y-6">
        {t.map((tab, idx) => {
          const ref = tab.referencias_tablero;
          const materia = `${ref?.materiales?.nombre ?? "?"} · ${ref?.acabados?.nombre ?? "?"} · ${ref?.grosor_mm ?? "?"} mm`;
          const areaTotal = tab.ancho_mm * tab.alto_mm;
          const ocupPct = areaTotal > 0 ? Math.round((tab.area_ocupada_mm2 / areaTotal) * 100) : 0;
          return (
            <div key={tab.id} className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-3 flex items-baseline justify-between">
                <div>
                  <h2 className="text-lg font-medium">Tablero #{tab.numero}</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{materia} · {tab.ancho_mm}×{tab.alto_mm} mm útil · ocupación {ocupPct}%</p>
                </div>
              </div>
              <div className="overflow-hidden rounded-lg border border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950">
                <svg
                  viewBox={`0 0 ${tab.ancho_mm} ${tab.alto_mm}`}
                  preserveAspectRatio="xMidYMid meet"
                  className="h-auto w-full"
                  style={{ maxHeight: 420 }}
                >
                  <rect x={0} y={0} width={tab.ancho_mm} height={tab.alto_mm} fill="none" stroke="#a1a1aa" strokeWidth={3} />
                  {(tab.piezas_en_tablero ?? []).map((p, i) => (
                    <g key={p.id}>
                      <rect
                        x={p.x_mm}
                        y={p.y_mm}
                        width={p.largo_mm}
                        height={p.ancho_mm}
                        className={COLORES[(i + idx) % COLORES.length]}
                        strokeWidth={2}
                      />
                      <text
                        x={p.x_mm + p.largo_mm / 2}
                        y={p.y_mm + p.ancho_mm / 2}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={Math.max(14, Math.min(p.largo_mm / 12, 36))}
                        className="fill-zinc-900 dark:fill-zinc-100"
                        style={{ pointerEvents: "none" }}
                      >
                        <tspan x={p.x_mm + p.largo_mm / 2} dy="-0.4em" fontWeight="600">
                          {p.piezas_modulo?.nombre ?? "?"}
                          {p.ocurrencia > 1 ? ` #${p.ocurrencia}` : ""}
                        </tspan>
                        <tspan x={p.x_mm + p.largo_mm / 2} dy="1.2em">
                          {p.largo_mm}×{p.ancho_mm}{p.rotada ? " ↻" : ""}
                        </tspan>
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </div>
          );
        })}
        {totalTableros === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
            Todavía no hay nesting calculado. Asegúrate de haber <strong>explosionado las piezas</strong> en cada armario y pulsa <strong>Ejecutar nesting</strong>.
          </div>
        ) : null}
      </section>

      {/* Recortes */}
      {r.length > 0 ? (
        <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex items-baseline justify-between">
            <div>
              <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Recortes del proyecto ({r.length})</h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Retales residuales. Los pendientes esperan tu validación: conservar (al almacén) o descartar (se perdieron en el corte).
              </p>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-950/50 dark:text-zinc-400">
                <tr>
                  <th className="px-3 py-2 font-medium">Referencia</th>
                  <th className="px-3 py-2 font-medium">Dimensiones</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                  <th className="px-3 py-2 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {r.map((rec) => {
                  const est = EST[rec.estado];
                  const returnTo = `/app/proyectos/${id}/nesting`;
                  const conservar = async () => { "use server"; await cambiarEstadoRecorte(rec.id, "conservado", returnTo); };
                  const descartar = async () => { "use server"; await cambiarEstadoRecorte(rec.id, "descartado", returnTo); };
                  const volverPend = async () => { "use server"; await cambiarEstadoRecorte(rec.id, "pendiente", returnTo); };
                  return (
                    <tr key={rec.id}>
                      <td className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400">
                        {rec.referencias_tablero?.materiales?.nombre ?? "?"} · {rec.referencias_tablero?.acabados?.nombre ?? "?"} · {rec.referencias_tablero?.grosor_mm ?? "?"} mm
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{rec.largo_mm} × {rec.ancho_mm} mm</td>
                      <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${est?.color ?? ""}`}>{est?.label ?? rec.estado}</span></td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-3 text-xs">
                          {rec.estado !== "conservado" ? (
                            <form action={conservar}>
                              <button type="submit" className="text-emerald-700 hover:underline dark:text-emerald-400">Conservar</button>
                            </form>
                          ) : null}
                          {rec.estado !== "descartado" ? (
                            <form action={descartar}>
                              <button type="submit" className="text-red-700 hover:underline dark:text-red-300">Descartar</button>
                            </form>
                          ) : null}
                          {rec.estado !== "pendiente" ? (
                            <form action={volverPend}>
                              <button type="submit" className="text-zinc-600 hover:underline dark:text-zinc-400">Volver a pendiente</button>
                            </form>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* Sugerencias de optimización (Capa 6.5) */}
      <SugerenciasOptimizacion proyectoId={id} />
    </div>
  );
}
