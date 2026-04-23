"use client";

import { useState, useTransition } from "react";
import {
  FUENTES_DIM,
  LADOS_CANTO,
  PRESETS_PIEZA,
  type FuenteDim,
  type LadosCanto,
  type PresetPieza,
} from "@/lib/tipos/tipos_modulo";
import { NINGUNA } from "@/lib/tipos/catalogo";

type RefOption = { id: string; label: string };
type CantoOption = { id: string; label: string };

export function PiezaForm({
  action,
  refTableros,
  cantos,
}: {
  action: (fd: FormData) => void | Promise<void>;
  refTableros: RefOption[];
  cantos: CantoOption[];
}) {
  const [pending, start] = useTransition();
  const [preset, setPreset] = useState<PresetPieza>(PRESETS_PIEZA[0]);
  const [fields, setFields] = useState(() => ({
    ...PRESETS_PIEZA[0].defaults,
  }));

  const aplicarPreset = (key: string) => {
    const p = PRESETS_PIEZA.find((x) => x.key === key) ?? PRESETS_PIEZA[0];
    setPreset(p);
    setFields({ ...p.defaults });
  };

  const set = <K extends keyof typeof fields>(k: K, v: (typeof fields)[K]) =>
    setFields((prev) => ({ ...prev, [k]: v }));

  return (
    <form
      action={(fd) => start(() => action(fd))}
      className="space-y-4 rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 p-4 dark:border-zinc-700 dark:bg-zinc-950/30"
    >
      <div className="space-y-1">
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Partir de preset
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESETS_PIEZA.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => aplicarPreset(p.key)}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                preset.key === p.key
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{preset.descripcion}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Input label="Nombre *" name="nombre" value={fields.nombre ?? ""} required onChange={(v) => set("nombre", v)} className="sm:col-span-2" />
        <Input label="Cantidad" name="cantidad" type="number" value={String(fields.cantidad ?? 1)} onChange={(v) => set("cantidad", Number.parseInt(v) || 1)} />
        <Input label="Orden" name="orden" type="number" value="0" onChange={() => {}} />
      </div>

      <div className="grid gap-3 rounded-md border border-zinc-200 p-3 sm:grid-cols-4 dark:border-zinc-800">
        <Sel label="Fuente LARGO *" name="fuente_largo" value={fields.fuente_largo ?? "ancho"} onChange={(v) => set("fuente_largo", v as FuenteDim)} options={FUENTES_DIM} />
        <Input label="Ajuste mm" name="ajuste_largo_mm" type="number" value={String(fields.ajuste_largo_mm ?? 0)} onChange={(v) => set("ajuste_largo_mm", Number.parseInt(v) || 0)} />
        <Input label="Ajuste × grosores" name="ajuste_largo_grosores" type="number" value={String(fields.ajuste_largo_grosores ?? 0)} onChange={(v) => set("ajuste_largo_grosores", Number.parseInt(v) || 0)} />
        {fields.fuente_largo === "fijo" ? (
          <Input label="Valor fijo mm" name="valor_largo_fijo_mm" type="number" value={String(fields.valor_largo_fijo_mm ?? "")} required onChange={(v) => set("valor_largo_fijo_mm", Number.parseInt(v) || null)} />
        ) : <div />}
      </div>

      <div className="grid gap-3 rounded-md border border-zinc-200 p-3 sm:grid-cols-4 dark:border-zinc-800">
        <Sel label="Fuente ANCHO *" name="fuente_ancho" value={fields.fuente_ancho ?? "alto"} onChange={(v) => set("fuente_ancho", v as FuenteDim)} options={FUENTES_DIM} />
        <Input label="Ajuste mm" name="ajuste_ancho_mm" type="number" value={String(fields.ajuste_ancho_mm ?? 0)} onChange={(v) => set("ajuste_ancho_mm", Number.parseInt(v) || 0)} />
        <Input label="Ajuste × grosores" name="ajuste_ancho_grosores" type="number" value={String(fields.ajuste_ancho_grosores ?? 0)} onChange={(v) => set("ajuste_ancho_grosores", Number.parseInt(v) || 0)} />
        {fields.fuente_ancho === "fijo" ? (
          <Input label="Valor fijo mm" name="valor_ancho_fijo_mm" type="number" value={String(fields.valor_ancho_fijo_mm ?? "")} required onChange={(v) => set("valor_ancho_fijo_mm", Number.parseInt(v) || null)} />
        ) : <div />}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Sel
          label="Referencia tablero (opcional)"
          name="referencia_tablero_id"
          value={NINGUNA}
          onChange={() => {}}
          options={[{ value: NINGUNA, label: "— usa el default del tipo —" }, ...refTableros.map((r) => ({ value: r.id, label: r.label }))]}
        />
        <Sel
          label="Canto (opcional)"
          name="canto_id"
          value={NINGUNA}
          onChange={() => {}}
          options={[{ value: NINGUNA, label: "— sin canto —" }, ...cantos.map((c) => ({ value: c.id, label: c.label }))]}
        />
        <Sel
          label="Lados con canto"
          name="lados_con_canto"
          value={fields.lados_con_canto ?? "ninguno"}
          onChange={(v) => set("lados_con_canto", v as LadosCanto)}
          options={LADOS_CANTO}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">Notas</label>
        <textarea
          name="notas"
          rows={2}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Añadiendo..." : "Añadir pieza"}
      </button>
    </form>
  );
}

function Input({
  label, name, type = "text", value, required = false, className = "", onChange,
}: {
  label: string; name: string; type?: string; value: string; required?: boolean; className?: string; onChange: (v: string) => void;
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label htmlFor={name} className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
      <input
        id={name} name={name} type={type} required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
      />
    </div>
  );
}
function Sel({
  label, name, value, onChange, options,
}: {
  label: string; name: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
      <select
        id={name} name={name} value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
