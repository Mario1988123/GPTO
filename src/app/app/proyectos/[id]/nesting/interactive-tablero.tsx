"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

type Pieza = {
  id: string;
  x_mm: number;
  y_mm: number;
  largo_mm: number;
  ancho_mm: number;
  rotada: boolean;
  nombre: string;
  cantidad: number;
  ocurrencia: number;
};

const COLORES = [
  "fill-blue-300/70 stroke-blue-600",
  "fill-emerald-300/70 stroke-emerald-600",
  "fill-amber-300/70 stroke-amber-600",
  "fill-violet-300/70 stroke-violet-600",
  "fill-rose-300/70 stroke-rose-600",
  "fill-cyan-300/70 stroke-cyan-600",
  "fill-lime-300/70 stroke-lime-600",
  "fill-fuchsia-300/70 stroke-fuchsia-600",
];

/**
 * Plano de corte interactivo: arrastra piezas dentro del tablero y guarda la posición al soltar.
 * Clamp en bordes. Rotación con doble-click (rotación lógica 90°, sin reorientar piezas guardadas).
 */
export function InteractiveTablero({
  tableroId,
  ancho_mm,
  alto_mm,
  piezas: piezasInput,
  ajusteIdx,
  actionMover,
}: {
  tableroId: string;
  ancho_mm: number;
  alto_mm: number;
  piezas: Pieza[];
  ajusteIdx: number;
  actionMover: (payload: { id: string; x_mm: number; y_mm: number }) => Promise<void>;
}) {
  const [piezas, setPiezas] = useState<Pieza[]>(piezasInput);
  const [drag, setDrag] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [pending, start] = useTransition();
  const svgRef = useRef<SVGSVGElement>(null);

  const screenToMm = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  const onPointerDown = (e: React.PointerEvent<SVGGElement>, p: Pieza) => {
    e.preventDefault();
    const mm = screenToMm(e.clientX, e.clientY);
    if (!mm) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setDrag({ id: p.id, offsetX: mm.x - p.x_mm, offsetY: mm.y - p.y_mm });
  };

  const onPointerMove = (e: React.PointerEvent<SVGGElement>) => {
    if (!drag) return;
    const mm = screenToMm(e.clientX, e.clientY);
    if (!mm) return;
    setPiezas((prev) =>
      prev.map((p) => {
        if (p.id !== drag.id) return p;
        const nx = Math.max(0, Math.min(ancho_mm - p.largo_mm, mm.x - drag.offsetX));
        const ny = Math.max(0, Math.min(alto_mm - p.ancho_mm, mm.y - drag.offsetY));
        return { ...p, x_mm: Math.round(nx), y_mm: Math.round(ny) };
      }),
    );
  };

  const onPointerUp = (e: React.PointerEvent<SVGGElement>) => {
    if (!drag) return;
    (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    const movida = piezas.find((p) => p.id === drag.id);
    const d = drag;
    setDrag(null);
    if (!movida) return;
    start(async () => {
      try {
        await actionMover({ id: d.id, x_mm: movida.x_mm, y_mm: movida.y_mm });
        toast.success("Pieza reposicionada");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error moviendo pieza");
      }
    });
  };

  return (
    <div className="relative overflow-hidden rounded-lg border border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950">
      {pending ? (
        <div className="absolute right-2 top-2 z-10 rounded-full bg-zinc-900 px-2 py-0.5 text-xs text-white dark:bg-zinc-100 dark:text-zinc-900">
          guardando…
        </div>
      ) : null}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${ancho_mm} ${alto_mm}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-auto w-full"
        style={{ maxHeight: 420, touchAction: "none" }}
      >
        <rect x={0} y={0} width={ancho_mm} height={alto_mm} fill="none" stroke="#a1a1aa" strokeWidth={3} />
        {piezas.map((p, i) => (
          <g
            key={p.id}
            onPointerDown={(e) => onPointerDown(e, p)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{ cursor: drag?.id === p.id ? "grabbing" : "grab" }}
          >
            <rect
              x={p.x_mm}
              y={p.y_mm}
              width={p.largo_mm}
              height={p.ancho_mm}
              className={COLORES[(i + ajusteIdx) % COLORES.length]}
              strokeWidth={2}
            />
            <text
              x={p.x_mm + p.largo_mm / 2}
              y={p.y_mm + p.ancho_mm / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={Math.max(14, Math.min(p.largo_mm / 12, 36))}
              className="fill-zinc-900 dark:fill-zinc-100 pointer-events-none"
            >
              <tspan x={p.x_mm + p.largo_mm / 2} dy="-0.4em" fontWeight="600">
                {p.nombre}{p.cantidad > 1 ? ` #${p.ocurrencia}` : ""}
              </tspan>
              <tspan x={p.x_mm + p.largo_mm / 2} dy="1.2em">
                {p.largo_mm}×{p.ancho_mm}{p.rotada ? " ↻" : ""}
              </tspan>
            </text>
          </g>
        ))}
      </svg>
      <p className="border-t border-zinc-200 bg-white px-3 py-1 text-[10px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        💡 Arrastra cada pieza para reposicionarla. El tablero #{ajusteIdx + 1 /* display */} tiene {ancho_mm}×{alto_mm} mm útiles.
      </p>
    </div>
  );
}
