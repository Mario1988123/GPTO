import { actualizarPlanoArmario } from "../../../plano-actions";
import type { Armario } from "@/lib/tipos/proyectos";

/**
 * Vista en planta (superior) de la estancia con los armarios colocados.
 * Sin drag&drop todavía; edición por form debajo.
 */
export function Plano2D({
  proyectoId,
  estanciaId,
  largoMm,
  anchoMm,
  armarios,
}: {
  proyectoId: string;
  estanciaId: string;
  largoMm: number;
  anchoMm: number;
  armarios: Armario[];
}) {
  // Paleta estable
  const COLORS = ["#93c5fd", "#86efac", "#fcd34d", "#d8b4fe", "#fda4af", "#67e8f9"];

  return (
    <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-medium">Plano 2D (vista en planta)</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Estancia {largoMm}×{anchoMm} mm · vista desde arriba
        </p>
      </div>

      <div className="mx-auto overflow-hidden rounded-lg border border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950" style={{ maxWidth: "800px" }}>
        <svg viewBox={`-80 -80 ${largoMm + 160} ${anchoMm + 160}`} preserveAspectRatio="xMidYMid meet" className="h-auto w-full" style={{ maxHeight: 480 }}>
          <defs>
            <pattern id="plano-grid" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#e5e7eb" strokeWidth={1} />
            </pattern>
          </defs>

          {/* Grid fondo */}
          <rect x={-80} y={-80} width={largoMm + 160} height={anchoMm + 160} fill="url(#plano-grid)" />

          {/* Suelo estancia (contorno) */}
          <rect x={0} y={0} width={largoMm} height={anchoMm} fill="#ffffff" fillOpacity={0.85} stroke="none" />

          {/* Paredes semi-transparentes 100mm de grosor hacia dentro (banda visible) */}
          <g stroke="#1e293b" strokeWidth={8} strokeOpacity={0.5} fill="#94a3b8" fillOpacity={0.35}>
            {/* Pared superior */}
            <rect x={-50} y={-50} width={largoMm + 100} height={50} />
            {/* Pared inferior */}
            <rect x={-50} y={anchoMm} width={largoMm + 100} height={50} />
            {/* Pared izquierda */}
            <rect x={-50} y={0} width={50} height={anchoMm} />
            {/* Pared derecha */}
            <rect x={largoMm} y={0} width={50} height={anchoMm} />
          </g>

          {/* Contorno interior */}
          <rect x={0} y={0} width={largoMm} height={anchoMm} fill="none" stroke="#334155" strokeWidth={3} />

          {/* Cota largo */}
          <g>
            <line x1={0} y1={anchoMm + 60} x2={largoMm} y2={anchoMm + 60} stroke="#64748b" strokeWidth={2} />
            <text x={largoMm / 2} y={anchoMm + 80} textAnchor="middle" fontSize={40} fill="#475569" fontWeight="600">{largoMm} mm</text>
          </g>
          {/* Cota ancho */}
          <g>
            <line x1={-60} y1={0} x2={-60} y2={anchoMm} stroke="#64748b" strokeWidth={2} />
            <text x={-75} y={anchoMm / 2} textAnchor="middle" fontSize={40} fill="#475569" fontWeight="600" transform={`rotate(-90, -75, ${anchoMm / 2})`}>{anchoMm} mm</text>
          </g>

          {/* Armarios (dentro de las paredes) */}
          {armarios.map((a, i) => {
            const rot = (a.plano_rotacion as number) % 180;
            const W = rot === 0 ? a.ancho_total_mm : a.fondo_mm;
            const H = rot === 0 ? a.fondo_mm : a.ancho_total_mm;

            // Clamp a interior estancia
            const xClamped = Math.max(0, Math.min(largoMm - W, a.plano_x_mm));
            const yClamped = Math.max(0, Math.min(anchoMm - H, a.plano_y_mm));
            const estaFuera = xClamped !== a.plano_x_mm || yClamped !== a.plano_y_mm;

            return (
              <g key={a.id}>
                <rect
                  x={xClamped}
                  y={yClamped}
                  width={W}
                  height={H}
                  fill={COLORS[i % COLORS.length]}
                  stroke={estaFuera ? "#dc2626" : "#0f172a"}
                  strokeWidth={3}
                  opacity={0.92}
                  rx={4}
                />
                {/* Indicador frente del armario: línea más gruesa en el lado delantero */}
                <line
                  x1={xClamped}
                  y1={yClamped + H}
                  x2={xClamped + W}
                  y2={yClamped + H}
                  stroke="#0f172a"
                  strokeWidth={6}
                />
                <text
                  x={xClamped + W / 2}
                  y={yClamped + H / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={Math.min(36, W / 8)}
                  fill="#0f172a"
                  fontWeight="700"
                >
                  {a.nombre}
                </text>
                <text
                  x={xClamped + W / 2}
                  y={yClamped + H / 2 + 40}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={26}
                  fill="#1e293b"
                  fontWeight="500"
                >
                  {W}×{H}
                </text>
                {estaFuera ? (
                  <text x={xClamped + W / 2} y={yClamped - 10} textAnchor="middle" fontSize={28} fill="#dc2626" fontWeight="700">
                    ⚠ posición corregida
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-xs text-zinc-600 dark:text-zinc-400">Posicionar armarios:</p>
        <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 uppercase text-zinc-500 dark:bg-zinc-950/50 dark:text-zinc-400">
              <tr>
                <th className="px-3 py-2 font-medium">Armario</th>
                <th className="px-3 py-2 font-medium">Huella</th>
                <th className="px-3 py-2 font-medium">X (mm)</th>
                <th className="px-3 py-2 font-medium">Y (mm)</th>
                <th className="px-3 py-2 font-medium">Rotación</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {armarios.map((a) => {
                const save = async (fd: FormData) => {
                  "use server";
                  await actualizarPlanoArmario(proyectoId, estanciaId, a.id, fd);
                };
                return (
                  <tr key={a.id}>
                    <td className="px-3 py-2 font-medium">{a.nombre}</td>
                    <td className="px-3 py-2 font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
                      {a.ancho_total_mm} × {a.fondo_mm} mm
                    </td>
                    <td colSpan={4} className="px-3 py-2">
                      <form action={save} className="flex items-center gap-2">
                        <input name="plano_x_mm" type="number" min="0" defaultValue={a.plano_x_mm} className="w-20 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950" />
                        <input name="plano_y_mm" type="number" min="0" defaultValue={a.plano_y_mm} className="w-20 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950" />
                        <select name="plano_rotacion" defaultValue={String(a.plano_rotacion)} className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950">
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
