"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Lightbulb, ChevronUp, ChevronDown, Sparkles, Truck, Wrench, Settings2 } from "lucide-react";
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
  onGenerarCajones: (
    moduloId: string,
    distribucion: "iguales" | "progresiva" | "personalizada",
    n: number,
    alturasMm: number[] | null,
  ) => Promise<void>;
  onActualizarConfigModulo: (moduloId: string, fd: FormData) => Promise<void>;
  tiradores?: { id: string; nombre: string }[];
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
    onGenerarCajones,
    onActualizarConfigModulo,
    tiradores = [],
  } = props;

  const [selectedId, setSelectedId] = useState<string | null>(
    modulos[0]?.id ?? null,
  );
  // Override global de puertas: null = respetar config individual, true/false = forzar.
  const [mostrarPuertasGlobal, setMostrarPuertasGlobal] = useState<boolean | null>(null);
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
        {/* Toolbar del 3D */}
        <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
          <div className="inline-flex gap-1 rounded-md border border-border bg-muted/40 p-0.5 text-[11px]">
            <button type="button" onClick={() => setMostrarPuertasGlobal(null)} className={`rounded px-2 py-1 font-medium transition ${mostrarPuertasGlobal === null ? "bg-background shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"}`}>
              Individual
            </button>
            <button type="button" onClick={() => setMostrarPuertasGlobal(true)} className={`rounded px-2 py-1 font-medium transition ${mostrarPuertasGlobal === true ? "bg-background shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"}`}>
              Ver puertas
            </button>
            <button type="button" onClick={() => setMostrarPuertasGlobal(false)} className={`rounded px-2 py-1 font-medium transition ${mostrarPuertasGlobal === false ? "bg-background shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"}`}>
              Sin puertas
            </button>
          </div>
        </div>
        <Armario3DPro
          armario_ancho_mm={armario_ancho_mm}
          armario_alto_mm={armario_alto_mm}
          armario_fondo_mm={armario_fondo_mm}
          tipo_instalacion={tipo_instalacion}
          margen_tapeta_mm={margen_tapeta_mm}
          modulos={modulos}
          mostrarPuertasOverride={mostrarPuertasGlobal}
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

            <ConfigModulo
              modulo={selected}
              pending={pending}
              onSubmit={(fd) =>
                runServer(
                  () => onActualizarConfigModulo(selected.id, fd),
                  "Configuración actualizada",
                )
              }
            />

            <GeneradorCajones
              modulo={selected}
              pending={pending}
              onGenerar={(dist, n, alturas) =>
                runServer(
                  () => onGenerarCajones(selected.id, dist, n, alturas),
                  `${n} cajones ${dist} generados`,
                )
              }
            />

            <SubelementosPanel
              modulo={selected}
              pending={pending}
              tiradores={tiradores}
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

function SubelementoEditor({
  s,
  meta,
  pending,
  tiradores = [],
  onSave,
  onDelete,
}: {
  s: ModuloSubelemento;
  meta: { label: string; color: string } | undefined;
  pending: boolean;
  tiradores?: { id: string; nombre: string }[];
  onSave: (fd: FormData) => void;
  onDelete: () => void;
}) {
  const [esPropio, setEsPropio] = useState(s.es_propio ?? true);
  const esCajon = s.tipo === "cajon";
  const llevaTirador = esCajon || s.tipo === "puerta_abatible" || s.tipo === "puerta_corredera" || s.tipo === "puerta_plegable";
  const tiradorActual = (s.config as { tirador?: string } | null)?.tirador ?? "";

  return (
    <form
      action={(fd) => onSave(fd)}
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
        {esCajon ? (
          <label className="col-span-2 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Fondo específico (mm, opcional)
            </span>
            <input
              name="fondo_mm"
              type="number"
              min={50}
              defaultValue={s.fondo_mm ?? ""}
              placeholder="Igual al módulo"
              className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 font-mono text-xs"
            />
          </label>
        ) : null}
      </div>

      {/* Origen: propio vs proveedor (sólo cajones y puertas externas) */}
      {esCajon ? (
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Origen
          </p>
          <div className="grid grid-cols-2 gap-1 rounded-md border border-input bg-background p-1">
            <label
              className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold transition ${
                esPropio ? "bg-emerald-500/10 text-emerald-700" : "text-muted-foreground"
              }`}
            >
              <input
                type="radio"
                name="es_propio"
                value="true"
                checked={esPropio}
                onChange={() => setEsPropio(true)}
                className="hidden"
              />
              <Wrench className="h-3 w-3" />
              Fab. propia
            </label>
            <label
              className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold transition ${
                !esPropio ? "bg-blue-500/10 text-blue-700" : "text-muted-foreground"
              }`}
            >
              <input
                type="radio"
                name="es_propio"
                value="false"
                checked={!esPropio}
                onChange={() => setEsPropio(false)}
                className="hidden"
              />
              <Truck className="h-3 w-3" />
              Proveedor
            </label>
          </div>

          {!esPropio ? (
            <div className="mt-3 space-y-2">
              <label className="block space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Proveedor
                </span>
                <input
                  name="proveedor_nombre"
                  defaultValue={s.proveedor_nombre ?? ""}
                  placeholder="p.ej. Blum"
                  className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Ref.
                  </span>
                  <input
                    name="ref_proveedor"
                    defaultValue={s.ref_proveedor ?? ""}
                    className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 font-mono text-xs"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Precio €/ud
                  </span>
                  <input
                    name="precio_override_eur"
                    type="number"
                    step="0.01"
                    min={0}
                    defaultValue={s.precio_override_eur ?? ""}
                    placeholder="0.00"
                    className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 font-mono text-xs"
                  />
                </label>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Este cajón NO se explosionará en piezas; entrará en presupuesto como línea de
                proveedor.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Selector de tirador (cajones y puertas) */}
      {llevaTirador && (
        <label className="block space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Tirador
          </span>
          <select
            name="config_tirador"
            defaultValue={tiradorActual}
            className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs shadow-xs"
          >
            <option value="">— sin tirador —</option>
            {tiradores.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
          <span className="text-[10px] text-muted-foreground">
            {tiradores.length === 0 ? (
              <>Crea tiradores en <a href="/app/catalogo/herrajes" className="underline">catálogo · herrajes</a>.</>
            ) : "Se usará al explosionar piezas y en el presupuesto."}
          </span>
        </label>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" size="xs" disabled={pending}>
          Guardar
        </Button>
        <Button
          type="button"
          size="xs"
          variant="outline"
          className="border-destructive/30 text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </form>
  );
}

function ConfigModulo({
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
        <Settings2 className="h-4 w-4 text-slate-500" />
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Construcción del módulo
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Grosor tableros (mm)
          </span>
          <input
            type="number"
            name="tableros_grosor_mm"
            min={5}
            max={50}
            defaultValue={modulo.tableros_grosor_mm ?? ""}
            placeholder={String(modulo.grosor_tablero_default_mm ?? 16)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-sm shadow-xs"
          />
          <span className="text-[10px] text-muted-foreground">
            Dejar vacío = {modulo.grosor_tablero_default_mm ?? 16} mm (referencia)
          </span>
        </label>

        <label className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Grosor trasera (mm)
          </span>
          <input
            type="number"
            name="trasera_grosor_mm"
            min={3}
            max={30}
            defaultValue={modulo.trasera_grosor_mm ?? ""}
            placeholder="10"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-sm shadow-xs"
          />
        </label>

        <label className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Hueco entre cajones (mm)
          </span>
          <input
            type="number"
            name="separacion_cajones_mm"
            min={0}
            max={20}
            defaultValue={modulo.separacion_cajones_mm ?? 2}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-sm shadow-xs"
          />
        </label>

        <label className="flex cursor-pointer items-end gap-2 rounded-md border border-input bg-background p-2 text-xs">
          <input
            type="checkbox"
            name="mostrar_puertas"
            defaultChecked={modulo.mostrar_puertas ?? true}
            className="h-4 w-4"
          />
          <span className="flex-1">Mostrar puertas en 3D</span>
        </label>
      </div>

      {/* Observaciones del módulo (van a las notas del presupuesto también) */}
      <label className="mt-3 block space-y-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Observaciones / notas del módulo
        </span>
        <textarea
          name="notas"
          rows={2}
          defaultValue={modulo.notas ?? ""}
          placeholder="Ej: balda reforzada extra, canaleta LED oculta, veta horizontal..."
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs"
        />
      </label>

      <Button type="submit" size="sm" disabled={pending} className="mt-3 w-full" variant="outline">
        Guardar construcción
      </Button>
    </form>
  );
}

function GeneradorCajones({
  modulo,
  pending,
  onGenerar,
}: {
  modulo: ModuloPro;
  pending: boolean;
  onGenerar: (
    distribucion: "iguales" | "progresiva" | "personalizada",
    n: number,
    alturasMm: number[] | null,
  ) => void;
}) {
  const [modo, setModo] = useState<"iguales" | "progresiva" | "personalizada">("iguales");
  const [n, setN] = useState(4);
  const [alturas, setAlturas] = useState<number[]>(() =>
    Array.from({ length: 4 }, () => Math.round(modulo.alto_mm / 4)),
  );

  const sumAlturas = alturas.reduce((a, b) => a + b, 0);
  const altoModulo = modulo.alto_mm;
  const desbordaPersonalizada = modo === "personalizada" && sumAlturas > altoModulo;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-blue-500" />
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Asistente cajones
        </p>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Genera cajones automáticamente respetando el alto del módulo ({altoModulo} mm).
      </p>

      <div className="mb-3 flex rounded-lg border border-border bg-muted/40 p-1 text-xs">
        {(["iguales", "progresiva", "personalizada"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setModo(m)}
            className={`flex-1 rounded-md px-2 py-1 font-semibold capitalize transition ${
              modo === m ? "bg-background shadow-sm" : "text-muted-foreground"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {(modo === "iguales" || modo === "progresiva") ? (
        <label className="space-y-1 block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Número de cajones
          </span>
          <input
            type="number"
            min={1}
            max={8}
            value={n}
            onChange={(e) => {
              const v = Math.max(1, Math.min(8, Number.parseInt(e.target.value, 10) || 1));
              setN(v);
            }}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-sm shadow-xs"
          />
          <p className="text-[10px] text-muted-foreground">
            {modo === "iguales"
              ? `≈ ${Math.floor(altoModulo / n)} mm cada uno`
              : `Cajones decrecientes (el primero más grande)`}
          </p>
        </label>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="flex-1 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Nº de cajones
              </span>
              <input
                type="number"
                min={1}
                max={8}
                value={alturas.length}
                onChange={(e) => {
                  const v = Math.max(1, Math.min(8, Number.parseInt(e.target.value, 10) || 1));
                  const cur = [...alturas];
                  while (cur.length < v) cur.push(150);
                  cur.length = v;
                  setAlturas(cur);
                }}
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 font-mono text-xs"
              />
            </label>
            <div className="flex-1 rounded-md bg-muted/40 p-2 text-center">
              <p className="text-[9px] font-bold uppercase text-muted-foreground">Suma</p>
              <p className={`font-mono text-sm font-bold ${desbordaPersonalizada ? "text-red-600" : sumAlturas === altoModulo ? "text-emerald-600" : "text-foreground"}`}>
                {sumAlturas} / {altoModulo}
              </p>
            </div>
          </div>
          <ul className="space-y-1">
            {alturas.map((a, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-12 text-xs font-bold text-muted-foreground">#{i + 1}</span>
                <input
                  type="number"
                  min={50}
                  value={a}
                  onChange={(e) => {
                    const next = [...alturas];
                    next[i] = Math.max(50, Number.parseInt(e.target.value, 10) || 0);
                    setAlturas(next);
                  }}
                  className="flex h-8 flex-1 rounded-md border border-input bg-background px-2 font-mono text-xs"
                />
                <span className="text-[10px] text-muted-foreground">mm</span>
              </li>
            ))}
          </ul>
          {desbordaPersonalizada ? (
            <p className="text-[11px] font-semibold text-red-600">
              Las alturas suman más que el alto del módulo. Reduce alguna.
            </p>
          ) : null}
        </div>
      )}

      <Button
        type="button"
        size="sm"
        disabled={pending || desbordaPersonalizada}
        className="mt-3 w-full"
        onClick={() =>
          onGenerar(
            modo,
            modo === "personalizada" ? alturas.length : n,
            modo === "personalizada" ? alturas : null,
          )
        }
      >
        <Sparkles className="h-3.5 w-3.5" />
        Generar cajones
      </Button>
      <p className="mt-2 text-[10px] text-muted-foreground">
        Sustituye los cajones existentes del módulo.
      </p>
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
  tiradores = [],
  onCreate,
  onUpdate,
  onDelete,
}: {
  modulo: ModuloPro;
  pending: boolean;
  tiradores?: { id: string; nombre: string }[];
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
                  <SubelementoEditor
                    s={s}
                    meta={meta}
                    pending={pending}
                    tiradores={tiradores}
                    onSave={(fd) => {
                      onUpdate(s.id, fd);
                      setEditingId(null);
                    }}
                    onDelete={() => {
                      if (confirm(`¿Eliminar "${s.etiqueta || meta?.label}"?`)) {
                        onDelete(s.id);
                        setEditingId(null);
                      }
                    }}
                  />
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
