export type Direccion = {
  calle?: string;
  numero?: string;
  piso?: string;
  cp?: string;
  ciudad?: string;
  provincia?: string;
  pais?: string;
};

export type Cliente = {
  id: string;
  empresa_id: string;
  nombre: string;
  apellido1: string | null;
  apellido2: string | null;
  es_empresa: boolean;
  contacto_persona: string | null;
  contacto_telefono: string | null;
  contacto_email: string | null;
  contacto2_persona: string | null;
  contacto2_telefono: string | null;
  contacto2_email: string | null;
  email: string | null;
  telefono: string | null;
  direccion: Direccion | null;
  nif: string | null;
  notas: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export function nombreCompletoCliente(c: Pick<Cliente, "nombre" | "apellido1" | "apellido2" | "es_empresa">): string {
  if (c.es_empresa) return c.nombre;
  return [c.nombre, c.apellido1, c.apellido2].filter(Boolean).join(" ").trim() || c.nombre;
}
