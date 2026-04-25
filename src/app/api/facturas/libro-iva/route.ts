import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function escapeCSV(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  if (/[,"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const s = await createClient();
  const { data, error } = await s
    .from("facturas")
    .select("numero_completo, fecha_emision, fecha_operacion, receptor, base_imponible, cuota_iva, cuota_irpf, cuota_recargo_eq, total, estado, tipo")
    .neq("estado", "borrador")
    .order("fecha_emision");
  if (error) return new Response(error.message, { status: 500 });

  const rows: string[] = [
    "Número,Fecha emisión,Fecha operación,Receptor,NIF receptor,Base imponible,IVA,Recargo eq.,Retención IRPF,Total,Estado,Tipo",
  ];
  for (const f of data ?? []) {
    const r = (f.receptor ?? {}) as { razon_social?: string; nif?: string };
    rows.push([
      f.numero_completo,
      f.fecha_emision,
      f.fecha_operacion ?? "",
      r.razon_social ?? "",
      r.nif ?? "",
      f.base_imponible,
      f.cuota_iva,
      f.cuota_recargo_eq,
      f.cuota_irpf,
      f.total,
      f.estado,
      f.tipo,
    ].map(escapeCSV).join(","));
  }
  const csv = "﻿" + rows.join("\n");
  const fecha = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="libro-iva-${fecha}.csv"`,
    },
  });
}
