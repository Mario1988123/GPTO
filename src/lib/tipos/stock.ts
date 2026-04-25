export type Almacen = {
  id: string;
  nombre: string;
  direccion: string | null;
  notas: string | null;
  es_principal: boolean;
  activo: boolean;
};

export type Furgoneta = {
  id: string;
  nombre: string;
  matricula: string | null;
  modelo: string | null;
  conductor_usuario_id: string | null;
  notas: string | null;
  activa: boolean;
};

export type TableroFisico = {
  id: string;
  referencia_tablero_id: string;
  ancho_mm: number;
  alto_mm: number;
  proveedor_id: string | null;
  pedido_corte_id: string | null;
  ubicacion_almacen_id: string | null;
  ubicacion_furgoneta_id: string | null;
  estado: "entero" | "en_corte" | "consumido" | "recorte" | "dañado" | "devuelto";
  coste_eur: number | null;
  notas: string | null;
};

export type UbicacionTipo = "sin_ubicar" | "proveedor" | "almacen" | "furgoneta" | "obra" | "consumida";

export type MovimientoStock = {
  id: string;
  pieza_modulo_id: string | null;
  tablero_fisico_id: string | null;
  herraje_id: string | null;
  cantidad: number;
  origen_tipo: "proveedor" | "almacen" | "furgoneta" | "obra" | "sin_ubicar";
  origen_almacen_id: string | null;
  origen_furgoneta_id: string | null;
  origen_proveedor_id: string | null;
  destino_tipo: "almacen" | "furgoneta" | "obra" | "consumida";
  destino_almacen_id: string | null;
  destino_furgoneta_id: string | null;
  destino_proyecto_id: string | null;
  motivo: string | null;
  fecha: string;
};

export type CategoriaGasto =
  | "madera" | "herraje" | "corte" | "canto" | "transporte"
  | "mano_obra_externa" | "subcontrata" | "suelos" | "puertas_paso" | "rodapies" | "otros";

export const CATEGORIAS_GASTO: { value: CategoriaGasto; label: string; emoji: string }[] = [
  { value: "madera",            label: "Madera / tableros",     emoji: "🪵" },
  { value: "herraje",           label: "Herrajes",              emoji: "🔩" },
  { value: "corte",             label: "Corte (proveedor)",     emoji: "✂️" },
  { value: "canto",             label: "Canteado",              emoji: "📏" },
  { value: "transporte",        label: "Transporte / portes",   emoji: "🚚" },
  { value: "mano_obra_externa", label: "Mano de obra externa",  emoji: "🛠" },
  { value: "subcontrata",       label: "Subcontrata",           emoji: "🤝" },
  { value: "suelos",            label: "Suelos",                emoji: "🟦" },
  { value: "puertas_paso",      label: "Puertas de paso",       emoji: "🚪" },
  { value: "rodapies",          label: "Rodapiés",              emoji: "📐" },
  { value: "otros",             label: "Otros",                 emoji: "📦" },
];

export type GastoProyecto = {
  id: string;
  proyecto_id: string;
  categoria: CategoriaGasto;
  descripcion: string;
  importe_eur: number;
  proveedor_id: string | null;
  pedido_corte_id: string | null;
  fecha: string;
  factura_recibida_url: string | null;
  notas: string | null;
};
