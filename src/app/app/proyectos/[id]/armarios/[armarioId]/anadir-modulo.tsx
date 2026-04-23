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
}: {
  action: (fd: FormData) => void | Promise<void>;
  tipos: TipoOption[];
  referencias: RefOption[];
  alto_total_mm: number;
  fondo_mm: number;
}) {
  const [tipoId, setTipoId] = useState("");
  const [ancho, setAncho] = useState("");
  const [alto, setAlto] = useState(String(alto_total_mm));
  const [fondo, setFondo] = useState(String(fondo_mm));

  const elegirTipo = (id: string) => {
    setTipoId(id);
    const t = tipos.find((x) => x.id === id);
    if (t) {
      setAncho(String(t.ancho_default_mm));
      // Alto y fondo: por defecto los del armario (se aprovechan al máximo)
      setAlto(String(alto_total_mm));
      setFondo(String(fondo_mm));
    }
  };

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
        <input id="alto_mm" name="alto_mm" type="number" required value={alto} onChange={(e) => setAlto(e.target.value)}
          className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
      </div>
      <div className="space-y-1">
        <label htmlFor="fondo_mm" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Fondo (mm) *</label>
        <input id="fondo_mm" name="fondo_mm" type="number" required value={fondo} onChange={(e) => setFondo(e.target.value)}
          className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
      </div>
      <div className="sm:col-span-3 space-y-1">
        <label htmlFor="nombre_override" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Nombre (opcional)</label>
        <input id="nombre_override" name="nombre_override" type="text" placeholder="usa el del tipo si se deja vacío"
          className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
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
