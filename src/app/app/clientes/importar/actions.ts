"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Resultado = {
  total: number;
  importados: number;
  errores: { fila: number; motivo: string; datos: string }[];
};

/**
 * Parser CSV simple. Soporta:
 * - separador coma o punto y coma (autodetecta el más usado)
 * - campos entre comillas dobles con comillas escapadas ""
 * - saltos de línea \n y \r\n
 *
 * No usamos librería externa: en carpintería los CSV son de unas decenas de filas
 * y este parser cubre los formatos típicos de Excel y Google Sheets.
 */
function parseCSV(content: string): string[][] {
  const sep = (content.split("\n")[0]?.split(";").length ?? 0) > (content.split("\n")[0]?.split(",").length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (inQuotes) {
      if (c === '"' && content[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else {
      if (c === '"') { inQuotes = true; }
      else if (c === sep) { cur.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && content[i + 1] === "\n") i++;
        cur.push(field); field = "";
        if (cur.some((v) => v.trim())) rows.push(cur);
        cur = [];
      } else { field += c; }
    }
  }
  if (field || cur.length) { cur.push(field); if (cur.some((v) => v.trim())) rows.push(cur); }
  return rows;
}

/**
 * Importa un CSV con clientes.
 *
 * Cabeceras admitidas (sensibles a alias en español/inglés, case-insensitive):
 *   nombre / razon_social / razon social
 *   apellido1 / apellido / primer_apellido
 *   apellido2 / segundo_apellido
 *   es_empresa / empresa (sí/no, true/false)
 *   email / correo
 *   telefono / teléfono / movil / móvil / phone
 *   nif / dni / cif
 *   contacto / contacto_persona / persona_contacto
 *   contacto_telefono / telefono_contacto
 *   contacto_email
 *   etiquetas / tags
 *   origen
 *   notas
 *   calle / direccion
 *   numero
 *   piso
 *   cp / codigo_postal
 *   ciudad
 *   provincia
 *
 * Solo "nombre" y "telefono" son obligatorios; "apellido1" obligatorio si NO es empresa.
 */
const ALIAS: Record<string, string[]> = {
  nombre: ["nombre", "razon_social", "razon social", "razón social", "nombre cliente", "name"],
  apellido1: ["apellido1", "apellido", "primer_apellido", "primer apellido"],
  apellido2: ["apellido2", "segundo_apellido", "segundo apellido"],
  es_empresa: ["es_empresa", "empresa", "is_company"],
  email: ["email", "correo", "e-mail", "mail"],
  telefono: ["telefono", "teléfono", "movil", "móvil", "phone", "tel"],
  nif: ["nif", "dni", "cif", "documento"],
  contacto_persona: ["contacto", "contacto_persona", "persona_contacto", "persona contacto"],
  contacto_telefono: ["contacto_telefono", "telefono_contacto"],
  contacto_email: ["contacto_email", "email_contacto"],
  etiquetas: ["etiquetas", "tags"],
  origen: ["origen", "source"],
  notas: ["notas", "observaciones", "notes"],
  "direccion.calle": ["calle", "direccion", "dirección", "street"],
  "direccion.numero": ["numero", "número", "num"],
  "direccion.piso": ["piso", "puerta"],
  "direccion.cp": ["cp", "codigo_postal", "código_postal", "código postal", "codigo postal", "zip"],
  "direccion.ciudad": ["ciudad", "localidad", "city"],
  "direccion.provincia": ["provincia", "state"],
};

function mapearCabeceras(headers: string[]): Record<string, number> {
  const norm = (s: string) => s.trim().toLowerCase();
  const headersNorm = headers.map(norm);
  const mapping: Record<string, number> = {};
  for (const [campo, aliases] of Object.entries(ALIAS)) {
    for (const a of aliases) {
      const idx = headersNorm.indexOf(norm(a));
      if (idx >= 0) { mapping[campo] = idx; break; }
    }
  }
  return mapping;
}

function parseBool(v: string | undefined): boolean {
  const s = (v ?? "").trim().toLowerCase();
  return s === "true" || s === "sí" || s === "si" || s === "1" || s === "yes" || s === "x";
}

export async function importarClientesCSV(formData: FormData): Promise<Resultado | undefined> {
  const file = formData.get("archivo");
  if (!(file instanceof File) || file.size === 0) {
    redirect("/app/clientes/importar?error=" + encodeURIComponent("Selecciona un archivo CSV"));
  }
  const buf = Buffer.from(await (file as File).arrayBuffer());
  const content = buf.toString("utf8");
  const rows = parseCSV(content);
  if (rows.length < 2) {
    redirect("/app/clientes/importar?error=" + encodeURIComponent("CSV vacío o sin filas de datos"));
  }
  const [headers, ...filas] = rows;
  const map = mapearCabeceras(headers);
  if (map.nombre == null) {
    redirect("/app/clientes/importar?error=" + encodeURIComponent("Falta la columna 'nombre' (o 'razón_social')"));
  }

  const supabase = await createClient();
  const errores: Resultado["errores"] = [];
  const aInsertar: Record<string, unknown>[] = [];

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i];
    const get = (campo: string): string | null => {
      const idx = map[campo];
      if (idx == null) return null;
      const val = (fila[idx] ?? "").trim();
      return val || null;
    };
    const nombre = get("nombre");
    if (!nombre) { errores.push({ fila: i + 2, motivo: "Sin nombre", datos: fila.join(" | ") }); continue; }

    const es_empresa = parseBool(get("es_empresa") ?? "");
    const apellido1 = get("apellido1");
    const telefono = get("telefono");

    if (!es_empresa && !apellido1) { errores.push({ fila: i + 2, motivo: "Particular sin apellido1", datos: fila.join(" | ") }); continue; }
    if (!telefono) { errores.push({ fila: i + 2, motivo: "Sin teléfono", datos: fila.join(" | ") }); continue; }

    const direccion: Record<string, string> = {};
    for (const k of ["calle", "numero", "piso", "cp", "ciudad", "provincia"] as const) {
      const v = get(`direccion.${k}`);
      if (v) direccion[k] = v;
    }

    const etiquetasRaw = get("etiquetas") ?? "";
    const etiquetas = etiquetasRaw
      ? etiquetasRaw.split(/[,;|]/).map((e) => e.trim()).filter(Boolean)
      : [];

    aInsertar.push({
      nombre,
      apellido1,
      apellido2: get("apellido2"),
      es_empresa,
      email: get("email"),
      telefono,
      nif: get("nif"),
      contacto_persona: get("contacto_persona"),
      contacto_telefono: get("contacto_telefono"),
      contacto_email: get("contacto_email"),
      etiquetas,
      origen: get("origen"),
      notas: get("notas"),
      direccion: Object.keys(direccion).length ? direccion : null,
      activo: true,
    });
  }

  let importados = 0;
  if (aInsertar.length > 0) {
    // Insertamos en batches de 100 para no superar límites de Postgres.
    for (let off = 0; off < aInsertar.length; off += 100) {
      const slice = aInsertar.slice(off, off + 100);
      const { error, count } = await supabase
        .from("clientes")
        .insert(slice, { count: "exact" });
      if (error) {
        errores.push({ fila: -1, motivo: error.message, datos: `Lote ${off}-${off + slice.length}` });
      } else {
        importados += count ?? slice.length;
      }
    }
  }

  revalidatePath("/app/clientes");
  return { total: filas.length, importados, errores };
}
