export type TableroCorte = {
  id: string;
  empresa_id: string;
  proyecto_id: string;
  referencia_tablero_id: string;
  numero: number;
  ancho_mm: number;
  alto_mm: number;
  area_ocupada_mm2: number;
  created_at: string;
  updated_at: string;
};

export type PiezaEnTablero = {
  id: string;
  tablero_corte_id: string;
  pieza_modulo_id: string;
  ocurrencia: number;
  x_mm: number;
  y_mm: number;
  largo_mm: number;
  ancho_mm: number;
  rotada: boolean;
};

export type EstadoRecorte = "pendiente" | "conservado" | "descartado" | "usado";

export const ESTADOS_RECORTE: { value: EstadoRecorte; label: string; color: string }[] = [
  { value: "pendiente", label: "Pendiente", color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  { value: "conservado", label: "Conservado", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  { value: "descartado", label: "Descartado", color: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
  { value: "usado", label: "Usado", color: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300" },
];

export type Recorte = {
  id: string;
  empresa_id: string;
  referencia_tablero_id: string;
  origen_tablero_id: string | null;
  largo_mm: number;
  ancho_mm: number;
  estado: EstadoRecorte;
  notas: string | null;
  created_at: string;
  updated_at: string;
};
