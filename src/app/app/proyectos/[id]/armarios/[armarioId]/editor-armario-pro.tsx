"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Lightbulb, ChevronUp, ChevronDown } from "lucide-react";
import { Armario3DPro, type ModuloPro } from "./armario-3d-pro";
import {
  SUBELEMENTOS_META,
  type ModuloSubelemento,
  type TipoSubelemento,
} from "@/lib/tipos/proyectos";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Props = {
  proyectoId: string;
  armarioId: string;
  armario_ancho_mm: number;
  armario_alto_mm: number;
  armario_fondo_mm: number;
  tipo_instalacion: "empotrado" | "suelto";
  margen_tapeta_mm: number;
  modulos: ModuloPro[];
  onMoverModulo: (id: string, x_mm: number, y_mm: number) => Promise<void>;
  onActualizarLed: (moduloId: string, fd: FormData) => Promise<void>;
  onCrearSubelemento: (moduloId: string, fd: FormData) => Promise<void>;
  onActualizarSubelemento: (subelementoId: string, fd: FormData) => Promise<void>;
  onEliminarSubelemento: (subelementoId: string) => Promise<void>;
};

const TIPOS_POR_GRUPO: Record<string, TipoSubelemento[]> = {
  "Interior horizontal": [
    "cajon",
    "balda_fija",
    "balda_regulable",
    "barra_colgar",
    "hueco_abierto",
  ],
  "Frentes": ["puerta_abatible", "puerta_corredera", "puerta_plegable", "tapeta_ciega", "espejo"],
  "Complementos": [
    "zapatero",
    "cesto_extraible",
    "corbatero",
    "joyero",
    "portapantalones",
    "canaleta_tirador",
  ],
};

export function EditorArmarioPro(props: Props) {
  const {
    modulos,
    armario_ancho_mm,
    armario_alto_mm,
    armario_fondo_mm,
    tipo_instalacion,
    margen_tapeta_mm,
    onMoverModulo,
    onActualizarLed,
    onCrearSubelemento,
    onActualizarSubelemento,
    onEliminarSubelemento,
  } = props;

  const [selectedId, setSelectedId] = useState<string | null>(
    modulos[0]?.id ?? null,
  );
  const [pending, start] = useTransition();

  const selected = modulos.find((m) => m.id === selectedId) ?? null;

  const runServer = (fn: () => Promise<void>, ok: string) => {
    start(async () => {
      try {
        await fn();
        toast.success(ok);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div>
        <Armario3DPro
          armario_ancho_mm={armario_ancho_mm}
          armario_alto_mm={armario_alto_mm}
          armario_fondo_mm={armario_fondo_mm}
          tipo_instalacion={tipo_instalacion}
          margen_tapeta_mm={margen_tapeta_mm}
          modulos={modulos}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onMove={async (id, x, y) => {
            try {
              await onMoverModulo(id, x, y);
              toast.success("Posición guardada");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Error al mover");
            }
          }}
        />
      </div>

      <aside className="flex flex-col gap-3">
        {selected ? (
          <>
            <ModuloPosicionInputs
              modulo={selected}
              armario_ancho_mm={armario_ancho_mm}
              armario_alto_mm={armario_alto_mm}
              pending={pending}
              onMove={(x, y) =>
                runServer(() => onMoverModulo(selected.id, x, y), "Posición guardada")
              }
            />

            <LedControl
              modulo={selected}
              pending={pending}
              onSubmit={(fd) =>
                runServer(() => onActualizarLed(selected.id, fd), "LED actualizado")
              }
            />

            <SubelementosPanel
              modulo={selected}
              pending={pending}
              onCreate={(fd) =>
                runServer(() => onCrearSubelemento(selected.id, fd), "Subelemento añadido")
              }
              onUpdate={(subId, fd) =>
                runServer(() => onActualizarSubelemento(subId, fd), "Actualizado")
              }
              onDelete={(subId) =>
                runServer(() => onEliminarSubelemento(subId), "Eliminado")
              }
            />
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            Selecciona un módulo en el 3D o en la lista para configurarlo.
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Lista rápida
          </p>
          <ul className="space-y-1">
            {modulos.map((m) => {
              const active = m.id === selectedId;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(m.id)}
                    className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition ${
                      active ? "bg-foreground text-background" : "hover:bg-muted"
                    }`}
                  >
                    <span className="truncate font-semibold">{m.nombre}</span>
                    <span className={`font-mono ${active ? "" : "text-muted-foreground"}`}>
                      {m.ancho_mm}×{m.alto_mm}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </div>
  );
}

function ModuloPosicionInputs({
  modulo,
  armario_ancho_mm,
  armario_alto_mm,
  pending,
  onMove,
}: {
  modulo: ModuloPro;
  armario_ancho_mm: number;
  armario_alto_mm: number;
  pending: boolean;
  onMove: (x: number, y: number) => void;
}) {
  const [x, setX] = useState(modulo.posicion_x_mm);
  const [y, setY] = useState(modulo.posicion_y_mm);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        Módulo seleccionado
      </p>
      <h3 className="mt-0.5 text-base font-bold tracking-tight">{modulo.nombre}</h3>
      <p className="mt-0.5 font-mono text-xs text-muted-foreground">
        {modulo.ancho_mm} × {modulo.alto_mm} × {modulo.fondo_mm} mm
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Posición X (mm)
          </span>
          <input
            key={`x-${modulo.id}`}
            type="number"
            min={0}
            max={Math.max(0, armario_ancho_mm - modulo.ancho_mm)}
            defaultValue={x}
            onBlur={(e) => setX(Number.parseInt(e.target.value, 10) || 0)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-sm shadow-xs outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/15"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Posición Y (mm)
          </span>
          <input
            key={`y-${modulo.id}`}
            type="number"
            min={0}
            max={Math.max(0, armario_alto_mm - modulo.alto_mm)}
            defaultValue={y}
            onBlur={(e) => setY(Number.parseInt(e.target.value, 10) || 0)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-sm shadow-xs outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/15"
          />
        </label>
      </div>

      <Button
        type="button"
        size="sm"
        disabled={pending}
        className="mt-3 w-full"
        onClick={() => onMove(x, y)}
      >
        Aplicar posición
      </Button>
    </div>
  );
}

function LedControl({
  modulo,
  pending,
  onSubmit,
}: {
  modulo: ModuloPro;
  pending: boolean;
  onSubmit: (fd: FormData) => void;
}) {
  return (
    <form
      action={(fd) => onSubmit(fd)}
      className="rounded-2xl border border-border bg-card p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-amber-500" />
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Rebaje LED
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="tiene_led_rebaje"
          defaultChecked={modulo.tiene_led_rebaje}
          className="h-4 w-4 rounded border-input"
        />
        Avellanar canto para tira LED
      </label>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Color (#hex)
          </span>
          <input
            type="color"
            name="led_color_hex"
            defaultValue={modulo.led_color_hex ?? "#ffe066"}
            className="h-9 w-full cursor-pointer rounded-md border border-input bg-background"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Intensidad (lm/m)
          </span>
          <input
            type="number"
            name="led_intensidad_lm_m"
            min={0}
            defaultValue={modulo.led_intensidad_lm_m ?? ""}
            placeholder="500"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-sm shadow-xs outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/15"
          />
        </label>
      </div>

      <Button type="submit" size="sm" disabled={pending} className="mt-3 w-full" variant="outline">
        Guardar LED
      </Button>
    </form>
  );
}

function SubelementosPanel({
  modulo,
  pending,
  onCreate,
  onUpdate,
  onDelete,
}: {
  modulo: ModuloPro;
  pending: boolean;
  onCreate: (fd: FormData) => void;
  onUpdate: (subId: string, fd: FormData) => void;
  onDelete: (subId: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const subs = [...modulo.subelementos].sort((a, b) => a.orden - b.orden);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        Contenido del módulo
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {subs.length === 0
          ? "Sin subelementos. Añade cajones, baldas, puertas, LEDs..."
          : `${subs.length} subelemento${subs.length === 1 ? "" : "s"}`}
      </p>

      {subs.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {subs.map((s) => {
            const meta = SUBELEMENTOS_META[s.tipo];
            const isEditing = editingId === s.id;
            return (
              <li
                key={s.id}
                className="overflow-hidden rounded-xl border border-border bg-muted/30"
              >
                <button
                  type="button"
                  onClick={() => setEditingId((prev) => (prev === s.id ? null : s.id))}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition hover:bg-muted/50"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ background: meta?.color ?? "#888" }}
                    />
                    <span className="truncate text-sm font-semibold">
                      {s.etiqueta || meta?.label || s.tipo}
                    </span>
                  </div>
                  <Badge variant="secondary" className="shrink-0 font-mono text-[10px]">
                    {s.alto_mm ? `${s.alto_mm} mm` : "auto"}
                  </Badge>
                  {isEditing ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {isEditing ? (
                  <form
                    action={(fd) => {
                      onUpdate(s.id, fd);
                      setEditingId(null);
                    }}
                    className="border-t border-border bg-background p-3 space-y-3"
                  >
                    <label className="block space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Etiqueta
                      </span>
                      <input
                        name="etiqueta"
                        defaultValue={s.etiqueta ?? ""}
                        placeholder={meta?.label}
                        className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs shadow-xs"
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Alto (mm)
                        </span>
                        <input
                          name="alto_mm"
                          type="number"
                          min={10}
                          defaultValue={s.alto_mm ?? ""}
                          placeholder="auto"
                          className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 font-mono text-xs"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Orden
                        </span>
                        <input
                          name="orden"
                          type="number"
                          min={0}
                          defaultValue={s.orden}
                          className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 font-mono text-xs"
                        />
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="submit" size="xs" disabled={pending}>
                        Guardar
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        className="border-destructive/30 text-destructive"
                        onClick={() => {
                          if (confirm(`¿Eliminar "${s.etiqueta || meta?.label}"?`)) {
                            onDelete(s.id);
                            setEditingId(null);
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      <details className="mt-3">
        <summary className="cursor-pointer rounded-md bg-foreground px-3 py-2 text-center text-xs font-semibold text-background transition hover:opacity-90">
          <Plus className="mr-1 inline h-3 w-3" /> Añadir subelemento
        </summary>
        <form
          action={(fd) => onCreate(fd)}
          className="mt-3 space-y-3 rounded-xl border border-border bg-muted/20 p-3"
        >
          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Tipo
            </span>
            <select
              name="tipo"
              required
              className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-xs"
            >
              {Object.entries(TIPOS_POR_GRUPO).map(([grupo, tipos]) => (
                <optgroup key={grupo} label={grupo}>
                  {tipos.map((t) => (
                    <option key={t} value={t}>
                      {SUBELEMENTOS_META[t]?.label ?? t}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Alto (mm)
              </span>
              <input
                name="alto_mm"
                type="number"
                min={10}
                placeholder="auto"
                className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 font-mono text-xs"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Etiqueta
              </span>
              <input
                name="etiqueta"
                placeholder="p.ej. Cajón ropa interior"
                className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs"
              />
            </label>
          </div>
          <Button type="submit" size="xs" disabled={pending} className="w-full">
            Añadir al módulo
          </Button>
        </form>
      </details>
    </div>
  );
}

export type { ModuloPro };
