import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import type { PiezaModulo } from "@/lib/tipos/piezas";

const styles = StyleSheet.create({
  page: { padding: 20, fontFamily: "Helvetica", fontSize: 9 },
  header: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: "1px solid #a1a1aa",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  titulo: { fontSize: 14, fontWeight: 700 },
  subtitulo: { fontSize: 9, color: "#52525b" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 0,
  },
  etiqueta: {
    width: "33.333%",
    padding: 6,
    borderRight: "1px dashed #d4d4d8",
    borderBottom: "1px dashed #d4d4d8",
    flexDirection: "row",
    gap: 8,
  },
  qr: { width: 70, height: 70 },
  info: { flex: 1, flexDirection: "column", justifyContent: "space-between" },
  nombre: { fontSize: 11, fontWeight: 700 },
  dims: { fontSize: 9, color: "#27272a", fontFamily: "Courier" },
  meta: { fontSize: 7, color: "#71717a" },
  qrText: { fontSize: 6, color: "#71717a", fontFamily: "Courier" },
});

type PiezaConQR = PiezaModulo & {
  qrDataUrl: string;
  modulo_nombre: string;
  armario_nombre: string;
};

export function EtiquetasPDF({
  piezas,
  armario_nombre,
  proyecto_nombre,
  empresa_nombre,
}: {
  piezas: PiezaConQR[];
  armario_nombre: string;
  proyecto_nombre: string;
  empresa_nombre: string;
}) {
  // Expandir cada pieza por cantidad (una etiqueta por unidad física).
  const expandidas: { p: PiezaConQR; ocurrencia: number }[] = [];
  for (const p of piezas) {
    for (let i = 1; i <= p.cantidad; i++) {
      expandidas.push({ p, ocurrencia: i });
    }
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.titulo}>{armario_nombre}</Text>
            <Text style={styles.subtitulo}>{proyecto_nombre} · {empresa_nombre}</Text>
          </View>
          <Text style={styles.subtitulo}>{expandidas.length} etiqueta(s)</Text>
        </View>

        <View style={styles.grid}>
          {expandidas.map((e, idx) => (
            <View key={idx} style={styles.etiqueta} wrap={false}>
              <Image src={e.p.qrDataUrl} style={styles.qr} />
              <View style={styles.info}>
                <View>
                  <Text style={styles.nombre}>{e.p.nombre}{e.p.cantidad > 1 ? ` #${e.ocurrencia}/${e.p.cantidad}` : ""}</Text>
                  <Text style={styles.dims}>{e.p.largo_mm} × {e.p.ancho_mm} × {e.p.grosor_mm} mm</Text>
                </View>
                <View>
                  <Text style={styles.meta}>{e.p.modulo_nombre}</Text>
                  <Text style={styles.qrText}>{e.p.qr_code.slice(0, 8)}…</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}
