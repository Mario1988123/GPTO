export type FuenteDim = "ancho" | "alto" | "fondo" | "fijo";

export const FUENTES_DIM: { value: FuenteDim; label: string }[] = [
  { value: "ancho", label: "ancho del módulo" },
  { value: "alto", label: "alto del módulo" },
  { value: "fondo", label: "fondo del módulo" },
  { value: "fijo", label: "valor fijo" },
];

export type LadosCanto =
  | "ninguno"
  | "1"
  | "2_opuestos"
  | "2_contiguos"
  | "3"
  | "4";

export const LADOS_CANTO: { value: LadosCanto; label: string }[] = [
  { value: "ninguno", label: "Sin canto" },
  { value: "1", label: "1 lado" },
  { value: "2_opuestos", label: "2 lados opuestos" },
  { value: "2_contiguos", label: "2 lados contiguos" },
  { value: "3", label: "3 lados" },
  { value: "4", label: "4 lados" },
];

export type CategoriaModulo =
  | "cajonera"
  | "colgador_corto"
  | "colgador_largo"
  | "zapatero"
  | "estanteria"
  | "baldas"
  | "espejo"
  | "complemento"
  | "puerta"
  | "otro";

export const CATEGORIAS_MODULO: { value: CategoriaModulo; label: string; emoji: string }[] = [
  { value: "cajonera",       label: "Cajonera",             emoji: "🗄️" },
  { value: "colgador_corto", label: "Colgador corto",       emoji: "👕" },
  { value: "colgador_largo", label: "Colgador largo",       emoji: "🧥" },
  { value: "zapatero",       label: "Zapatero",             emoji: "👟" },
  { value: "estanteria",     label: "Estantería / Baldas",  emoji: "📚" },
  { value: "baldas",         label: "Baldas extra",         emoji: "📏" },
  { value: "espejo",         label: "Espejo",               emoji: "🪞" },
  { value: "complemento",    label: "Complemento",          emoji: "🧺" },
  { value: "puerta",         label: "Puerta",               emoji: "🚪" },
  { value: "otro",           label: "Otro",                 emoji: "📦" },
];

export type TipoModulo = {
  id: string;
  empresa_id: string;
  nombre: string;
  descripcion: string | null;
  ancho_default_mm: number;
  alto_default_mm: number;
  fondo_default_mm: number;
  referencia_tablero_default_id: string | null;
  horas_fabricacion_default: number;
  categoria: CategoriaModulo;
  es_estandar: boolean;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type TipoModuloPieza = {
  id: string;
  tipo_modulo_id: string;
  nombre: string;
  orden: number;
  cantidad: number;
  fuente_largo: FuenteDim;
  ajuste_largo_mm: number;
  ajuste_largo_grosores: number;
  valor_largo_fijo_mm: number | null;
  fuente_ancho: FuenteDim;
  ajuste_ancho_mm: number;
  ajuste_ancho_grosores: number;
  valor_ancho_fijo_mm: number | null;
  referencia_tablero_id: string | null;
  canto_id: string | null;
  lados_con_canto: LadosCanto;
  respeta_veta_override: boolean | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
};

export type TipoModuloHerraje = {
  id: string;
  tipo_modulo_id: string;
  herraje_id: string;
  cantidad: number;
  notas: string | null;
  created_at: string;
};

/**
 * Calcula una dimensión aplicando la fórmula estructurada.
 * Devuelve mm.
 */
export function calcularDimension(params: {
  fuente: FuenteDim;
  ajuste_mm: number;
  ajuste_grosores: number;
  valor_fijo_mm: number | null;
  modulo: { ancho_mm: number; alto_mm: number; fondo_mm: number };
  grosor_tablero_mm: number;
}): number {
  const base =
    params.fuente === "fijo"
      ? params.valor_fijo_mm ?? 0
      : params.fuente === "ancho"
        ? params.modulo.ancho_mm
        : params.fuente === "alto"
          ? params.modulo.alto_mm
          : params.modulo.fondo_mm;
  return base + params.ajuste_mm + params.ajuste_grosores * params.grosor_tablero_mm;
}

/**
 * Presets comunes para facilitar la creación de piezas.
 * El usuario puede ajustar después cualquier campo manualmente.
 */
export type PresetPieza = {
  key: string;
  label: string;
  descripcion: string;
  defaults: Partial<TipoModuloPieza>;
};

export const PRESETS_PIEZA: PresetPieza[] = [
  {
    key: "frontal",
    label: "Frontal / Puerta",
    descripcion: "Ancho del módulo menos 2 grosores. Alto = alto del módulo.",
    defaults: {
      nombre: "Frontal",
      cantidad: 1,
      fuente_largo: "ancho",
      ajuste_largo_mm: 0,
      ajuste_largo_grosores: -2,
      fuente_ancho: "alto",
      ajuste_ancho_mm: 0,
      ajuste_ancho_grosores: 0,
      lados_con_canto: "4",
    },
  },
  {
    key: "lateral",
    label: "Lateral",
    descripcion: "Alto del módulo × fondo del módulo.",
    defaults: {
      nombre: "Lateral",
      cantidad: 2,
      fuente_largo: "alto",
      ajuste_largo_mm: 0,
      ajuste_largo_grosores: 0,
      fuente_ancho: "fondo",
      ajuste_ancho_mm: 0,
      ajuste_ancho_grosores: 0,
      lados_con_canto: "1",
    },
  },
  {
    key: "balda",
    label: "Balda / Estante",
    descripcion: "Ancho menos 2 grosores × fondo menos 10 mm (para trasera).",
    defaults: {
      nombre: "Balda",
      cantidad: 1,
      fuente_largo: "ancho",
      ajuste_largo_mm: 0,
      ajuste_largo_grosores: -2,
      fuente_ancho: "fondo",
      ajuste_ancho_mm: -10,
      ajuste_ancho_grosores: 0,
      lados_con_canto: "1",
    },
  },
  {
    key: "suelo_techo_entre",
    label: "Suelo / Techo (entre laterales)",
    descripcion: "Ancho menos 2 grosores × fondo.",
    defaults: {
      nombre: "Suelo",
      cantidad: 1,
      fuente_largo: "ancho",
      ajuste_largo_mm: 0,
      ajuste_largo_grosores: -2,
      fuente_ancho: "fondo",
      ajuste_ancho_mm: 0,
      ajuste_ancho_grosores: 0,
      lados_con_canto: "1",
    },
  },
  {
    key: "suelo_techo_fuera",
    label: "Suelo / Techo (sobre laterales)",
    descripcion: "Ancho completo × fondo.",
    defaults: {
      nombre: "Techo",
      cantidad: 1,
      fuente_largo: "ancho",
      ajuste_largo_mm: 0,
      ajuste_largo_grosores: 0,
      fuente_ancho: "fondo",
      ajuste_ancho_mm: 0,
      ajuste_ancho_grosores: 0,
      lados_con_canto: "3",
    },
  },
  {
    key: "trasera",
    label: "Trasera",
    descripcion: "Ancho menos 2 grosores × alto menos 2 grosores.",
    defaults: {
      nombre: "Trasera",
      cantidad: 1,
      fuente_largo: "ancho",
      ajuste_largo_mm: 0,
      ajuste_largo_grosores: -2,
      fuente_ancho: "alto",
      ajuste_ancho_mm: 0,
      ajuste_ancho_grosores: -2,
      lados_con_canto: "ninguno",
    },
  },
  {
    key: "custom",
    label: "Personalizado",
    descripcion: "Define las fórmulas manualmente.",
    defaults: {
      nombre: "",
      cantidad: 1,
      fuente_largo: "ancho",
      ajuste_largo_mm: 0,
      ajuste_largo_grosores: 0,
      fuente_ancho: "alto",
      ajuste_ancho_mm: 0,
      ajuste_ancho_grosores: 0,
      lados_con_canto: "ninguno",
    },
  },
];
