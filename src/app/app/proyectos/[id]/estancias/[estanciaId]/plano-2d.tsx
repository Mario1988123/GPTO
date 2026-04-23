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
        <svg viewBox={`-50 -50 ${largoMm + 100} ${anchoMm + 100}`} preserveAspectRatio="xMidYMid meet" className="h-auto w-full" style={{ maxHeight: 480 }}>
          {/* Suelo estancia */}
          <rect x={0} y={0} width={largoMm} height={anchoMm} fill="#fafafa" stroke="#71717a" strokeWidth={6} className="dark:fill-zinc-900" />
          {/* Cota largo */}
          <g>
            <line x1={0} y1={anchoMm + 30} x2={largoMm} y2={anchoMm + 30} stroke="#a1a1aa" strokeWidth={2} />
            <text x={largoMm / 2} y={anchoMm + 50} textAnchor="middle" fontSize={40} fill="#52525b">{largoMm} mm</text>
          </g>
          {/* Cota ancho */}
          <g>
            <line x1={-30} y1={0} x2={-30} y2={anchoMm} stroke="#a1a1aa" strokeWidth={2} />
            <text x={-45} y={anchoMm / 2} textAnchor="middle" fontSize={40} fill="#52525b" transform={`rotate(-90, -45, ${anchoMm / 2})`}>{anchoMm} mm</text>
          </g>

          {/* Armarios */}
          {armarios.map((a, i) => {
            // Huella del armario = ancho × fondo (visto desde arriba, el alto no importa)
            const rot = (a.plano_rotacion as number) % 180;
            const W = rot === 0 ? a.ancho_total_mm : a.fondo_mm;
            const H = rot === 0 ? a.fondo_mm : a.ancho_total_mm;
            return (
              <g key={a.id}>
                <rect
                  x={a.plano_x_mm}
                  y={a.plano_y_mm}
                  width={W}
                  height={H}
                  fill={COLORS[i % COLORS.length]}
                  stroke="#18181b"
                  strokeWidth={3}
                  opacity={0.75}
                />
                <text
                  x={a.plano_x_mm + W / 2}
                  y={a.plano_y_mm + H / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={Math.min(36, W / 8)}
                  fill="#18181b"
                  fontWeight="bold"
                >
                  {a.nombre}
                </text>
                <text
                  x={a.plano_x_mm + W / 2}
                  y={a.plano_y_mm + H / 2 + 40}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={28}
                  fill="#27272a"
                >
                  {W}×{H}
                </text>
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
