"use client";

import { useMemo, useState, useTransition } from "react";
import { CATEGORIAS_MODULO, type CategoriaModulo } from "@/lib/tipos/tipos_modulo";

type TipoEstandar = {
  id: string;
  nombre: string;
  categoria: CategoriaModulo;
  ancho_default_mm: number;
  alto_default_mm: number;
  fondo_default_mm: number;
};

const CAT_INFO = Object.fromEntries(CATEGORIAS_MODULO.map((c) => [c.value, c]));

export function ProponerDisenoForm({
  tipos,
  ancho_armario_mm,
  action,
}: {
  tipos: TipoEstandar[];
  ancho_armario_mm: number;
  action: (payload: { items: { tipo_modulo_id: string; cantidad: number }[] }) => Promise<void>;
}) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [cantidades, setCantidades] = useState<Record<string, number>>({});

  // Agrupar por categoría
  const porCategoria = useMemo(() => {
    const m = new Map<CategoriaModulo, TipoEstandar[]>();
    for (const t of tipos) {
      const arr = m.get(t.categoria) ?? [];
      arr.push(t);
      m.set(t.categoria, arr);
    }
    return m;
  }, [tipos]);

  const anchoPropuesto = useMemo(() => {
    let total = 0;
    for (const t of tipos) {
      const n = cantidades[t.id] ?? 0;
      total += n * t.ancho_default_mm;
    }
    return total;
  }, [cantidades, tipos]);

  const libre = ancho_armario_mm - anchoPropuesto;

  const cambiar = (id: string, delta: number) => {
    setCantidades((prev) => {
      const next = { ...prev };
      const v = Math.max(0, (next[id] ?? 0) + delta);
      if (v === 0) delete next[id];
      else next[id] = v;
      return next;
    });
  };

  const aplicar = () => {
    const items = Object.entries(cantidades)
      .filter(([, n]) => n > 0)
      .map(([tipo_modulo_id, cantidad]) => ({ tipo_modulo_id, cantidad }));
    if (items.length === 0) return;
    start(() => action({ items }));
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
      >
        ✨ Proponer diseño
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-zinc-900" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-start justify-between border-b border-zinc-200 p-5 dark:border-zinc-800">
          <div>
            <h2 className="text-xl font-semibold">Proponer diseño del armario</h2>
            <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
              Hueco disponible: <strong>{ancho_armario_mm} mm</strong> de ancho. Selecciona cuántos módulos de cada tipo quieres.
            </p>
          </div>
          <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">✕</button>
        </header>

        {/* Sticky resumen */}
        <div className={`sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 px-5 py-3 text-sm dark:border-zinc-800 ${libre < 0 ? "bg-red-50 dark:bg-red-950/40" : "bg-zinc-50 dark:bg-zinc-950/50"}`}>
          <div className="flex items-center gap-4">
            <span>Ancho propuesto: <strong className="font-mono">{anchoPropuesto} mm</strong></span>
            <span>
              {libre >= 0
                ? <>Libre: <strong className="font-mono text-emerald-700 dark:text-emerald-400">{libre} mm</strong></>
                : <>Exceso: <strong className="font-mono text-red-700 dark:text-red-400">{Math.abs(libre)} mm</strong></>}
            </span>
          </div>
          <div className="h-2 w-48 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
            <div className={`h-full ${libre < 0 ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, (anchoPropuesto / ancho_armario_mm) * 100)}%` }} />
          </div>
        </div>

        {/* Lista tipos por categoría */}
        <div className="flex-1 overflow-y-auto p-5">
          {tipos.length === 0 ? (
            <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
              No hay tipos estándar. Ejecuta <code>pnpm seed-tipos-estandar</code> o créalos en <strong>Tipos de módulo</strong>.
            </p>
          ) : (
            <div className="space-y-5">
              {Array.from(porCategoria.entries()).map(([cat, lista]) => (
                <section key={cat}>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    <span className="text-base">{CAT_INFO[cat]?.emoji}</span>
                    {CAT_INFO[cat]?.label ?? cat}
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {lista.map((t) => {
                      const n = cantidades[t.id] ?? 0;
                      return (
                        <div key={t.id} className={`flex items-center justify-between rounded-lg border p-3 transition ${n > 0 ? "border-emerald-500 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-950/20" : "border-zinc-200 dark:border-zinc-800"}`}>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{t.nombre}</p>
                            <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                              {t.ancho_default_mm} × {t.alto_default_mm} × {t.fondo_default_mm} mm
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => cambiar(t.id, -1)} disabled={n === 0} className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-300 text-sm disabled:opacity-30 dark:border-zinc-700">−</button>
                            <span className="w-6 text-center font-mono text-sm font-semibold">{n}</span>
                            <button type="button" onClick={() => cambiar(t.id, +1)} className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-300 text-sm dark:border-zinc-700">+</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-zinc-200 px-5 py-3 dark:border-zinc-800">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {libre < 0 ? "⚠ Sobrepasa el hueco. Ajusta cantidades." : libre > 0 ? `Sobrarán ${libre} mm libres.` : "Ajuste perfecto."}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setOpen(false)} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium dark:border-zinc-700 dark:bg-zinc-900">
              Cancelar
            </button>
            <button
              onClick={aplicar}
              disabled={pending || anchoPropuesto === 0}
              className="rounded-md bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {pending ? "Aplicando..." : "Aplicar al armario"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
