export type Proveedor = {
  id: string;
  empresa_id: string;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  notas: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type CategoriaMaterial =
  | "tablero"
  | "madera_maciza"
  | "dm"
  | "melamina"
  | "contrachapado"
  | "otro";

export const CATEGORIAS_MATERIAL: { value: CategoriaMaterial; label: string }[] = [
  { value: "tablero", label: "Tablero" },
  { value: "madera_maciza", label: "Madera maciza" },
  { value: "dm", label: "DM" },
  { value: "melamina", label: "Melamina" },
  { value: "contrachapado", label: "Contrachapado" },
  { value: "otro", label: "Otro" },
];

export type Material = {
  id: string;
  empresa_id: string;
  categoria: CategoriaMaterial;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type Acabado = {
  id: string;
  empresa_id: string;
  codigo: string | null;
  nombre: string;
  color_hex: string | null;
  textura: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type ReferenciaTablero = {
  id: string;
  empresa_id: string;
  material_id: string;
  acabado_id: string;
  proveedor_id: string | null;
  grosor_mm: number;
  precio_m2: number;
  respeta_veta: boolean;
  referencia_proveedor: string | null;
  notas: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type Canto = {
  id: string;
  empresa_id: string;
  nombre: string;
  acabado_id: string | null;
  grosor_mm: number | null;
  proveedor_id: string | null;
  precio_ml: number;
  referencia_proveedor: string | null;
  notas: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type TipoHerraje =
  | "bisagra"
  | "tirador"
  | "guia"
  | "cierre"
  | "patas"
  | "barra"
  | "otro";

export const TIPOS_HERRAJE: { value: TipoHerraje; label: string }[] = [
  { value: "bisagra", label: "Bisagra" },
  { value: "tirador", label: "Tirador" },
  { value: "guia", label: "Guía" },
  { value: "cierre", label: "Cierre" },
  { value: "patas", label: "Patas" },
  { value: "barra", label: "Barra" },
  { value: "otro", label: "Otro" },
];

export type Herraje = {
  id: string;
  empresa_id: string;
  tipo: TipoHerraje;
  nombre: string;
  referencia_proveedor: string | null;
  proveedor_id: string | null;
  precio_unidad: number;
  stock_disponible: number;
  notas: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

/** Valor especial para Selects con "ninguno" (regla proyecto: nunca "") */
export const NINGUNA = "__ninguna__";
