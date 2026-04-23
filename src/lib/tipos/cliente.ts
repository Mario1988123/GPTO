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
  email: string | null;
  telefono: string | null;
  direccion: Direccion | null;
  nif: string | null;
  notas: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
};
