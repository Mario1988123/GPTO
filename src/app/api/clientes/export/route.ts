import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function escapeCSV(value: unknown): string {
  if (value == null) return "";
  const s = typeof value === "string" ? value : Array.isArray(value) ? value.join(";") : String(value);
  if (/[,"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const HEADERS = [
  "nombre","apellido1","apellido2","es_empresa","email","telefono","nif",
  "contacto_persona","contacto_telefono","contacto_email",
  "contacto2_persona","contacto2_telefono","contacto2_email",
  "etiquetas","origen","proximo_seguimiento",
  "calle","numero","piso","cp","ciudad","provincia","pais",
  "notas","activo","created_at",
] as const;

export async function GET() {
  const s = await createClient();
  const { data, error } = await s
    .from("clientes")
    .select("*")
    .order("nombre");

  if (error) {
    return new Response(`Error: ${error.message}`, { status: 500 });
  }

  const rows: string[] = [HEADERS.join(",")];
  for (const c of data ?? []) {
    const dir = (c.direccion ?? {}) as Record<string, string | undefined>;
    const fila = [
      c.nombre, c.apellido1, c.apellido2, c.es_empresa,
      c.email, c.telefono, c.nif,
      c.contacto_persona, c.contacto_telefono, c.contacto_email,
      c.contacto2_persona, c.contacto2_telefono, c.contacto2_email,
      c.etiquetas, c.origen, c.proximo_seguimiento,
      dir.calle, dir.numero, dir.piso, dir.cp, dir.ciudad, dir.provincia, dir.pais,
      c.notas, c.activo, c.created_at,
    ];
    rows.push(fila.map(escapeCSV).join(","));
  }

  const csv = "﻿" + rows.join("\n"); // BOM para Excel
  const fecha = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clientes-${fecha}.csv"`,
    },
  });
}
