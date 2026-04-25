export type EstadoFactura = "borrador" | "emitida" | "enviada" | "pagada" | "rectificada" | "anulada";
export type TipoFactura = "completa" | "simplificada" | "rectificativa";
export type FormaPago = "transferencia" | "tarjeta" | "efectivo" | "domiciliacion" | "bizum" | "otro";

export const ESTADOS_FACTURA: { value: EstadoFactura; label: string; color: string }[] = [
  { value: "borrador",     label: "Borrador",     color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
  { value: "emitida",      label: "Emitida",      color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  { value: "enviada",      label: "Enviada",      color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  { value: "pagada",       label: "Pagada",       color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  { value: "rectificada",  label: "Rectificada",  color: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300" },
  { value: "anulada",      label: "Anulada",      color: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
];

export const FORMAS_PAGO: { value: FormaPago; label: string }[] = [
  { value: "transferencia",  label: "Transferencia bancaria" },
  { value: "tarjeta",        label: "Tarjeta" },
  { value: "efectivo",       label: "Efectivo" },
  { value: "domiciliacion",  label: "Domiciliación" },
  { value: "bizum",          label: "Bizum" },
  { value: "otro",           label: "Otro" },
];

export const TIPOS_IVA = [0, 4, 10, 21] as const;

export type DatosFiscales = {
  razon_social: string;
  nif: string;
  domicilio_fiscal: string;
  email?: string;
  telefono?: string;
  iban?: string;
};

export type Factura = {
  id: string;
  empresa_id: string;
  serie_id: string;
  numero: number | null;
  numero_completo: string;
  cliente_id: string;
  proyecto_id: string | null;
  presupuesto_id: string | null;
  tipo: TipoFactura;
  factura_rectificada_id: string | null;
  motivo_rectificacion: string | null;
  fecha_emision: string;
  fecha_operacion: string | null;
  emisor: DatosFiscales;
  receptor: { razon_social: string; nif: string | null; domicilio: string; es_empresa: boolean };
  base_imponible: number;
  cuota_iva: number;
  retencion_irpf_pct: number;
  cuota_irpf: number;
  recargo_eq_pct: number;
  cuota_recargo_eq: number;
  total: number;
  forma_pago: FormaPago;
  vencimiento_dias: number;
  fecha_vencimiento: string | null;
  iban: string | null;
  pagada: boolean;
  fecha_pago: string | null;
  estado: EstadoFactura;
  notas: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
};

export type FacturaLinea = {
  id: string;
  factura_id: string;
  orden: number;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  descuento_pct: number;
  iva_pct: number;
  base_linea: number;
  cuota_iva_linea: number;
  total_linea: number;
};

export type SerieFacturacion = {
  id: string;
  empresa_id: string;
  codigo: string;
  nombre: string;
  prefijo: string;
  siguiente_num: number;
  es_rectificativa: boolean;
  activo: boolean;
};

export function calcularLinea(l: Pick<FacturaLinea, "cantidad" | "precio_unitario" | "descuento_pct" | "iva_pct">) {
  const bruto = l.cantidad * l.precio_unitario;
  const base = bruto - (bruto * l.descuento_pct) / 100;
  const cuota_iva = (base * l.iva_pct) / 100;
  return {
    base_linea: round2(base),
    cuota_iva_linea: round2(cuota_iva),
    total_linea: round2(base + cuota_iva),
  };
}

export function calcularTotales(
  lineas: Pick<FacturaLinea, "base_linea" | "cuota_iva_linea">[],
  retencion_irpf_pct: number,
  recargo_eq_pct: number,
) {
  const base_imponible = round2(lineas.reduce((a, l) => a + l.base_linea, 0));
  const cuota_iva = round2(lineas.reduce((a, l) => a + l.cuota_iva_linea, 0));
  const cuota_irpf = round2((base_imponible * retencion_irpf_pct) / 100);
  const cuota_recargo_eq = round2((base_imponible * recargo_eq_pct) / 100);
  const total = round2(base_imponible + cuota_iva + cuota_recargo_eq - cuota_irpf);
  return { base_imponible, cuota_iva, cuota_irpf, cuota_recargo_eq, total };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function fmtEur(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
}
