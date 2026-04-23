export type TipoEstancia =
  | "vestidor"
  | "armario_pasillo"
  | "cocina"
  | "comedor"
  | "dormitorio"
  | "bano"
  | "entrada"
  | "salon"
  | "despacho"
  | "otro";

export const TIPOS_ESTANCIA: { value: TipoEstancia; label: string; emoji: string }[] = [
  { value: "vestidor",        label: "Vestidor",         emoji: "👔" },
  { value: "armario_pasillo", label: "Armario pasillo",  emoji: "🚪" },
  { value: "cocina",          label: "Cocina",           emoji: "🍳" },
  { value: "comedor",         label: "Comedor",          emoji: "🍽️" },
  { value: "dormitorio",      label: "Dormitorio",       emoji: "🛏️" },
  { value: "bano",            label: "Baño",             emoji: "🛁" },
  { value: "entrada",         label: "Entrada",          emoji: "🏠" },
  { value: "salon",           label: "Salón",            emoji: "🛋️" },
  { value: "despacho",        label: "Despacho",         emoji: "💼" },
  { value: "otro",            label: "Otro",             emoji: "📦" },
];

export type Estancia = {
  id: string;
  empresa_id: string;
  proyecto_id: string;
  nombre: string;
  tipo: TipoEstancia;
  orden: number;
  largo_mm: number | null;
  ancho_mm: number | null;
  alto_mm: number | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
};

export type TipoInstalacion = "empotrado" | "suelto";

export const TIPOS_INSTALACION: { value: TipoInstalacion; label: string; descripcion: string }[] = [
  { value: "suelto", label: "Suelto", descripcion: "Mueble independiente, sin margen con paredes." },
  { value: "empotrado", label: "Empotrado", descripcion: "Se instala en hueco existente; necesita margen para tapetas." },
];
