import { createClient } from "@/lib/supabase/server";
import { analizarOptimizacion, type PiezaAnalisis, type Sugerencia } from "@/lib/nesting/optimizacion";

export async function SugerenciasOptimizacion({ proyectoId }: { proyectoId: string }) {
  const s = await createClient();

  const { data: emp } = await s.from("empresas").select("config_empresa").limit(1).maybeSingle<{ config_empresa: Record<string, number> }>();
  const cfg = emp?.config_empresa ?? {};
  const tablUtilLargo = Number(cfg.tablero_util_ancho_cm ?? 240) * 10;
  const tablUtilAncho = Number(cfg.tablero_util_alto_cm ?? 120) * 10;

  const { data: rows } = await s
    .from("piezas_modulo")
    .select("nombre, largo_mm, ancho_mm, respeta_veta, modulos_armario!inner(particiones_verticales, alto_mm, armarios!inner(nombre, proyecto_id))")
    .eq("modulos_armario.armarios.proyecto_id", proyectoId);

  const piezas: PiezaAnalisis[] = (rows ?? []).map((r) => {
    const rr = r as unknown as {
      nombre: string; largo_mm: number; ancho_mm: number; respeta_veta: boolean;
      modulos_armario: { particiones_verticales: number; alto_mm: number; armarios: { nombre: string } };
    };
    return {
      pieza_nombre: rr.nombre,
      armario_nombre: rr.modulos_armario.armarios.nombre,
      largo_mm: rr.largo_mm,
      ancho_mm: rr.ancho_mm,
      respeta_veta: rr.respeta_veta,
      particiones_verticales: rr.modulos_armario.particiones_verticales,
      alto_modulo_mm: rr.modulos_armario.alto_mm,
    };
  });

  const sugerencias = analizarOptimizacion(piezas, tablUtilLargo, tablUtilAncho);

  return (
    <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h2 className="text-lg font-semibold">🧠 Asistente de optimización</h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Análisis determinista del estado actual · {piezas.length} pieza(s) revisadas
          </p>
        </div>
      </div>

      {sugerencias.length === 0 ? (
        <p className="rounded-md bg-zinc-50 p-4 text-sm text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
          No hay piezas que analizar. Explosiona primero desde los armarios.
        </p>
      ) : (
        <ul className="space-y-3">
          {sugerencias.map((sug, i) => <SugerenciaCard key={i} sug={sug} />)}
        </ul>
      )}
    </section>
  );
}

function SugerenciaCard({ sug }: { sug: Sugerencia }) {
  const color = sug.severidad === "critica"
    ? "border-red-300 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20"
    : sug.severidad === "importante"
      ? "border-amber-300 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20"
      : "border-emerald-300 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20";
  const icono = sug.severidad === "critica" ? "🚫" : sug.severidad === "importante" ? "⚠" : "✅";
  return (
    <li className={`rounded-lg border p-4 ${color}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl">{icono}</span>
        <div className="flex-1 space-y-2">
          <p className="text-sm font-semibold">{sug.titulo}</p>
          <p className="text-xs text-zinc-700 dark:text-zinc-300">{sug.descripcion}</p>
          {sug.acciones.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs">
              {sug.acciones.map((a, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-zinc-400">→</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </li>
  );
}
