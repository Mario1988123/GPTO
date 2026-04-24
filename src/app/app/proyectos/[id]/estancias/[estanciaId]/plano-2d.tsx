"use client";

import { useRef, useState, useTransition } from "react";
import { actualizarPlanoArmario } from "../../../plano-actions";
import type { Abertura, Armario } from "@/lib/tipos/proyectos";

/**
 * Vista en planta (superior) de la estancia con los armarios colocados.
 * - Drag&drop: arrastra un armario sobre el SVG para recolocarlo.
 * - Renderiza aberturas (puertas/ventanas) como huecos en las paredes.
 * - Detecta colisión entre armarios pegados a la pared y las aberturas.
 * - Para armarios empotrados ofrece botones de snap a cada pared.
 */
export function Plano2D({
  proyectoId,
  estanciaId,
  largoMm,
  anchoMm,
  armarios,
  aberturas = [],
}: {
  proyectoId: string;
  estanciaId: string;
  largoMm: number;
  anchoMm: number;
  armarios: Armario[];
  aberturas?: Abertura[];
}) {
  const COLORS = ["#93c5fd", "#86efac", "#fcd34d", "#d8b4fe", "#fda4af", "#67e8f9"];
  const TOCA_MM = 50;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number; x: number; y: number } | null>(null);
  const [isPending, startTransition] = useTransition();
  // Posiciones temporales mientras Supabase guarda (optimistic update).
  const [overrides, setOverrides] = useState<Record<string, { x: number; y: number; rot: 0 | 90 | 180 | 270 }>>({});

  function armarioPos(a: Armario) {
    const o = overrides[a.id];
    const rot = (o?.rot ?? a.plano_rotacion) as 0 | 90 | 180 | 270;
    const rotMod = rot % 180;
    const W = rotMod === 0 ? a.ancho_total_mm : a.fondo_mm;
    const H = rotMod === 0 ? a.fondo_mm : a.ancho_total_mm;
    const xReal = drag?.id === a.id ? drag.x : o?.x ?? a.plano_x_mm;
    const yReal = drag?.id === a.id ? drag.y : o?.y ?? a.plano_y_mm;
    const x = Math.max(0, Math.min(largoMm - W, xReal));
    const y = Math.max(0, Math.min(anchoMm - H, yReal));
    return { x, y, W, H, rot };
  }

  function svgCoords(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const local = pt.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  }

  function onPointerDown(e: React.PointerEvent, a: Armario) {
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    const { x, y, W: _W, H: _H } = armarioPos(a);
    void _W; void _H;
    const { x: mx, y: my } = svgCoords(e.clientX, e.clientY);
    setDrag({ id: a.id, dx: mx - x, dy: my - y, x, y });
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag) return;
    const { x: mx, y: my } = svgCoords(e.clientX, e.clientY);
    setDrag((d) => (d ? { ...d, x: Math.round(mx - d.dx), y: Math.round(my - d.dy) } : d));
  }

  function onPointerUp(e: React.PointerEvent, a: Armario) {
    if (!drag || drag.id !== a.id) return;
    try { (e.target as Element).releasePointerCapture(e.pointerId); } catch {}
    const { x, y, W, H } = armarioPos(a);
    const finalX = Math.max(0, Math.min(largoMm - W, x));
    const finalY = Math.max(0, Math.min(anchoMm - H, y));
    setOverrides((prev) => ({ ...prev, [a.id]: { x: finalX, y: finalY, rot: a.plano_rotacion } }));
    setDrag(null);
    const fd = new FormData();
    fd.set("plano_x_mm", String(finalX));
    fd.set("plano_y_mm", String(finalY));
    fd.set("plano_rotacion", String(a.plano_rotacion));
    startTransition(() => {
      void actualizarPlanoArmario(proyectoId, estanciaId, a.id, fd);
    });
  }

  function colisionaConAbertura(a: Armario) {
    const { x: x0, y: y0, W, H } = armarioPos(a);
    const x1 = x0 + W;
    const y1 = y0 + H;
    for (const ab of aberturas) {
      if (ab.tipo !== "puerta" && ab.tipo !== "ventana") continue;
      const ini = ab.x_en_pared_mm;
      const fin = ab.x_en_pared_mm + ab.ancho_mm;
      if (ab.pared_idx === 0 && y0 < TOCA_MM && x1 > ini && x0 < fin) return ab;
      if (ab.pared_idx === 2 && y1 > anchoMm - TOCA_MM && x1 > ini && x0 < fin) return ab;
      if (ab.pared_idx === 3 && x0 < TOCA_MM && y1 > ini && y0 < fin) return ab;
      if (ab.pared_idx === 1 && x1 > largoMm - TOCA_MM && y1 > ini && y0 < fin) return ab;
    }
    return null;
  }

  function snapAPared(a: Armario, pared: number) {
    const rotPorPared: Record<number, 0 | 90 | 180 | 270> = { 0: 0, 1: 90, 2: 180, 3: 270 };
    const rot = rotPorPared[pared];
    const rotMod = rot % 180;
    const W = rotMod === 0 ? a.ancho_total_mm : a.fondo_mm;
    const H = rotMod === 0 ? a.fondo_mm : a.ancho_total_mm;
    let x = a.plano_x_mm;
    let y = a.plano_y_mm;
    if (pared === 0) y = 0;
    if (pared === 2) y = anchoMm - H;
    if (pared === 3) x = 0;
    if (pared === 1) x = largoMm - W;
    x = Math.max(0, Math.min(largoMm - W, x));
    y = Math.max(0, Math.min(anchoMm - H, y));
    setOverrides((prev) => ({ ...prev, [a.id]: { x, y, rot } }));
    const fd = new FormData();
    fd.set("plano_x_mm", String(x));
    fd.set("plano_y_mm", String(y));
    fd.set("plano_rotacion", String(rot));
    startTransition(() => {
      void actualizarPlanoArmario(proyectoId, estanciaId, a.id, fd);
    });
  }

  function guardarForm(a: Armario, fd: FormData) {
    const x = Number.parseInt(String(fd.get("plano_x_mm") ?? "0"), 10) || 0;
    const y = Number.parseInt(String(fd.get("plano_y_mm") ?? "0"), 10) || 0;
    const rotRaw = Number.parseInt(String(fd.get("plano_rotacion") ?? "0"), 10);
    const rot: 0 | 90 | 180 | 270 = [0, 90, 180, 270].includes(rotRaw)
      ? (rotRaw as 0 | 90 | 180 | 270)
      : 0;
    setOverrides((prev) => ({ ...prev, [a.id]: { x, y, rot } }));
    startTransition(() => {
      void actualizarPlanoArmario(proyectoId, estanciaId, a.id, fd);
    });
  }

  return (
    <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-medium">
          Plano 2D (vista en planta)
          {isPending && <span className="ml-3 text-xs font-normal text-blue-600">guardando...</span>}
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Estancia {largoMm}×{anchoMm} mm · arrastra los armarios
        </p>
      </div>

      <div
        className="mx-auto overflow-hidden rounded-lg border border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950"
        style={{ maxWidth: "800px" }}
      >
        <svg
          ref={svgRef}
          viewBox={`-80 -80 ${largoMm + 160} ${anchoMm + 160}`}
          preserveAspectRatio="xMidYMid meet"
          className="h-auto w-full touch-none select-none"
          style={{ maxHeight: 480 }}
          onPointerMove={onPointerMove}
        >
          <defs>
            <pattern id="plano-grid" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#e5e7eb" strokeWidth={1} />
            </pattern>
          </defs>

          <rect x={-80} y={-80} width={largoMm + 160} height={anchoMm + 160} fill="url(#plano-grid)" />
          <rect x={0} y={0} width={largoMm} height={anchoMm} fill="#ffffff" fillOpacity={0.85} stroke="none" />

          {/* Paredes */}
          <g stroke="#1e293b" strokeWidth={8} strokeOpacity={0.5} fill="#94a3b8" fillOpacity={0.35}>
            <rect x={-50} y={-50} width={largoMm + 100} height={50} />
            <rect x={-50} y={anchoMm} width={largoMm + 100} height={50} />
            <rect x={-50} y={0} width={50} height={anchoMm} />
            <rect x={largoMm} y={0} width={50} height={anchoMm} />
          </g>

          {/* Aberturas */}
          {aberturas.map((ab) => {
            const ini = ab.x_en_pared_mm;
            const fin = ini + ab.ancho_mm;
            const color = ab.tipo === "puerta" ? "#f59e0b" : "#0ea5e9";
            const dash = ab.tipo === "puerta" ? undefined : "12 6";
            const label = ab.etiqueta ?? `${ab.ancho_mm}mm`;
            if (ab.pared_idx === 0) {
              return (
                <g key={ab.id} pointerEvents="none">
                  <rect x={ini} y={-52} width={ab.ancho_mm} height={54} fill="#fff" />
                  <line x1={ini} y1={-25} x2={fin} y2={-25} stroke={color} strokeWidth={6} strokeDasharray={dash} />
                  {ab.tipo === "puerta" && (
                    <path d={`M ${ini} 0 A ${ab.ancho_mm} ${ab.ancho_mm} 0 0 1 ${fin} ${ab.ancho_mm}`} fill="none" stroke={color} strokeWidth={2} strokeDasharray="4 4" />
                  )}
                  <text x={(ini + fin) / 2} y={-60} textAnchor="middle" fontSize={22} fill={color} fontWeight="600">
                    {ab.tipo === "puerta" ? "🚪" : "🪟"} {label}
                  </text>
                </g>
              );
            }
            if (ab.pared_idx === 2) {
              return (
                <g key={ab.id} pointerEvents="none">
                  <rect x={ini} y={anchoMm} width={ab.ancho_mm} height={54} fill="#fff" />
                  <line x1={ini} y1={anchoMm + 25} x2={fin} y2={anchoMm + 25} stroke={color} strokeWidth={6} strokeDasharray={dash} />
                  {ab.tipo === "puerta" && (
                    <path d={`M ${ini} ${anchoMm} A ${ab.ancho_mm} ${ab.ancho_mm} 0 0 0 ${fin} ${anchoMm - ab.ancho_mm}`} fill="none" stroke={color} strokeWidth={2} strokeDasharray="4 4" />
                  )}
                  <text x={(ini + fin) / 2} y={anchoMm + 72} textAnchor="middle" fontSize={22} fill={color} fontWeight="600">
                    {ab.tipo === "puerta" ? "🚪" : "🪟"} {label}
                  </text>
                </g>
              );
            }
            if (ab.pared_idx === 3) {
              return (
                <g key={ab.id} pointerEvents="none">
                  <rect x={-52} y={ini} width={54} height={ab.ancho_mm} fill="#fff" />
                  <line x1={-25} y1={ini} x2={-25} y2={fin} stroke={color} strokeWidth={6} strokeDasharray={dash} />
                  {ab.tipo === "puerta" && (
                    <path d={`M 0 ${ini} A ${ab.ancho_mm} ${ab.ancho_mm} 0 0 0 ${ab.ancho_mm} ${fin}`} fill="none" stroke={color} strokeWidth={2} strokeDasharray="4 4" />
                  )}
                  <text x={-60} y={(ini + fin) / 2} textAnchor="middle" fontSize={22} fill={color} fontWeight="600" transform={`rotate(-90, -60, ${(ini + fin) / 2})`}>
                    {ab.tipo === "puerta" ? "🚪" : "🪟"} {label}
                  </text>
                </g>
              );
            }
            if (ab.pared_idx === 1) {
              return (
                <g key={ab.id} pointerEvents="none">
                  <rect x={largoMm} y={ini} width={54} height={ab.ancho_mm} fill="#fff" />
                  <line x1={largoMm + 25} y1={ini} x2={largoMm + 25} y2={fin} stroke={color} strokeWidth={6} strokeDasharray={dash} />
                  {ab.tipo === "puerta" && (
                    <path d={`M ${largoMm} ${ini} A ${ab.ancho_mm} ${ab.ancho_mm} 0 0 1 ${largoMm - ab.ancho_mm} ${fin}`} fill="none" stroke={color} strokeWidth={2} strokeDasharray="4 4" />
                  )}
                  <text x={largoMm + 60} y={(ini + fin) / 2} textAnchor="middle" fontSize={22} fill={color} fontWeight="600" transform={`rotate(90, ${largoMm + 60}, ${(ini + fin) / 2})`}>
                    {ab.tipo === "puerta" ? "🚪" : "🪟"} {label}
                  </text>
                </g>
              );
            }
            return null;
          })}

          <rect x={0} y={0} width={largoMm} height={anchoMm} fill="none" stroke="#334155" strokeWidth={3} pointerEvents="none" />

          {/* Cotas */}
          <g pointerEvents="none">
            <line x1={0} y1={anchoMm + 60} x2={largoMm} y2={anchoMm + 60} stroke="#64748b" strokeWidth={2} />
            <text x={largoMm / 2} y={anchoMm + 80} textAnchor="middle" fontSize={40} fill="#475569" fontWeight="600">{largoMm} mm</text>
            <line x1={-60} y1={0} x2={-60} y2={anchoMm} stroke="#64748b" strokeWidth={2} />
            <text x={-75} y={anchoMm / 2} textAnchor="middle" fontSize={40} fill="#475569" fontWeight="600" transform={`rotate(-90, -75, ${anchoMm / 2})`}>{anchoMm} mm</text>
          </g>

          {/* Armarios */}
          {armarios.map((a, i) => {
            const { x, y, W, H } = armarioPos(a);
            const col = colisionaConAbertura(a);
            const isDragging = drag?.id === a.id;
            const strokeCol = col ? "#dc2626" : isDragging ? "#2563eb" : "#0f172a";
            const fillCol = col ? "#fecaca" : COLORS[i % COLORS.length];
            return (
              <g key={a.id}>
                <rect
                  x={x}
                  y={y}
                  width={W}
                  height={H}
                  fill={fillCol}
                  stroke={strokeCol}
                  strokeWidth={col || isDragging ? 5 : 3}
                  opacity={isDragging ? 0.7 : 0.92}
                  rx={4}
                  style={{ cursor: isDragging ? "grabbing" : "grab" }}
                  onPointerDown={(e) => onPointerDown(e, a)}
                  onPointerUp={(e) => onPointerUp(e, a)}
                />
                <line x1={x} y1={y + H} x2={x + W} y2={y + H} stroke="#0f172a" strokeWidth={6} pointerEvents="none" />
                <text x={x + W / 2} y={y + H / 2} textAnchor="middle" dominantBaseline="central" fontSize={Math.min(36, W / 8)} fill="#0f172a" fontWeight="700" pointerEvents="none">
                  {a.nombre}
                </text>
                <text x={x + W / 2} y={y + H / 2 + 40} textAnchor="middle" dominantBaseline="central" fontSize={26} fill="#1e293b" fontWeight="500" pointerEvents="none">
                  {W}×{H}
                </text>
                {col ? (
                  <text x={x + W / 2} y={y - 10} textAnchor="middle" fontSize={28} fill="#dc2626" fontWeight="700" pointerEvents="none">
                    ⚠ bloquea {col.tipo}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Leyenda */}
      <div className="mx-auto mt-3 flex max-w-3xl flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
        <span>✋ arrastra los armarios</span>
        {aberturas.length > 0 && (
          <>
            <span>🚪 puerta</span>
            <span>🪟 ventana</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2 w-3 rounded-sm bg-red-300 ring-1 ring-red-600" /> colisión con abertura
            </span>
          </>
        )}
      </div>

      {/* Tabla de posiciones precisas */}
      <div className="mt-4 space-y-2">
        <p className="text-xs text-zinc-600 dark:text-zinc-400">Posiciones precisas y enrase:</p>
        <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 uppercase text-zinc-500 dark:bg-zinc-950/50 dark:text-zinc-400">
              <tr>
                <th className="px-3 py-2 font-medium">Armario</th>
                <th className="px-3 py-2 font-medium">Huella</th>
                <th className="px-3 py-2 font-medium">Posición y rotación</th>
                <th className="px-3 py-2 font-medium">Enrasar a pared</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {armarios.map((a) => {
                const o = overrides[a.id];
                const curX = o?.x ?? a.plano_x_mm;
                const curY = o?.y ?? a.plano_y_mm;
                const curRot = o?.rot ?? a.plano_rotacion;
                return (
                  <tr key={a.id}>
                    <td className="px-3 py-2 font-medium">
                      {a.nombre}
                      <span className="ml-2 rounded bg-muted px-1 text-[10px]">
                        {a.tipo_instalacion === "empotrado" ? "emp." : "suel."}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
                      {a.ancho_total_mm} × {a.fondo_mm} mm
                    </td>
                    <td className="px-3 py-2">
                      <form
                        action={(fd) => guardarForm(a, fd)}
                        className="flex items-center gap-2"
                      >
                        <input name="plano_x_mm" type="number" min="0" defaultValue={curX} key={`x-${curX}`} className="w-20 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950" />
                        <input name="plano_y_mm" type="number" min="0" defaultValue={curY} key={`y-${curY}`} className="w-20 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950" />
                        <select name="plano_rotacion" defaultValue={String(curRot)} key={`r-${curRot}`} className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950">
                          <option value="0">0°</option>
                          <option value="90">90°</option>
                          <option value="180">180°</option>
                          <option value="270">270°</option>
                        </select>
                        <button type="submit" className="rounded-md bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
                          Guardar
                        </button>
                      </form>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        {[
                          { v: 0, l: "↑ N" },
                          { v: 1, l: "→ E" },
                          { v: 2, l: "↓ S" },
                          { v: 3, l: "← O" },
                        ].map((p) => (
                          <button
                            key={p.v}
                            type="button"
                            onClick={() => snapAPared(a, p.v)}
                            title={`Enrasar contra la pared ${p.l}`}
                            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-[10px] font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                          >
                            {p.l}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
