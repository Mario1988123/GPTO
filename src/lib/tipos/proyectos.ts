export type EstadoProyecto =
  | "borrador"
  | "presupuestado"
  | "confirmado"
  | "en_fabricacion"
  | "entregado"
  | "cancelado";

export const ESTADOS_PROYECTO: { value: EstadoProyecto; label: string; color: string }[] = [
  { value: "borrador", label: "Borrador", color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
  { value: "presupuestado", label: "Presupuestado", color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  { value: "confirmado", label: "Confirmado", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  { value: "en_fabricacion", label: "En fabricación", color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  { value: "entregado", label: "Entregado", color: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300" },
  { value: "cancelado", label: "Cancelado", color: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
];

export type Proyecto = {
  id: string;
  empresa_id: string;
  cliente_id: string;
  nombre: string;
  estado: EstadoProyecto;
  notas: string | null;
  created_at: string;
  updated_at: string;
};

export type Armario = {
  id: string;
  proyecto_id: string;
  nombre: string;
  ancho_total_mm: number;
  alto_total_mm: number;
  fondo_mm: number;
  orden: number;
  notas: string | null;
  created_at: string;
  updated_at: string;
};

export type ModuloArmario = {
  id: string;
  armario_id: string;
  tipo_modulo_id: string;
  nombre_override: string | null;
  orden: number;
  ancho_mm: number;
  alto_mm: number;
  fondo_mm: number;
  referencia_tablero_id: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
};
