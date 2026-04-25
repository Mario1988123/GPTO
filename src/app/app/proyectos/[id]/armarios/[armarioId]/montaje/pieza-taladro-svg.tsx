import { TIPOS_TALADRO } from "@/lib/tipos/taladros";
import type { PuntoTaladro } from "@/lib/tipos/taladros";

/**
 * Render SVG de una pieza con sus puntos de taladro.
 * - largo (eje X) y ancho (eje Y) en mm.
 * - El SVG tiene viewBox proporcional + márgenes para cotas.
 * - Los taladros se pintan como círculos coloreados según su tipo.
 * - Para piezas con taladros en cara lateral (lateral_izq/lateral_dcho) los pintamos en la vista plana
 *   asumiendo que estás mirando esa cara (sus coordenadas son x=largo, y=ancho).
 */
export function PiezaTaladroSVG({
  largo,
  ancho,
  taladros,
}: {
  largo: number;
  ancho: number;
  taladros: PuntoTaladro[];
}) {
  const pad = 80;
  const vbW = largo + pad * 2;
  const vbH = ancho + pad * 2;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-zinc-50 dark:bg-zinc-950">
      <svg
        viewBox={`-${pad} -${pad} ${vbW} ${vbH}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-auto w-full"
        style={{ maxHeight: 280 }}
      >
        {/* Pieza */}
        <rect x={0} y={0} width={largo} height={ancho} fill="#fff" stroke="#1e293b" strokeWidth={3} />

        {/* Cotas */}
        <g fontSize={Math.max(largo, ancho) * 0.04} fill="#475569" fontWeight="600">
          <line x1={0} y1={ancho + 30} x2={largo} y2={ancho + 30} stroke="#64748b" strokeWidth={1.5} />
          <text x={largo / 2} y={ancho + 60} textAnchor="middle">{largo} mm</text>
          <line x1={-30} y1={0} x2={-30} y2={ancho} stroke="#64748b" strokeWidth={1.5} />
          <text x={-50} y={ancho / 2} textAnchor="middle" transform={`rotate(-90, -50, ${ancho / 2})`}>{ancho} mm</text>
        </g>

        {/* Cuadrícula 100mm */}
        <g stroke="#e2e8f0" strokeWidth={0.5}>
          {Array.from({ length: Math.floor(largo / 100) + 1 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 100} y1={0} x2={i * 100} y2={ancho} />
          ))}
          {Array.from({ length: Math.floor(ancho / 100) + 1 }).map((_, i) => (
            <line key={`h${i}`} x1={0} y1={i * 100} x2={largo} y2={i * 100} />
          ))}
        </g>

        {/* Taladros */}
        {taladros.map((t) => {
          const meta = TIPOS_TALADRO.find((x) => x.value === t.tipo);
          const r = Math.max(t.diametro_mm ?? 5, 8); // visible mínimo
          return (
            <g key={t.id}>
              <circle
                cx={t.x_mm}
                cy={t.y_mm}
                r={r}
                fill={meta?.color ?? "#888"}
                fillOpacity={0.85}
                stroke="#fff"
                strokeWidth={1.5}
              />
              {/* Cruz interior para precisión visual */}
              <line x1={t.x_mm - r * 0.6} y1={t.y_mm} x2={t.x_mm + r * 0.6} y2={t.y_mm} stroke="#fff" strokeWidth={1.5} />
              <line x1={t.x_mm} y1={t.y_mm - r * 0.6} x2={t.x_mm} y2={t.y_mm + r * 0.6} stroke="#fff" strokeWidth={1.5} />
            </g>
          );
        })}

        {/* Marcas esquinas */}
        <g fontSize={Math.max(largo, ancho) * 0.025} fill="#94a3b8">
          <text x={5} y={15}>0,0</text>
          <text x={largo - 60} y={ancho - 5}>{`${largo},${ancho}`}</text>
        </g>
      </svg>
    </div>
  );
}
