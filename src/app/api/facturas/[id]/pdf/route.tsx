import { createClient } from "@/lib/supabase/server";
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  h1: { fontSize: 18, fontWeight: "bold", marginBottom: 4 },
  h2: { fontSize: 12, fontWeight: "bold", marginTop: 12, marginBottom: 6 },
  row: { flexDirection: "row" },
  col50: { flex: 1 },
  emisor: { marginBottom: 16 },
  bloque: { padding: 8, border: "1pt solid #ddd", borderRadius: 3, marginBottom: 8 },
  tableHead: { flexDirection: "row", backgroundColor: "#f3f3f3", padding: 5, fontWeight: "bold", fontSize: 9 },
  tableRow: { flexDirection: "row", padding: 5, borderBottom: "0.5pt solid #ddd", fontSize: 9 },
  cellDesc: { flex: 4 },
  cellNum: { flex: 1, textAlign: "right" },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 2 },
  totalLabel: { width: 130, textAlign: "right", paddingRight: 8 },
  totalValue: { width: 80, textAlign: "right", fontWeight: "bold" },
  bigTotal: { fontSize: 14, fontWeight: "bold" },
  pie: { marginTop: 30, fontSize: 8, color: "#666", textAlign: "center" },
});

function eur(n: number | string): string {
  const v = typeof n === "string" ? parseFloat(n) : n;
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await createClient();
  const [{ data: f }, { data: lineas }] = await Promise.all([
    s.from("facturas").select("*").eq("id", id).maybeSingle(),
    s.from("factura_lineas").select("*").eq("factura_id", id).order("orden"),
  ]);
  if (!f) return new Response("Factura no encontrada", { status: 404 });

  const emi = f.emisor as { razon_social: string; nif: string; domicilio_fiscal: string };
  const rec = f.receptor as { razon_social: string; nif: string | null; domicilio: string };

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.row}>
          <View style={styles.col50}>
            <Text style={styles.h1}>{f.tipo === "rectificativa" ? "FACTURA RECTIFICATIVA" : "FACTURA"}</Text>
            <Text>Nº: {f.numero_completo}</Text>
            <Text>Fecha: {f.fecha_emision}</Text>
            {f.fecha_operacion && <Text>Fecha operación: {f.fecha_operacion}</Text>}
          </View>
          <View style={[styles.col50, { textAlign: "right" }]}>
            <Text style={{ fontWeight: "bold" }}>{emi.razon_social}</Text>
            <Text>NIF: {emi.nif}</Text>
            <Text>{emi.domicilio_fiscal}</Text>
          </View>
        </View>

        <View style={styles.bloque}>
          <Text style={{ fontWeight: "bold", marginBottom: 4 }}>Cliente</Text>
          <Text>{rec.razon_social}</Text>
          {rec.nif && <Text>NIF: {rec.nif}</Text>}
          {rec.domicilio && <Text>{rec.domicilio}</Text>}
        </View>

        {f.tipo === "rectificativa" && f.motivo_rectificacion && (
          <View style={styles.bloque}>
            <Text style={{ fontWeight: "bold" }}>Motivo de la rectificación:</Text>
            <Text>{f.motivo_rectificacion}</Text>
          </View>
        )}

        <View style={styles.tableHead}>
          <Text style={styles.cellDesc}>Descripción</Text>
          <Text style={styles.cellNum}>Cant.</Text>
          <Text style={styles.cellNum}>PVP</Text>
          <Text style={styles.cellNum}>Dto%</Text>
          <Text style={styles.cellNum}>IVA%</Text>
          <Text style={styles.cellNum}>Total</Text>
        </View>
        {(lineas ?? []).map((l) => (
          <View key={l.id as string} style={styles.tableRow}>
            <Text style={styles.cellDesc}>{l.descripcion as string}</Text>
            <Text style={styles.cellNum}>{l.cantidad as number}</Text>
            <Text style={styles.cellNum}>{eur(Number(l.precio_unitario))}</Text>
            <Text style={styles.cellNum}>{l.descuento_pct as number}%</Text>
            <Text style={styles.cellNum}>{l.iva_pct as number}%</Text>
            <Text style={styles.cellNum}>{eur(Number(l.total_linea))}</Text>
          </View>
        ))}

        <View style={{ marginTop: 16 }}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Base imponible:</Text>
            <Text style={styles.totalValue}>{eur(Number(f.base_imponible))}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>IVA:</Text>
            <Text style={styles.totalValue}>{eur(Number(f.cuota_iva))}</Text>
          </View>
          {Number(f.recargo_eq_pct) > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Recargo eq. ({f.recargo_eq_pct}%):</Text>
              <Text style={styles.totalValue}>{eur(Number(f.cuota_recargo_eq))}</Text>
            </View>
          )}
          {Number(f.retencion_irpf_pct) > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Retención IRPF ({f.retencion_irpf_pct}%):</Text>
              <Text style={styles.totalValue}>-{eur(Number(f.cuota_irpf))}</Text>
            </View>
          )}
          <View style={[styles.totalRow, { marginTop: 6 }]}>
            <Text style={[styles.totalLabel, styles.bigTotal]}>TOTAL:</Text>
            <Text style={[styles.totalValue, styles.bigTotal]}>{eur(Number(f.total))}</Text>
          </View>
        </View>

        <View style={[styles.bloque, { marginTop: 20 }]}>
          <Text style={{ fontWeight: "bold", marginBottom: 4 }}>Forma de pago</Text>
          <Text>{f.forma_pago}</Text>
          {f.iban && <Text>IBAN: {f.iban}</Text>}
          {f.fecha_vencimiento && <Text>Vencimiento: {f.fecha_vencimiento}</Text>}
        </View>

        <Text style={styles.pie}>
          Factura emitida según RD 1619/2012 · Inmutable · {f.notas ?? ""}
        </Text>
      </Page>
    </Document>
  );

  const buf = await renderToBuffer(doc);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${f.numero_completo}.pdf"`,
    },
  });
}
