export type EstadoEmpresa = "activa" | "suspendida" | "cancelada";
export type PlanEmpresa = "autonomo" | "taller" | "empresa";

export const PLANES: { value: PlanEmpresa; label: string; precio: number }[] = [
  { value: "autonomo", label: "Autónomo", precio: 49 },
  { value: "taller",   label: "Taller",   precio: 99 },
  { value: "empresa",  label: "Empresa",  precio: 199 },
];

export const ESTADOS_EMPRESA: { value: EstadoEmpresa; label: string; color: string }[] = [
  { value: "activa",      label: "Activa",      color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  { value: "suspendida",  label: "Suspendida",  color: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  { value: "cancelada",   label: "Cancelada",   color: "bg-red-500/10 text-red-700 dark:text-red-400" },
];

export type Permiso = {
  slug: string;
  grupo: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
};

export type RolEmpresa = {
  id: string;
  empresa_id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  permisos: string[];
  color: string;
  es_admin: boolean;
  es_default: boolean;
  activo: boolean;
};

export type SmtpProveedor = "smtp" | "gmail_oauth" | "icloud" | "ionos" | "outlook";

export const PROVEEDORES_SMTP: { value: SmtpProveedor; label: string; host: string; port: number; ssl: boolean }[] = [
  { value: "smtp",        label: "SMTP genérico", host: "",                 port: 587, ssl: true  },
  { value: "gmail_oauth", label: "Gmail",         host: "smtp.gmail.com",   port: 587, ssl: true  },
  { value: "icloud",      label: "iCloud",        host: "smtp.mail.me.com", port: 587, ssl: true  },
  { value: "ionos",       label: "IONOS",         host: "smtp.ionos.es",    port: 587, ssl: true  },
  { value: "outlook",     label: "Outlook / Microsoft 365", host: "smtp.office365.com", port: 587, ssl: true },
];

export type ConfigSmtp = {
  proveedor: SmtpProveedor;
  host: string | null;
  port: number;
  usuario: string | null;
  ssl: boolean;
  from_email: string;
  from_nombre: string | null;
  reply_to: string | null;
  verificado: boolean;
  ultimo_test: string | null;
  ultimo_error: string | null;
};

export type TipoPlantillaEmail =
  | "presupuesto_enviado" | "presupuesto_aceptado" | "presupuesto_recordatorio"
  | "pedido_confirmado" | "pedido_listo" | "albaran"
  | "factura_enviada" | "recordatorio_pago"
  | "bienvenida_cliente" | "cita_programada" | "generico";

export const TIPOS_PLANTILLA: { value: TipoPlantillaEmail; label: string; grupo: string }[] = [
  { value: "presupuesto_enviado",      label: "Presupuesto enviado",       grupo: "Presupuestos" },
  { value: "presupuesto_aceptado",     label: "Presupuesto aceptado",      grupo: "Presupuestos" },
  { value: "presupuesto_recordatorio", label: "Recordatorio presupuesto",  grupo: "Presupuestos" },
  { value: "pedido_confirmado",        label: "Pedido confirmado",         grupo: "Pedidos" },
  { value: "pedido_listo",             label: "Pedido listo",              grupo: "Pedidos" },
  { value: "albaran",                  label: "Albarán de entrega",        grupo: "Pedidos" },
  { value: "factura_enviada",          label: "Factura enviada",           grupo: "Facturación" },
  { value: "recordatorio_pago",        label: "Recordatorio pago",         grupo: "Facturación" },
  { value: "bienvenida_cliente",       label: "Bienvenida cliente",        grupo: "Cliente" },
  { value: "cita_programada",          label: "Cita programada",           grupo: "Cliente" },
  { value: "generico",                 label: "Genérico",                  grupo: "Otros" },
];
