"use client";

import { useState } from "react";
import { NINGUNA } from "@/lib/tipos/catalogo";

type TipoOption = {
  id: string;
  nombre: string;
  ancho_default_mm: number;
  alto_default_mm: number;
  fondo_default_mm: number;
};

type RefOption = { id: string; label: string };

export function AnadirModuloForm({
  action,
  tipos,
  referencias,
  alto_total_mm,
  fondo_mm,
  tablero_util_alto_mm,
}: {
  action: (fd: FormData) => void | Promise<void>;
  tipos: TipoOption[];
  referencias: RefOption[];
  alto_total_mm: number;
  fondo_mm: number;
  tablero_util_alto_mm: number;
}) {
  const [tipoId, setTipoId] = useState("");
  const [ancho, setAncho] = useState("");
  const [alto, setAlto] = useState(String(alto_total_mm));
  const [fondo, setFondo] = useState(String(fondo_mm));
  const [particiones, setParticiones] = useState("1");

  const calcularParticiones = (altoNum: number): number => {
    if (!Number.isFinite(altoNum) || altoNum <= 0) return 1;
    return Math.max(1, Math.ceil(altoNum / tablero_util_alto_mm));
  };

  const elegirTipo = (id: string) => {
    setTipoId(id);
    const t = tipos.find((x) => x.id === id);
    if (t) {
      setAncho(String(t.ancho_default_mm));
      // Respetar el alto por defecto del tipo (un colgador corto es 1200mm, no 2500mm).
      // Topeado al alto total del armario.
      const altoSugerido = Math.min(t.alto_default_mm, alto_total_mm);
      setAlto(String(altoSugerido));
      setFondo(String(fondo_mm));
      setParticiones(String(calcularParticiones(altoSugerido)));
    }
  };

  const onAltoChange = (v: string) => {
    setAlto(v);
    const n = Number.parseInt(v, 10);
    if (Number.isFinite(n)) {
      // auto-sugerir particiones si el alto supera el tablero
      setParticiones(String(calcularParticiones(n)));
    }
  };

  const altoNum = Number.parseInt(alto, 10) || 0;
  const partNum = Math.max(1, Number.parseInt(particiones, 10) || 1);
  const altoPorParticion = partNum > 1 ? Math.round(altoNum / partNum) : null;

  return (
    <form action={action} className="grid gap-3 rounded-lg border border-dashed border-zinc-300 p-4 sm:grid-cols-6 dark:border-zinc-700">
      <div className="sm:col-span-3 space-y-1">
        <label htmlFor="tipo_modulo_id" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Tipo de módulo *</label>
        <select
          id="tipo_modulo_id"
          name="tipo_modulo_id"
          required
          value={tipoId}
          onChange={(e) => elegirTipo(e.target.value)}
          className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        >
          <option value="">— selecciona —</option>
          {tipos.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre} ({t.ancho_default_mm}×{t.alto_default_mm}×{t.fondo_default_mm})
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label htmlFor="ancho_mm" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Ancho (mm) *</label>
        <input id="ancho_mm" name="ancho_mm" type="number" required value={ancho} onChange={(e) => setAncho(e.target.value)}
          className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
      </div>
      <div className="space-y-1">
        <label htmlFor="alto_mm" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Alto (mm) *</label>
        <input id="alto_mm" name="alto_mm" type="number" required value={alto} onChange={(e) => onAltoChange(e.target.value)}
          className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
      </div>
      <div className="space-y-1">
        <label htmlFor="fondo_mm" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Fondo (mm) *</label>
        <input id="fondo_mm" name="fondo_mm" type="number" required value={fondo} onChange={(e) => setFondo(e.target.value)}
          className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
      </div>
      <div className="sm:col-span-2 space-y-1">
        <label htmlFor="nombre_override" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Nombre (opcional)</label>
        <input id="nombre_override" name="nombre_override" type="text" placeholder="usa el del tipo si se deja vacío"
          className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
      </div>
      <div className="space-y-1">
        <label htmlFor="particiones_verticales" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
          Particiones ↕
        </label>
        <input
          id="particiones_verticales"
          name="particiones_verticales"
          type="number"
          min="1"
          max="10"
          value={particiones}
          onChange={(e) => setParticiones(e.target.value)}
          className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
          {altoPorParticion
            ? `${partNum} módulos apilados de ${altoPorParticion} mm`
            : "1 módulo entero"}
          {altoNum > tablero_util_alto_mm && partNum === 1 ? (
            <span className="ml-1 text-amber-600 dark:text-amber-400">
              ⚠ alto {altoNum} mm &gt; tablero útil {tablero_util_alto_mm} mm
            </span>
          ) : null}
        </p>
      </div>
      <div className="sm:col-span-3 space-y-1">
        <label htmlFor="referencia_tablero_id" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Tablero (override opcional)</label>
        <select id="referencia_tablero_id" name="referencia_tablero_id" defaultValue={NINGUNA}
          className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950">
          <option value={NINGUNA}>— usa el default del tipo —</option>
          {referencias.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
      </div>
      <div className="sm:col-span-6">
        <button type="submit" className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
          + Añadir módulo
        </button>
      </div>
    </form>
  );
}
