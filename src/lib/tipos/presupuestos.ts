export type EstadoPresupuesto =
  | "borrador"
  | "enviado"
  | "aceptado"
  | "rechazado"
  | "caducado";

export const ESTADOS_PRESUPUESTO: { value: EstadoPresupuesto; label: string; color: string }[] = [
  { value: "borrador",   label: "Borrador",   color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
  { value: "enviado",    label: "Enviado",    color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  { value: "aceptado",   label: "Aceptado",   color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  { value: "rechazado",  label: "Rechazado",  color: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
  { value: "caducado",   label: "Caducado",   color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
];

export type ModoPresentacion = "detallado_modulo" | "precio_cerrado";
export type CategoriaLinea = "tableros" | "cantos" | "herrajes" | "mano_obra" | "otro";
export type UnidadLinea = "ud" | "m2" | "ml" | "h" | "global";

export const CATEGORIAS_LINEA: { value: CategoriaLinea; label: string }[] = [
  { value: "tableros",  label: "Tableros" },
  { value: "cantos",    label: "Cantos" },
  { value: "herrajes",  label: "Herrajes" },
  { value: "mano_obra", label: "Mano de obra" },
  { value: "otro",      label: "Otro" },
];

export type Presupuesto = {
  id: string;
  empresa_id: string;
  proyecto_id: string;
  numero: string | null;
  fecha_emision: string | null;
  validez_dias: number;
  modo_presentacion: ModoPresentacion;
  descuento_global_pct: number;
  subtotal_eur: number;
  descuento_eur: number;
  base_imponible_eur: number;
  iva_pct: number;
  iva_eur: number;
  total_eur: number;
  estado: EstadoPresupuesto;
  snapshot: Record<string, unknown> | null;
  pdf_url: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
};

export type PresupuestoLinea = {
  id: string;
  presupuesto_id: string;
  orden: number;
  categoria: CategoriaLinea;
  descripcion: string;
  cantidad: number;
  unidad: UnidadLinea;
  precio_unitario_eur: number;
  descuento_linea_pct: number;
  total_linea_eur: number;
  created_at: string;
  updated_at: string;
};

export function formatEur(n: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(n);
}

/** Longitud de canto en mm según la convención lados_con_canto. */
export function longitudCantoMm(
  lados_con_canto: string,
  largo_mm: number,
  ancho_mm: number,
): number {
  switch (lados_con_canto) {
    case "1":
      return largo_mm; // el lado largo
    case "2_opuestos":
      return 2 * largo_mm;
    case "2_contiguos":
      return largo_mm + ancho_mm;
    case "3":
      return 2 * largo_mm + ancho_mm;
    case "4":
      return 2 * (largo_mm + ancho_mm);
    case "ninguno":
    default:
      return 0;
  }
}
