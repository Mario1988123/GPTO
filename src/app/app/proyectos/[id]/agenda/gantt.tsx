"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  ESPECIALIDAD_COLOR,
  diasEntre,
  sumarDias,
  type EspecialidadTarea,
  type EstadoTarea,
  type Tarea,
  type TareaDependencia,
} from "@/lib/tipos/tareas";

type Usuario = { id: string; nombre: string; rol: string; especialidades: string[] };

type Props = {
  proyectoId: string;
  tareas: Tarea[];
  dependencias: TareaDependencia[];
  usuarios: Usuario[];
  readonly?: boolean;
  onMoverTarea: (tareaId: string, dias: number) => Promise<void>;
};

const DIA_PX = 30; // ancho de un día en px
const FILA_PX = 44; // alto de una fila en px
const HEADER_PX = 60;
const LABEL_WIDTH = 280;

export function Gantt({
  proyectoId,
  tareas,
  dependencias,
  usuarios,
  readonly = false,
  onMoverTarea,
}: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffsetDays, setDragOffsetDays] = useState(0);
  const [, start] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  const { fechaMin, fechaMax, dias } = useMemo(() => {
    if (tareas.length === 0) {
      const hoy = new Date().toISOString().slice(0, 10);
      return { fechaMin: hoy, fechaMax: sumarDias(hoy, 30), dias: 30 };
    }
    const inicios = tareas.map((t) => t.fecha_inicio_plan);
    const finales = tareas.map((t) => t.fecha_fin_plan);
    const minFecha = inicios.sort()[0];
    const maxFecha = finales.sort().reverse()[0];
    const hoy = new Date().toISOString().slice(0, 10);
    // Añadimos 5 días antes y 7 días después para respirar, y aseguramos que "hoy" esté dentro.
    const inicio = sumarDias(minFecha < hoy ? minFecha : hoy, -5);
    const fin = sumarDias(maxFecha > hoy ? maxFecha : hoy, 7);
    return { fechaMin: inicio, fechaMax: fin, dias: diasEntre(inicio, fin) };
  }, [tareas]);

  const totalWidth = LABEL_WIDTH + dias * DIA_PX;
  const totalHeight = HEADER_PX + tareas.length * FILA_PX;

  const hoyISO = new Date().toISOString().slice(0, 10);
  const hoyOffset = LABEL_WIDTH + diasEntre(fechaMin, hoyISO) * DIA_PX;

  // Generar etiquetas de meses
  const meses = useMemo(() => {
    const result: { label: string; xStart: number; width: number }[] = [];
    let currentMonth = "";
    let monthStart = 0;
    for (let i = 0; i <= dias; i++) {
      const fecha = sumarDias(fechaMin, i);
      const mesKey = fecha.slice(0, 7); // yyyy-mm
      if (mesKey !== currentMonth) {
        if (currentMonth !== "") {
          result.push({
            label: nombreMes(currentMonth),
            xStart: LABEL_WIDTH + monthStart * DIA_PX,
            width: (i - monthStart) * DIA_PX,
          });
        }
        currentMonth = mesKey;
        monthStart = i;
      }
    }
    if (currentMonth !== "") {
      result.push({
        label: nombreMes(currentMonth),
        xStart: LABEL_WIDTH + monthStart * DIA_PX,
        width: (dias - monthStart) * DIA_PX,
      });
    }
    return result;
  }, [fechaMin, dias]);

  const tareaById = useMemo(() => new Map(tareas.map((t) => [t.id, t])), [tareas]);

  const barras = useMemo(() => {
    return tareas.map((t, idx) => {
      const x = LABEL_WIDTH + diasEntre(fechaMin, t.fecha_inicio_plan) * DIA_PX;
      const w = Math.max(DIA_PX, (diasEntre(t.fecha_inicio_plan, t.fecha_fin_plan) + 1) * DIA_PX);
      const y = HEADER_PX + idx * FILA_PX + 6;
      const color = t.color_hex ?? ESPECIALIDAD_COLOR[(t.especialidad ?? "cualquiera") as EspecialidadTarea];
      return { tarea: t, x, y, w, h: FILA_PX - 12, color, idx };
    });
  }, [tareas, fechaMin]);

  const flechas = useMemo(() => {
    const result: { id: string; path: string }[] = [];
    for (const dep of dependencias) {
      const t1 = barras.find((b) => b.tarea.id === dep.depende_de_tarea_id);
      const t2 = barras.find((b) => b.tarea.id === dep.tarea_id);
      if (!t1 || !t2) continue;
      const x1 = t1.x + t1.w;
      const y1 = t1.y + t1.h / 2;
      const x2 = t2.x;
      const y2 = t2.y + t2.h / 2;
      const midX = (x1 + x2) / 2;
      result.push({
        id: dep.id,
        path: `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`,
      });
    }
    return result;
  }, [dependencias, barras]);

  function handlePointerDown(tareaId: string, e: React.PointerEvent) {
    if (readonly) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDraggingId(tareaId);
    setDragOffsetDays(0);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!draggingId || readonly) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Calcular días desde el inicio del drag (aproximado por deltaX del ratón)
    const deltaX = e.movementX;
    const deltaDays = Math.round(deltaX / DIA_PX);
    if (deltaDays !== 0) {
      setDragOffsetDays((d) => d + deltaDays);
    }
  }

  function handlePointerUp() {
    if (!draggingId || readonly) return;
    const id = draggingId;
    const dias = dragOffsetDays;
    setDraggingId(null);
    setDragOffsetDays(0);
    if (dias === 0) return;
    start(async () => {
      try {
        await onMoverTarea(id, dias);
        toast.success(`Tarea movida ${dias > 0 ? "+" : ""}${dias} día${Math.abs(dias) === 1 ? "" : "s"}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error moviendo tarea");
      }
    });
  }

  if (tareas.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
        Sin tareas aún. Añade la primera abajo para ver el Gantt.
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-xl border border-slate-200 bg-white">
      <div
        ref={containerRef}
        className="relative select-none"
        style={{ width: totalWidth, height: totalHeight, minWidth: "100%" }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Cabecera: meses + días */}
        <div className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200" style={{ height: HEADER_PX }}>
          <div className="absolute left-0 top-0 bottom-0 z-30 bg-slate-50 border-r border-slate-200" style={{ width: LABEL_WIDTH }}>
            <div className="flex h-full items-center px-4 text-xs font-bold uppercase tracking-wider text-slate-600">
              Tareas
            </div>
          </div>
          {/* Meses */}
          {meses.map((m, i) => (
            <div
              key={i}
              className="absolute top-0 h-7 border-r border-slate-200 bg-gradient-to-b from-slate-100 to-slate-50 text-xs font-bold text-slate-700"
              style={{ left: m.xStart, width: m.width }}
            >
              <span className="px-2 py-1 inline-block truncate">{m.label}</span>
            </div>
          ))}
          {/* Días */}
          {Array.from({ length: dias + 1 }).map((_, i) => {
            const fecha = sumarDias(fechaMin, i);
            const x = LABEL_WIDTH + i * DIA_PX;
            const dia = new Date(fecha + "T00:00:00Z");
            const esFinSemana = dia.getUTCDay() === 0 || dia.getUTCDay() === 6;
            return (
              <div
                key={i}
                className={`absolute top-7 flex h-[${HEADER_PX - 28}px] items-center justify-center border-r text-[10px] font-medium ${
                  esFinSemana ? "bg-slate-100 text-slate-400" : "border-slate-100 text-slate-500"
                }`}
                style={{ left: x, width: DIA_PX, height: HEADER_PX - 28 }}
              >
                {dia.getUTCDate()}
              </div>
            );
          })}
        </div>

        {/* Columna fija izquierda: labels */}
        <div className="absolute left-0 top-[60px] z-10 bg-white border-r border-slate-200" style={{ width: LABEL_WIDTH }}>
          {tareas.map((t, idx) => (
            <Link
              key={t.id}
              href={`/app/proyectos/${proyectoId}/agenda?tarea=${t.id}`}
              className="flex items-center gap-2 border-b border-slate-100 px-4 hover:bg-slate-50"
              style={{ height: FILA_PX }}
            >
              <div
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: t.color_hex ?? ESPECIALIDAD_COLOR[(t.especialidad ?? "cualquiera") as EspecialidadTarea] }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{t.titulo}</p>
                <p className="truncate text-[10px] text-slate-500">
                  {t.especialidad ?? "Cualquiera"}
                  {t.asignado_a
                    ? ` · ${usuarios.find((u) => u.id === t.asignado_a)?.nombre ?? "?"}`
                    : ""}
                </p>
              </div>
              {t.estado === "completada" ? (
                <span className="text-[10px] text-emerald-600 font-bold">✓</span>
              ) : null}
            </Link>
          ))}
        </div>

        {/* Filas alternas del grid */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={totalWidth}
          height={totalHeight}
        >
          {tareas.map((_, idx) => (
            <rect
              key={idx}
              x={LABEL_WIDTH}
              y={HEADER_PX + idx * FILA_PX}
              width={totalWidth - LABEL_WIDTH}
              height={FILA_PX}
              fill={idx % 2 === 0 ? "white" : "#f8fafc"}
            />
          ))}
          {/* Líneas verticales diarias */}
          {Array.from({ length: dias + 1 }).map((_, i) => {
            const x = LABEL_WIDTH + i * DIA_PX;
            const fecha = sumarDias(fechaMin, i);
            const dia = new Date(fecha + "T00:00:00Z").getUTCDay();
            const esFinSemana = dia === 0 || dia === 6;
            return (
              <line
                key={i}
                x1={x}
                y1={HEADER_PX}
                x2={x}
                y2={totalHeight}
                stroke={esFinSemana ? "#e2e8f0" : "#f1f5f9"}
                strokeWidth={esFinSemana ? 1.5 : 1}
              />
            );
          })}
          {/* Marcador HOY */}
          <line
            x1={hoyOffset}
            y1={HEADER_PX}
            x2={hoyOffset}
            y2={totalHeight}
            stroke="#ef4444"
            strokeWidth={2}
            strokeDasharray="5 3"
          />
          <text x={hoyOffset + 4} y={HEADER_PX + 12} fontSize="10" fill="#ef4444" fontWeight="700">
            HOY
          </text>

          {/* Flechas de dependencias */}
          {flechas.map((f) => (
            <g key={f.id}>
              <path d={f.path} fill="none" stroke="#64748b" strokeWidth={1.5} markerEnd="url(#arrow)" />
            </g>
          ))}

          <defs>
            <marker
              id="arrow"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="4"
              orient="auto"
            >
              <path d="M 0 0 L 8 4 L 0 8 z" fill="#64748b" />
            </marker>
          </defs>
        </svg>

        {/* Barras de tareas */}
        {barras.map((b) => {
          const isDragging = draggingId === b.tarea.id;
          const offsetX = isDragging ? dragOffsetDays * DIA_PX : 0;
          const estadoOverlay =
            b.tarea.estado === "completada"
              ? "opacity-80"
              : b.tarea.estado === "cancelada"
                ? "opacity-40 line-through"
                : b.tarea.estado === "bloqueada"
                  ? "ring-2 ring-amber-500 ring-offset-1"
                  : "";
          return (
            <button
              key={b.tarea.id}
              type="button"
              onPointerDown={(e) => handlePointerDown(b.tarea.id, e)}
              className={`group absolute flex items-center gap-2 rounded-lg px-2 text-xs font-semibold text-white shadow-md transition-all hover:shadow-xl ${estadoOverlay} ${
                readonly ? "cursor-default" : "cursor-grab active:cursor-grabbing"
              }`}
              style={{
                left: b.x + offsetX,
                top: b.y,
                width: b.w,
                height: b.h,
                background: b.color,
                textShadow: "0 1px 2px rgba(0,0,0,0.25)",
              }}
              title={`${b.tarea.titulo} · ${b.tarea.fecha_inicio_plan} → ${b.tarea.fecha_fin_plan}`}
            >
              <span className="truncate">{b.tarea.titulo}</span>
              {b.tarea.estado === "completada" ? <span className="ml-auto">✓</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function nombreMes(yyyyMm: string): string {
  const MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];
  const [y, m] = yyyyMm.split("-");
  return `${MESES[Number(m) - 1]} ${y}`;
}

// Evitar warning de imports no usados cuando builds strict
void ESPECIALIDAD_COLOR;
void diasEntre;
void sumarDias;
// Compatibility estados enum (si no se usa en este archivo TS pura tipografía)
void (null as unknown as EstadoTarea);
