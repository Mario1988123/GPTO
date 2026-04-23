export type EstadoPieza = "pendiente" | "cortada" | "producida" | "entregada";

export const ESTADOS_PIEZA: { value: EstadoPieza; label: string; color: string }[] = [
  { value: "pendiente", label: "Pendiente", color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
  { value: "cortada", label: "Cortada", color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  { value: "producida", label: "Producida", color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  { value: "entregada", label: "Entregada", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
];

export type PiezaModulo = {
  id: string;
  modulo_armario_id: string;
  tipo_modulo_pieza_id: string | null;
  nombre: string;
  orden: number;
  cantidad: number;
  largo_mm: number;
  ancho_mm: number;
  grosor_mm: number;
  referencia_tablero_id: string | null;
  canto_id: string | null;
  lados_con_canto: string;
  respeta_veta: boolean;
  qr_code: string;
  estado: EstadoPieza;
  created_at: string;
  updated_at: string;
};
