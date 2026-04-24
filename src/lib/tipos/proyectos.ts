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
  acceso_token: string;
  created_at: string;
  updated_at: string;
};

export type Armario = {
  id: string;
  proyecto_id: string;
  estancia_id: string;
  nombre: string;
  ancho_total_mm: number;
  alto_total_mm: number;
  fondo_mm: number;
  tipo_instalacion: "empotrado" | "suelto";
  margen_tapeta_mm: number;
  plano_x_mm: number;
  plano_y_mm: number;
  plano_rotacion: 0 | 90 | 180 | 270;
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
  particiones_verticales: number;
  referencia_tablero_id: string | null;
  posicion_x_mm: number;
  posicion_y_mm: number;
  tiene_led_rebaje: boolean;
  led_color_hex: string | null;
  led_intensidad_lm_m: number | null;
  tableros_grosor_mm: number | null;
  trasera_grosor_mm: number | null;
  separacion_cajones_mm: number;
  mostrar_puertas: boolean;
  notas: string | null;
  created_at: string;
  updated_at: string;
};

export type TipoSubelemento =
  | "cajon"
  | "balda_fija"
  | "balda_regulable"
  | "puerta_abatible"
  | "puerta_corredera"
  | "puerta_plegable"
  | "barra_colgar"
  | "hueco_abierto"
  | "tapeta_ciega"
  | "espejo"
  | "led_rebaje"
  | "zapatero"
  | "cesto_extraible"
  | "corbatero"
  | "joyero"
  | "portapantalones"
  | "canaleta_tirador";

export const SUBELEMENTOS_META: Record<
  TipoSubelemento,
  { label: string; grupo: "interior_horizontal" | "frente" | "complemento"; color: string; descripcion: string }
> = {
  cajon: { label: "Cajón", grupo: "interior_horizontal", color: "#c9a27c", descripcion: "Cajón con alto configurable" },
  balda_fija: { label: "Balda fija", grupo: "interior_horizontal", color: "#a07855", descripcion: "Balda horizontal fija" },
  balda_regulable: { label: "Balda regulable", grupo: "interior_horizontal", color: "#b58c65", descripcion: "Balda con apoyos ajustables" },
  barra_colgar: { label: "Barra colgar", grupo: "interior_horizontal", color: "#8892b0", descripcion: "Barra metálica para colgar ropa" },
  hueco_abierto: { label: "Hueco libre", grupo: "interior_horizontal", color: "transparent", descripcion: "Espacio vacío aprovechable" },
  puerta_abatible: { label: "Puerta abatible", grupo: "frente", color: "#3c3c3c", descripcion: "Puerta con bisagras" },
  puerta_corredera: { label: "Puerta corredera", grupo: "frente", color: "#4a4a4a", descripcion: "Puerta deslizante" },
  puerta_plegable: { label: "Puerta plegable", grupo: "frente", color: "#5a5a5a", descripcion: "Puerta que se pliega" },
  tapeta_ciega: { label: "Tapeta ciega", grupo: "frente", color: "#6c5a48", descripcion: "Panel ciego para rellenar hueco" },
  espejo: { label: "Espejo", grupo: "frente", color: "#cdd8e3", descripcion: "Espejo en puerta o interior" },
  led_rebaje: { label: "Rebaje LED", grupo: "complemento", color: "#ffe066", descripcion: "Rebaje avellanado para tira LED" },
  zapatero: { label: "Zapatero", grupo: "complemento", color: "#7d6552", descripcion: "Bandeja abatible para zapatos" },
  cesto_extraible: { label: "Cesto extraíble", grupo: "complemento", color: "#9ea7b8", descripcion: "Cesto metálico sobre guías" },
  corbatero: { label: "Corbatero", grupo: "complemento", color: "#b5a488", descripcion: "Soporte extraíble de corbatas" },
  joyero: { label: "Joyero", grupo: "complemento", color: "#d4b898", descripcion: "Bandeja compartimentada para joyas" },
  portapantalones: { label: "Portapantalones", grupo: "complemento", color: "#a0926f", descripcion: "Soporte extraíble de pantalones" },
  canaleta_tirador: { label: "Canaleta tirador", grupo: "complemento", color: "#555", descripcion: "Rebaje continuo como tirador integrado" },
};

export type ModuloSubelemento = {
  id: string;
  empresa_id: string;
  modulo_id: string;
  tipo: TipoSubelemento;
  orden: number;
  alto_mm: number | null;
  ancho_mm: number | null;
  fondo_mm: number | null;
  offset_x_mm: number;
  offset_y_mm: number;
  offset_z_mm: number;
  config: Record<string, unknown>;
  etiqueta: string | null;
  es_propio: boolean;
  proveedor_nombre: string | null;
  precio_override_eur: number | null;
  ref_proveedor: string | null;
  created_at: string;
  updated_at: string;
};

export type EstanciaGeometria = {
  estancia_id: string;
  empresa_id: string;
  tipo: "rectangular" | "poligono";
  puntos: { x: number; y: number }[];
  alto_pared_mm: number;
  created_at: string;
  updated_at: string;
};

export type Abertura = {
  id: string;
  empresa_id: string;
  estancia_id: string;
  tipo: "puerta" | "ventana";
  pared_idx: number;
  x_en_pared_mm: number;
  ancho_mm: number;
  alto_mm: number;
  antepecho_mm: number;
  etiqueta: string | null;
  orden: number;
  created_at: string;
  updated_at: string;
};
