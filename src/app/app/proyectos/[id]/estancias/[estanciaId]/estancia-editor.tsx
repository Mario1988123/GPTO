"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { DoorOpen, DoorClosed, Trash2, Plus, Square, Hexagon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Abertura, EstanciaGeometria } from "@/lib/tipos/proyectos";

type Punto = { x: number; y: number };

type Props = {
  proyectoId: string;
  estanciaId: string;
  geometria: EstanciaGeometria | null;
  aberturas: Abertura[];
  onGuardarPoligono: (puntos: Punto[], alto_pared_mm: number) => Promise<void>;
};

export function EstanciaEditor({ geometria, aberturas, onGuardarPoligono }: Props) {
  const [modo, setModo] = useState<"rectangular" | "poligono">(
    geometria?.tipo ?? "rectangular",
  );
  const [puntos, setPuntos] = useState<Punto[]>(
    geometria?.puntos && geometria.puntos.length >= 3
      ? geometria.puntos
      : [
          { x: 0, y: 0 },
          { x: 4000, y: 0 },
          { x: 4000, y: 3000 },
          { x: 0, y: 3000 },
        ],
  );
  const [altoPared, setAltoPared] = useState(geometria?.alto_pared_mm ?? 2500);
  const [, start] = useTransition();

  const extents = useMemo(() => {
    const xs = puntos.map((p) => p.x);
    const ys = puntos.map((p) => p.y);
    const minX = Math.min(0, ...xs);
    const maxX = Math.max(1000, ...xs);
    const minY = Math.min(0, ...ys);
    const maxY = Math.max(1000, ...ys);
    return { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY };
  }, [puntos]);

  const vbW = extents.w + 400;
  const vbH = extents.h + 400;

  const guardar = () => {
    start(async () => {
      try {
        await onGuardarPoligono(puntos, altoPared);
        toast.success("Geometría guardada");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  };

  // Paredes y aberturas para preview
  const paredes = useMemo(() => {
    return puntos.map((p, i) => {
      const next = puntos[(i + 1) % puntos.length];
      const dx = next.x - p.x;
      const dy = next.y - p.y;
      return {
        idx: i,
        x1: p.x,
        y1: p.y,
        x2: next.x,
        y2: next.y,
        length: Math.sqrt(dx * dx + dy * dy),
        angle: Math.atan2(dy, dx),
      };
    });
  }, [puntos]);

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Geometría
          </p>
          <h2 className="mt-0.5 text-lg font-bold tracking-tight">Plano de la estancia</h2>
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setModo("rectangular")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition ${
              modo === "rectangular" ? "bg-background shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Square className="h-3.5 w-3.5" />
            Rectangular
          </button>
          <button
            type="button"
            onClick={() => setModo("poligono")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition ${
              modo === "poligono" ? "bg-background shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Hexagon className="h-3.5 w-3.5" />
            Polígono libre
          </button>
        </div>
      </div>

      {modo === "rectangular" ? (
        <RectangularEditor
          puntos={puntos}
          altoPared={altoPared}
          setPuntos={setPuntos}
          setAltoPared={setAltoPared}
        />
      ) : (
        <PoligonoEditor
          puntos={puntos}
          altoPared={altoPared}
          setPuntos={setPuntos}
          setAltoPared={setAltoPared}
        />
      )}

      {/* Preview plano 2D */}
      <div className="mt-5 overflow-hidden rounded-xl border border-border bg-muted/20 p-4">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Preview en planta (mm)
        </p>
        <svg
          viewBox={`${extents.minX - 200} ${extents.minY - 200} ${vbW} ${vbH}`}
          className="h-[360px] w-full"
          style={{ background: "#fafafa" }}
        >
          <defs>
            <pattern id="grid-estancia" width="500" height="500" patternUnits="userSpaceOnUse">
              <path d="M 500 0 L 0 0 0 500" fill="none" stroke="#e4e4e7" strokeWidth="3" />
            </pattern>
          </defs>
          <rect x={extents.minX - 500} y={extents.minY - 500} width={vbW + 1000} height={vbH + 1000} fill="url(#grid-estancia)" />

          {/* Polígono estancia */}
          <polygon
            points={puntos.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="#fff"
            stroke="#18181b"
            strokeWidth={45}
          />

          {/* Paredes etiquetadas con índice */}
          {paredes.map((w) => {
            const cx = (w.x1 + w.x2) / 2;
            const cy = (w.y1 + w.y2) / 2;
            return (
              <g key={w.idx}>
                <circle cx={cx} cy={cy} r={90} fill="#18181b" />
                <text
                  x={cx}
                  y={cy}
                  fontSize="120"
                  fill="#fff"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontWeight="700"
                >
                  {w.idx}
                </text>
                <text
                  x={cx}
                  y={cy + 220}
                  fontSize="100"
                  fill="#52525b"
                  textAnchor="middle"
                  fontWeight="500"
                >
                  {Math.round(w.length)} mm
                </text>
              </g>
            );
          })}

          {/* Aberturas */}
          {aberturas.map((a) => {
            const pared = paredes[a.pared_idx];
            if (!pared) return null;
            // Origen de la pared: pared.x1,y1. Vector unitario a lo largo de la pared:
            const ux = Math.cos(pared.angle);
            const uy = Math.sin(pared.angle);
            // Normal hacia interior del polígono (90° en dirección perpendicular)
            // Simplificación: usamos la normal que apunta hacia el "centro" del polígono
            const cx = puntos.reduce((a2, p) => a2 + p.x, 0) / puntos.length;
            const cy = puntos.reduce((a2, p) => a2 + p.y, 0) / puntos.length;
            const midX = (pared.x1 + pared.x2) / 2;
            const midY = (pared.y1 + pared.y2) / 2;
            const toCx = cx - midX;
            const toCy = cy - midY;
            // Perp vectors
            const n1x = -uy;
            const n1y = ux;
            const dot = n1x * toCx + n1y * toCy;
            const nx = dot >= 0 ? n1x : -n1x;
            const ny = dot >= 0 ? n1y : -n1y;

            const startX = pared.x1 + ux * a.x_en_pared_mm;
            const startY = pared.y1 + uy * a.x_en_pared_mm;
            const endX = startX + ux * a.ancho_mm;
            const endY = startY + uy * a.ancho_mm;
            const offsetIn = 100;

            if (a.tipo === "puerta") {
              return (
                <g key={a.id}>
                  {/* Vano */}
                  <line
                    x1={startX}
                    y1={startY}
                    x2={endX}
                    y2={endY}
                    stroke="#fafafa"
                    strokeWidth={50}
                  />
                  {/* Arco apertura */}
                  <path
                    d={`M ${startX} ${startY} A ${a.ancho_mm} ${a.ancho_mm} 0 0 1 ${
                      startX + nx * a.ancho_mm
                    } ${startY + ny * a.ancho_mm}`}
                    fill="none"
                    stroke="#16a34a"
                    strokeWidth={20}
                    strokeDasharray="40 30"
                  />
                  {/* Hoja */}
                  <line
                    x1={startX}
                    y1={startY}
                    x2={startX + nx * a.ancho_mm}
                    y2={startY + ny * a.ancho_mm}
                    stroke="#16a34a"
                    strokeWidth={35}
                  />
                </g>
              );
            }
            // Ventana
            return (
              <g key={a.id}>
                <line
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke="#fafafa"
                  strokeWidth={50}
                />
                <line
                  x1={startX - nx * offsetIn}
                  y1={startY - ny * offsetIn}
                  x2={endX - nx * offsetIn}
                  y2={endY - ny * offsetIn}
                  stroke="#0284c7"
                  strokeWidth={25}
                />
                <line
                  x1={startX + nx * offsetIn}
                  y1={startY + ny * offsetIn}
                  x2={endX + nx * offsetIn}
                  y2={endY + ny * offsetIn}
                  stroke="#0284c7"
                  strokeWidth={25}
                />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
        <Button type="button" onClick={guardar}>
          Guardar geometría
        </Button>
        <p className="text-xs text-muted-foreground">
          {puntos.length} paredes · altura pared {altoPared} mm
        </p>
      </div>
    </section>
  );
}

function RectangularEditor({
  puntos,
  altoPared,
  setPuntos,
  setAltoPared,
}: {
  puntos: Punto[];
  altoPared: number;
  setPuntos: (p: Punto[]) => void;
  setAltoPared: (n: number) => void;
}) {
  // Si hay 4 puntos, dedumos largo/ancho desde rect (0,0) → (largo,0) → (largo,ancho) → (0,ancho)
  const largo = Math.max(1000, Math.abs(puntos[1]?.x - puntos[0]?.x) || 4000);
  const ancho = Math.max(1000, Math.abs(puntos[2]?.y - puntos[1]?.y) || 3000);

  const applyRect = (l: number, a: number, alt: number) => {
    setPuntos([
      { x: 0, y: 0 },
      { x: l, y: 0 },
      { x: l, y: a },
      { x: 0, y: a },
    ]);
    setAltoPared(alt);
  };

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <NumInput
        label="Largo (mm)"
        value={largo}
        onChange={(v) => applyRect(v, ancho, altoPared)}
      />
      <NumInput
        label="Ancho (mm)"
        value={ancho}
        onChange={(v) => applyRect(largo, v, altoPared)}
      />
      <NumInput
        label="Alto pared (mm)"
        value={altoPared}
        onChange={(v) => setAltoPared(v)}
      />
    </div>
  );
}

function PoligonoEditor({
  puntos,
  altoPared,
  setPuntos,
  setAltoPared,
}: {
  puntos: Punto[];
  altoPared: number;
  setPuntos: (p: Punto[]) => void;
  setAltoPared: (n: number) => void;
}) {
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
        <div>
          <p className="mb-2 text-xs text-muted-foreground">
            Define cada vértice en coordenadas X/Y (mm). Orden horario o antihorario.
          </p>
          <div className="space-y-2">
            {puntos.map((p, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-2"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
                  {i}
                </span>
                <input
                  type="number"
                  value={p.x}
                  onChange={(e) => {
                    const v = Number.parseInt(e.target.value, 10) || 0;
                    const next = [...puntos];
                    next[i] = { x: v, y: p.y };
                    setPuntos(next);
                  }}
                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 font-mono text-xs"
                />
                <input
                  type="number"
                  value={p.y}
                  onChange={(e) => {
                    const v = Number.parseInt(e.target.value, 10) || 0;
                    const next = [...puntos];
                    next[i] = { x: p.x, y: v };
                    setPuntos(next);
                  }}
                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (puntos.length <= 3) return;
                    setPuntos(puntos.filter((_, j) => j !== i));
                  }}
                  disabled={puntos.length <= 3}
                  className="shrink-0 rounded-md p-1 text-destructive disabled:opacity-30"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={() => {
              const last = puntos[puntos.length - 1];
              setPuntos([...puntos, { x: last.x + 1000, y: last.y }]);
            }}
          >
            <Plus className="h-3 w-3" />
            Añadir vértice
          </Button>
        </div>
        <div className="space-y-3">
          <NumInput label="Alto pared (mm)" value={altoPared} onChange={setAltoPared} />
        </div>
      </div>
    </div>
  );
}

function NumInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="space-y-1.5">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number.parseInt(e.target.value, 10) || 0)}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-sm shadow-xs outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/15"
      />
    </label>
  );
}

export function AberturasEditor({
  aberturas,
  numParedes,
  onCrear,
  onEliminar,
}: {
  aberturas: Abertura[];
  numParedes: number;
  onCrear: (fd: FormData) => void;
  onEliminar: (id: string) => void;
}) {
  return (
    <section className="mt-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Aberturas
          </p>
          <h2 className="mt-0.5 text-lg font-bold tracking-tight">
            Puertas y ventanas · {aberturas.length}
          </h2>
        </div>
      </div>

      {aberturas.length > 0 ? (
        <ul className="mb-4 divide-y divide-border rounded-xl border border-border">
          {aberturas.map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-4 py-2.5">
              {a.tipo === "puerta" ? (
                <DoorOpen className="h-4 w-4 text-emerald-600" />
              ) : (
                <DoorClosed className="h-4 w-4 text-blue-600" />
              )}
              <div className="flex-1 text-sm">
                <p className="font-semibold">
                  {a.etiqueta || (a.tipo === "puerta" ? "Puerta" : "Ventana")}{" "}
                  <span className="text-xs text-muted-foreground">
                    · pared {a.pared_idx}
                  </span>
                </p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  offset {a.x_en_pared_mm} mm · {a.ancho_mm}×{a.alto_mm}
                  {a.tipo === "ventana" && a.antepecho_mm > 0
                    ? ` · antepecho ${a.antepecho_mm}`
                    : ""}
                </p>
              </div>
              <form action={() => onEliminar(a.id)}>
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon-xs"
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}

      <form
        action={(fd) => onCrear(fd)}
        className="grid gap-3 rounded-xl border border-dashed border-border bg-muted/20 p-4 sm:grid-cols-7"
      >
        <label className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Tipo
          </span>
          <select
            name="tipo"
            defaultValue="puerta"
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-xs"
          >
            <option value="puerta">Puerta</option>
            <option value="ventana">Ventana</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Pared
          </span>
          <select
            name="pared_idx"
            defaultValue="0"
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-xs"
          >
            {Array.from({ length: numParedes }).map((_, i) => (
              <option key={i} value={i}>
                Pared {i}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            X pared (mm)
          </span>
          <input
            name="x_en_pared_mm"
            type="number"
            min={0}
            defaultValue={500}
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 font-mono text-xs"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Ancho (mm)
          </span>
          <input
            name="ancho_mm"
            type="number"
            min={100}
            defaultValue={800}
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 font-mono text-xs"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Alto (mm)
          </span>
          <input
            name="alto_mm"
            type="number"
            min={100}
            defaultValue={2030}
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 font-mono text-xs"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Antepecho (mm)
          </span>
          <input
            name="antepecho_mm"
            type="number"
            min={0}
            defaultValue={0}
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 font-mono text-xs"
          />
        </label>
        <label className="space-y-1 sm:col-span-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Etiqueta
          </span>
          <input
            name="etiqueta"
            placeholder="opcional"
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
          />
        </label>
        <div className="sm:col-span-7">
          <Button type="submit" size="sm">
            <Plus className="h-3 w-3" />
            Añadir abertura
          </Button>
        </div>
      </form>
    </section>
  );
}
