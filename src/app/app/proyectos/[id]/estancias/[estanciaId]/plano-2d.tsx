import { actualizarPlanoArmario } from "../../../plano-actions";
import type { Abertura, Armario } from "@/lib/tipos/proyectos";

/**
 * Vista en planta (superior) de la estancia con los armarios colocados.
 * - Renderiza aberturas (puertas/ventanas) como huecos en las paredes.
 * - Detecta colisión entre armarios pegados a la pared y las aberturas.
 * - Para armarios empotrados ofrece botones de snap a cada pared (enrasa por fuera).
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

  // Pared 0=superior (y=0), 1=derecha (x=largo), 2=inferior (y=ancho), 3=izquierda (x=0).
  // Un armario "toca" una pared si su borde más cercano está a < 50mm.
  const TOCA_MM = 50;

  function colisionaConAbertura(a: Armario): { pared: number; abertura: Abertura } | null {
    const rot = (a.plano_rotacion as number) % 180;
    const W = rot === 0 ? a.ancho_total_mm : a.fondo_mm;
    const H = rot === 0 ? a.fondo_mm : a.ancho_total_mm;
    const x0 = a.plano_x_mm;
    const y0 = a.plano_y_mm;
    const x1 = x0 + W;
    const y1 = y0 + H;

    for (const ab of aberturas) {
      if (ab.tipo !== "puerta" && ab.tipo !== "ventana") continue;
      const ini = ab.x_en_pared_mm;
      const fin = ab.x_en_pared_mm + ab.ancho_mm;
      // Pared 0 (superior): y ≈ 0, rango horizontal
      if (ab.pared_idx === 0 && y0 < TOCA_MM && x1 > ini && x0 < fin) {
        return { pared: 0, abertura: ab };
      }
      // Pared 2 (inferior): y+H ≈ anchoMm, rango horizontal
      if (ab.pared_idx === 2 && y1 > anchoMm - TOCA_MM && x1 > ini && x0 < fin) {
        return { pared: 2, abertura: ab };
      }
      // Pared 3 (izquierda): x ≈ 0, rango vertical (x_en_pared recorre Y)
      if (ab.pared_idx === 3 && x0 < TOCA_MM && y1 > ini && y0 < fin) {
        return { pared: 3, abertura: ab };
      }
      // Pared 1 (derecha): x+W ≈ largoMm, rango vertical
      if (ab.pared_idx === 1 && x1 > largoMm - TOCA_MM && y1 > ini && y0 < fin) {
        return { pared: 1, abertura: ab };
      }
    }
    return null;
  }

  // Para enrasado de empotrado: snapea posición a cada pared (el armario toca por fuera).
  function snapAPared(a: Armario, pared: number): { x: number; y: number; rot: number } {
    // Rotación según pared para que el frente quede hacia el interior de la estancia.
    // Pared 0 (norte): frente mira hacia +Y → rot 0
    // Pared 2 (sur):   frente mira hacia -Y → rot 180
    // Pared 3 (oeste): frente mira hacia +X → rot 270 (giro 90° CCW: ancho pasa a Y)
    // Pared 1 (este):  frente mira hacia -X → rot 90
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
    // Clamp al interior por si la huella sale
    x = Math.max(0, Math.min(largoMm - W, x));
    y = Math.max(0, Math.min(anchoMm - H, y));
    return { x, y, rot };
  }

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

          <rect x={-80} y={-80} width={largoMm + 160} height={anchoMm + 160} fill="url(#plano-grid)" />

          <rect x={0} y={0} width={largoMm} height={anchoMm} fill="#ffffff" fillOpacity={0.85} stroke="none" />

          {/* Paredes */}
          <g stroke="#1e293b" strokeWidth={8} strokeOpacity={0.5} fill="#94a3b8" fillOpacity={0.35}>
            <rect x={-50} y={-50} width={largoMm + 100} height={50} />
            <rect x={-50} y={anchoMm} width={largoMm + 100} height={50} />
            <rect x={-50} y={0} width={50} height={anchoMm} />
            <rect x={largoMm} y={0} width={50} height={anchoMm} />
          </g>

          {/* Aberturas: puerta (arco) y ventana (banda) */}
          {aberturas.map((ab) => {
            const ini = ab.x_en_pared_mm;
            const fin = ini + ab.ancho_mm;
            const color = ab.tipo === "puerta" ? "#f59e0b" : "#0ea5e9";
            const strokeStyle = ab.tipo === "puerta" ? undefined : "12 6";
            if (ab.pared_idx === 0) {
              return (
                <g key={ab.id}>
                  <rect x={ini} y={-52} width={ab.ancho_mm} height={54} fill="#fff" />
                  <line x1={ini} y1={-25} x2={fin} y2={-25} stroke={color} strokeWidth={6} strokeDasharray={strokeStyle} />
                  {ab.tipo === "puerta" && (
                    <path d={`M ${ini} 0 A ${ab.ancho_mm} ${ab.ancho_mm} 0 0 1 ${fin} ${ab.ancho_mm}`} fill="none" stroke={color} strokeWidth={2} strokeDasharray="4 4" />
                  )}
                  <text x={(ini + fin) / 2} y={-60} textAnchor="middle" fontSize={22} fill={color} fontWeight="600">
                    {ab.tipo === "puerta" ? "🚪" : "🪟"} {ab.etiqueta ?? ab.ancho_mm}
                  </text>
                </g>
              );
            }
            if (ab.pared_idx === 2) {
              return (
                <g key={ab.id}>
                  <rect x={ini} y={anchoMm} width={ab.ancho_mm} height={54} fill="#fff" />
                  <line x1={ini} y1={anchoMm + 25} x2={fin} y2={anchoMm + 25} stroke={color} strokeWidth={6} strokeDasharray={strokeStyle} />
                  {ab.tipo === "puerta" && (
                    <path d={`M ${ini} ${anchoMm} A ${ab.ancho_mm} ${ab.ancho_mm} 0 0 0 ${fin} ${anchoMm - ab.ancho_mm}`} fill="none" stroke={color} strokeWidth={2} strokeDasharray="4 4" />
                  )}
                  <text x={(ini + fin) / 2} y={anchoMm + 72} textAnchor="middle" fontSize={22} fill={color} fontWeight="600">
                    {ab.tipo === "puerta" ? "🚪" : "🪟"} {ab.etiqueta ?? ab.ancho_mm}
                  </text>
                </g>
              );
            }
            if (ab.pared_idx === 3) {
              return (
                <g key={ab.id}>
                  <rect x={-52} y={ini} width={54} height={ab.ancho_mm} fill="#fff" />
                  <line x1={-25} y1={ini} x2={-25} y2={fin} stroke={color} strokeWidth={6} strokeDasharray={strokeStyle} />
                  {ab.tipo === "puerta" && (
                    <path d={`M 0 ${ini} A ${ab.ancho_mm} ${ab.ancho_mm} 0 0 0 ${ab.ancho_mm} ${fin}`} fill="none" stroke={color} strokeWidth={2} strokeDasharray="4 4" />
                  )}
                  <text x={-60} y={(ini + fin) / 2} textAnchor="middle" fontSize={22} fill={color} fontWeight="600" transform={`rotate(-90, -60, ${(ini + fin) / 2})`}>
                    {ab.tipo === "puerta" ? "🚪" : "🪟"} {ab.etiqueta ?? ab.ancho_mm}
                  </text>
                </g>
              );
            }
            if (ab.pared_idx === 1) {
              return (
                <g key={ab.id}>
                  <rect x={largoMm} y={ini} width={54} height={ab.ancho_mm} fill="#fff" />
                  <line x1={largoMm + 25} y1={ini} x2={largoMm + 25} y2={fin} stroke={color} strokeWidth={6} strokeDasharray={strokeStyle} />
                  {ab.tipo === "puerta" && (
                    <path d={`M ${largoMm} ${ini} A ${ab.ancho_mm} ${ab.ancho_mm} 0 0 1 ${largoMm - ab.ancho_mm} ${fin}`} fill="none" stroke={color} strokeWidth={2} strokeDasharray="4 4" />
                  )}
                  <text x={largoMm + 60} y={(ini + fin) / 2} textAnchor="middle" fontSize={22} fill={color} fontWeight="600" transform={`rotate(90, ${largoMm + 60}, ${(ini + fin) / 2})`}>
                    {ab.tipo === "puerta" ? "🚪" : "🪟"} {ab.etiqueta ?? ab.ancho_mm}
                  </text>
                </g>
              );
            }
            return null;
          })}

          <rect x={0} y={0} width={largoMm} height={anchoMm} fill="none" stroke="#334155" strokeWidth={3} />

          {/* Cotas */}
          <g>
            <line x1={0} y1={anchoMm + 60} x2={largoMm} y2={anchoMm + 60} stroke="#64748b" strokeWidth={2} />
            <text x={largoMm / 2} y={anchoMm + 80} textAnchor="middle" fontSize={40} fill="#475569" fontWeight="600">{largoMm} mm</text>
          </g>
          <g>
            <line x1={-60} y1={0} x2={-60} y2={anchoMm} stroke="#64748b" strokeWidth={2} />
            <text x={-75} y={anchoMm / 2} textAnchor="middle" fontSize={40} fill="#475569" fontWeight="600" transform={`rotate(-90, -75, ${anchoMm / 2})`}>{anchoMm} mm</text>
          </g>

          {/* Armarios */}
          {armarios.map((a, i) => {
            const rot = (a.plano_rotacion as number) % 180;
            const W = rot === 0 ? a.ancho_total_mm : a.fondo_mm;
            const H = rot === 0 ? a.fondo_mm : a.ancho_total_mm;

            const xClamped = Math.max(0, Math.min(largoMm - W, a.plano_x_mm));
            const yClamped = Math.max(0, Math.min(anchoMm - H, a.plano_y_mm));
            const estaFuera = xClamped !== a.plano_x_mm || yClamped !== a.plano_y_mm;
            const col = colisionaConAbertura(a);

            const strokeCol = col ? "#dc2626" : estaFuera ? "#dc2626" : "#0f172a";
            const fillCol = col ? "#fecaca" : COLORS[i % COLORS.length];

            return (
              <g key={a.id}>
                <rect
                  x={xClamped}
                  y={yClamped}
                  width={W}
                  height={H}
                  fill={fillCol}
                  stroke={strokeCol}
                  strokeWidth={col ? 5 : 3}
                  opacity={0.92}
                  rx={4}
                />
                <line
                  x1={xClamped}
                  y1={yClamped + H}
                  x2={xClamped + W}
                  y2={yClamped + H}
                  stroke="#0f172a"
                  strokeWidth={6}
                />
                <text x={xClamped + W / 2} y={yClamped + H / 2} textAnchor="middle" dominantBaseline="central" fontSize={Math.min(36, W / 8)} fill="#0f172a" fontWeight="700">
                  {a.nombre}
                </text>
                <text x={xClamped + W / 2} y={yClamped + H / 2 + 40} textAnchor="middle" dominantBaseline="central" fontSize={26} fill="#1e293b" fontWeight="500">
                  {W}×{H}
                </text>
                {col ? (
                  <text x={xClamped + W / 2} y={yClamped - 10} textAnchor="middle" fontSize={28} fill="#dc2626" fontWeight="700">
                    ⚠ bloquea {col.abertura.tipo}
                  </text>
                ) : estaFuera ? (
                  <text x={xClamped + W / 2} y={yClamped - 10} textAnchor="middle" fontSize={28} fill="#dc2626" fontWeight="700">
                    ⚠ posición corregida
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Leyenda */}
      {aberturas.length > 0 && (
        <div className="mx-auto mt-3 flex max-w-3xl flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">🚪 puerta</span>
          <span className="inline-flex items-center gap-1.5">🪟 ventana</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-3 rounded-sm bg-red-300 ring-1 ring-red-600" /> colisión con abertura
          </span>
        </div>
      )}

      <div className="mt-4 space-y-2">
        <p className="text-xs text-zinc-600 dark:text-zinc-400">Posicionar armarios:</p>
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
                const save = async (fd: FormData) => {
                  "use server";
                  await actualizarPlanoArmario(proyectoId, estanciaId, a.id, fd);
                };
                const snap = async (fd: FormData) => {
                  "use server";
                  const pared = Number(fd.get("pared") ?? 0);
                  const { x, y, rot } = snapAPared(a, pared);
                  const fd2 = new FormData();
                  fd2.set("plano_x_mm", String(x));
                  fd2.set("plano_y_mm", String(y));
                  fd2.set("plano_rotacion", String(rot));
                  await actualizarPlanoArmario(proyectoId, estanciaId, a.id, fd2);
                };
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
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        {[
                          { v: 0, l: "↑ N" },
                          { v: 1, l: "→ E" },
                          { v: 2, l: "↓ S" },
                          { v: 3, l: "← O" },
                        ].map((p) => (
                          <form key={p.v} action={snap} className="inline">
                            <input type="hidden" name="pared" value={p.v} />
                            <button
                              type="submit"
                              title={`Enrasar contra la pared ${p.l}`}
                              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-[10px] font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                            >
                              {p.l}
                            </button>
                          </form>
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
