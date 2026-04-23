export type EstadoPedido =
  | "pendiente"
  | "en_fabricacion"
  | "fabricado"
  | "entregado"
  | "cancelado";

export const ESTADOS_PEDIDO: { value: EstadoPedido; label: string; color: string }[] = [
  { value: "pendiente",     label: "Pendiente",       color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
  { value: "en_fabricacion",label: "En fabricación",  color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  { value: "fabricado",     label: "Fabricado",       color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  { value: "entregado",     label: "Entregado",       color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  { value: "cancelado",     label: "Cancelado",       color: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
];

export type Pedido = {
  id: string;
  empresa_id: string;
  presupuesto_id: string;
  proyecto_id: string;
  numero: string | null;
  fecha_pedido: string;
  fecha_entrega_prevista: string | null;
  importe_eur: number;
  estado: EstadoPedido;
  notas: string | null;
  created_at: string;
  updated_at: string;
};
