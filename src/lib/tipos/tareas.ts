export type EstadoTarea = "pendiente" | "en_curso" | "completada" | "bloqueada" | "cancelada";

export const ESTADOS_TAREA: { value: EstadoTarea; label: string; color: string }[] = [
  { value: "pendiente", label: "Pendiente", color: "bg-slate-100 text-slate-700" },
  { value: "en_curso", label: "En curso", color: "bg-blue-100 text-blue-700" },
  { value: "completada", label: "Completada", color: "bg-emerald-100 text-emerald-700" },
  { value: "bloqueada", label: "Bloqueada", color: "bg-amber-100 text-amber-700" },
  { value: "cancelada", label: "Cancelada", color: "bg-red-100 text-red-700" },
];

export type EspecialidadTarea =
  | "cocina"
  | "muebles"
  | "puertas"
  | "ventanas"
  | "parquet"
  | "cualquiera";

export const ESPECIALIDADES: { value: EspecialidadTarea; label: string; color: string; emoji: string }[] = [
  { value: "cualquiera", label: "Cualquiera", color: "bg-slate-500", emoji: "🔧" },
  { value: "cocina", label: "Cocina", color: "bg-orange-500", emoji: "🍳" },
  { value: "muebles", label: "Muebles/Armarios", color: "bg-blue-500", emoji: "🪑" },
  { value: "puertas", label: "Puertas", color: "bg-amber-500", emoji: "🚪" },
  { value: "ventanas", label: "Ventanas", color: "bg-cyan-500", emoji: "🪟" },
  { value: "parquet", label: "Parquet", color: "bg-emerald-500", emoji: "🪵" },
];

export const ESPECIALIDAD_COLOR: Record<EspecialidadTarea, string> = {
  cualquiera: "#64748b",
  cocina: "#f97316",
  muebles: "#3b82f6",
  puertas: "#f59e0b",
  ventanas: "#06b6d4",
  parquet: "#10b981",
};

export type Tarea = {
  id: string;
  empresa_id: string;
  proyecto_id: string;
  estancia_id: string | null;
  armario_id: string | null;
  titulo: string;
  descripcion: string | null;
  especialidad: EspecialidadTarea | null;
  asignado_a: string | null;
  fecha_inicio_plan: string; // ISO date
  fecha_fin_plan: string; // ISO date
  fecha_inicio_real: string | null;
  fecha_fin_real: string | null;
  estado: EstadoTarea;
  orden: number;
  color_hex: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
};

export type TareaDependencia = {
  id: string;
  empresa_id: string;
  tarea_id: string;
  depende_de_tarea_id: string;
  tipo: "finish_to_start" | "start_to_start" | "finish_to_finish" | "start_to_finish";
  lag_dias: number;
  created_at: string;
};

export type TipoIncidencia =
  | "retraso"
  | "material_pendiente"
  | "incidencia_montaje"
  | "revision_cliente"
  | "otro";

export const TIPOS_INCIDENCIA: { value: TipoIncidencia; label: string; color: string }[] = [
  { value: "retraso", label: "Retraso", color: "bg-red-100 text-red-700" },
  { value: "material_pendiente", label: "Material pendiente", color: "bg-amber-100 text-amber-700" },
  { value: "incidencia_montaje", label: "Incidencia montaje", color: "bg-orange-100 text-orange-700" },
  { value: "revision_cliente", label: "Revisión cliente", color: "bg-blue-100 text-blue-700" },
  { value: "otro", label: "Otro", color: "bg-slate-100 text-slate-700" },
];

export type Incidencia = {
  id: string;
  empresa_id: string;
  proyecto_id: string;
  tarea_id: string | null;
  tipo: TipoIncidencia;
  titulo: string;
  descripcion: string | null;
  dias_impacto: number;
  resuelta: boolean;
  resuelta_at: string | null;
  avisado_cliente: boolean;
  avisado_cliente_at: string | null;
  creada_por: string | null;
  created_at: string;
  updated_at: string;
};

export type RolUsuario = "admin" | "operario" | "montador" | "interiorista" | "cliente_final";

/** Diferencia en días entre dos fechas ISO (yyyy-mm-dd). */
export function diasEntre(desde: string, hasta: string): number {
  const a = new Date(desde + "T00:00:00Z").getTime();
  const b = new Date(hasta + "T00:00:00Z").getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

/** Suma días a una fecha ISO y devuelve otra fecha ISO. */
export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(fecha + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Diferencia en días entre hoy y una fecha, positivo si es en el futuro. */
export function diasHastaHoy(fechaISO: string): number {
  const hoy = new Date().toISOString().slice(0, 10);
  return diasEntre(hoy, fechaISO);
}
