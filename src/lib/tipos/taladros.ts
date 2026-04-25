export type TipoTaladro =
  | "union_modulo" | "balda" | "tope_balda" | "barra" | "bisagra"
  | "tirador" | "guia_cajon" | "led" | "otro";

export type CaraTaladro =
  | "frontal" | "trasera" | "lateral_izq" | "lateral_dcho" | "superior" | "inferior";

export const TIPOS_TALADRO: { value: TipoTaladro; label: string; emoji: string; color: string }[] = [
  { value: "union_modulo", label: "Unión módulo (suelo/techo)", emoji: "⚙️", color: "#ef4444" },
  { value: "balda",        label: "Balda fija",                emoji: "▬", color: "#3b82f6" },
  { value: "tope_balda",   label: "Tope balda regulable",      emoji: "•", color: "#06b6d4" },
  { value: "barra",        label: "Barra colgar",              emoji: "═", color: "#8b5cf6" },
  { value: "bisagra",      label: "Bisagra puerta",            emoji: "🔗", color: "#f59e0b" },
  { value: "tirador",      label: "Tirador",                   emoji: "→", color: "#10b981" },
  { value: "guia_cajon",   label: "Guía cajón",                emoji: "║", color: "#ec4899" },
  { value: "led",          label: "Rebaje LED",                emoji: "💡", color: "#fbbf24" },
  { value: "otro",         label: "Otro",                      emoji: "?", color: "#71717a" },
];

export const CARAS_TALADRO: { value: CaraTaladro; label: string }[] = [
  { value: "frontal",      label: "Frontal" },
  { value: "trasera",      label: "Trasera" },
  { value: "lateral_izq",  label: "Lateral izq." },
  { value: "lateral_dcho", label: "Lateral dcho." },
  { value: "superior",     label: "Superior" },
  { value: "inferior",     label: "Inferior" },
];

export type PuntoTaladro = {
  id: string;
  pieza_modulo_id: string;
  tipo: TipoTaladro;
  cara: CaraTaladro;
  x_mm: number;
  y_mm: number;
  diametro_mm: number;
  profundidad_mm: number | null;
  pasante: boolean;
  notas: string | null;
  generado_auto: boolean;
};
