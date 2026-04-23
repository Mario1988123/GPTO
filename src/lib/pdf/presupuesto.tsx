import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { formatEur, CATEGORIAS_LINEA, type PresupuestoLinea, type Presupuesto } from "@/lib/tipos/presupuestos";

const CAT_LBL = Object.fromEntries(CATEGORIAS_LINEA.map((c) => [c.value, c.label]));

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#18181b",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottom: "2px solid #18181b",
    paddingBottom: 12,
    marginBottom: 16,
  },
  empresaBox: { flexDirection: "column", maxWidth: "50%" },
  logo: { width: 80, height: 80, objectFit: "contain" },
  empresaNombre: { fontSize: 14, fontWeight: 700 },
  empresaLinea: { fontSize: 9, color: "#52525b", marginTop: 2 },
  docTitleBox: { alignItems: "flex-end" },
  docTitle: { fontSize: 22, fontWeight: 700 },
  docNumero: { fontSize: 13, marginTop: 2 },
  docFecha: { fontSize: 9, color: "#52525b", marginTop: 2 },
  sectionTitle: { fontSize: 11, fontWeight: 700, marginTop: 12, marginBottom: 6 },
  clienteBox: {
    border: "1px solid #e4e4e7",
    borderRadius: 4,
    padding: 10,
    marginBottom: 14,
    backgroundColor: "#fafafa",
  },
  clienteNombre: { fontSize: 12, fontWeight: 700 },
  clienteLinea: { fontSize: 9, color: "#52525b", marginTop: 2 },
  table: { marginTop: 4 },
  thead: {
    flexDirection: "row",
    backgroundColor: "#e4e4e7",
    padding: 6,
    fontSize: 9,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  th: { paddingHorizontal: 4 },
  tr: {
    flexDirection: "row",
    padding: 6,
    borderBottom: "1px solid #f4f4f5",
    fontSize: 9,
  },
  trCategoria: {
    flexDirection: "row",
    padding: 5,
    backgroundColor: "#fafafa",
    fontSize: 9,
    fontWeight: 700,
    color: "#3f3f46",
  },
  td: { paddingHorizontal: 4 },
  colDescripcion: { flex: 3 },
  colCantidad: { flex: 0.8, textAlign: "right" },
  colUnidad: { flex: 0.5, textAlign: "center", color: "#71717a" },
  colPrecio: { flex: 1, textAlign: "right" },
  colDesc: { flex: 0.5, textAlign: "right", color: "#71717a" },
  colTotal: { flex: 1, textAlign: "right", fontWeight: 700 },
  totalesBox: {
    marginTop: 18,
    alignSelf: "flex-end",
    width: "45%",
    border: "1px solid #18181b",
    borderRadius: 4,
    padding: 10,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
    fontSize: 10,
  },
  totalFinal: {
    marginTop: 6,
    paddingTop: 6,
    borderTop: "1px solid #18181b",
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 13,
    fontWeight: 700,
  },
  notasBox: {
    marginTop: 18,
    padding: 10,
    backgroundColor: "#fafafa",
    borderLeft: "3px solid #a1a1aa",
    fontSize: 9,
    color: "#3f3f46",
  },
  pieBox: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: "1px solid #e4e4e7",
    paddingTop: 8,
    fontSize: 8,
    color: "#71717a",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

type Props = {
  presupuesto: Presupuesto;
  lineas: PresupuestoLinea[];
  empresa: {
    nombre: string;
    config_empresa: Record<string, unknown>;
  };
  cliente: {
    nombre: string;
    nif: string | null;
    email: string | null;
    telefono: string | null;
    direccion: Record<string, string | undefined> | null;
  } | null;
  proyecto: { nombre: string } | null;
};

export function PresupuestoPDF({ presupuesto, lineas, empresa, cliente, proyecto }: Props) {
  const cfg = empresa.config_empresa ?? {};
  const logoUrl = typeof cfg.logo_url === "string" ? cfg.logo_url : null;
  const empresaNif = typeof cfg.empresa_nif === "string" ? cfg.empresa_nif : null;
  const empresaDir = typeof cfg.empresa_direccion === "string" ? cfg.empresa_direccion : null;
  const empresaTelef = typeof cfg.empresa_telefono === "string" ? cfg.empresa_telefono : null;
  const empresaEmail = typeof cfg.empresa_email === "string" ? cfg.empresa_email : null;

  const dirCliente = cliente?.direccion ?? {};
  const clienteDirTxt = [dirCliente.calle, dirCliente.numero, dirCliente.cp, dirCliente.ciudad, dirCliente.provincia]
    .filter(Boolean)
    .join(", ");

  // Agrupar líneas por categoría
  const categorias = ["tableros", "cantos", "herrajes", "mano_obra", "otro"];
  const grupos = categorias
    .map((cat) => ({ cat, lineas: lineas.filter((l) => l.categoria === cat) }))
    .filter((g) => g.lineas.length > 0);

  const fechaDoc = presupuesto.fecha_emision ?? presupuesto.created_at;
  const fechaStr = fechaDoc ? new Date(fechaDoc).toLocaleDateString("es-ES") : "—";
  const validezStr = presupuesto.fecha_emision
    ? new Date(new Date(presupuesto.fecha_emision).getTime() + presupuesto.validez_dias * 24 * 60 * 60 * 1000).toLocaleDateString("es-ES")
    : null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.empresaBox}>
            {logoUrl ? <Image src={logoUrl} style={styles.logo} /> : null}
            <Text style={styles.empresaNombre}>{empresa.nombre}</Text>
            {empresaNif ? <Text style={styles.empresaLinea}>{empresaNif}</Text> : null}
            {empresaDir ? <Text style={styles.empresaLinea}>{empresaDir}</Text> : null}
            {empresaTelef ? <Text style={styles.empresaLinea}>{empresaTelef}</Text> : null}
            {empresaEmail ? <Text style={styles.empresaLinea}>{empresaEmail}</Text> : null}
          </View>
          <View style={styles.docTitleBox}>
            <Text style={styles.docTitle}>PRESUPUESTO</Text>
            <Text style={styles.docNumero}>{presupuesto.numero ?? "BORRADOR"}</Text>
            <Text style={styles.docFecha}>Fecha: {fechaStr}</Text>
            {validezStr ? <Text style={styles.docFecha}>Válido hasta: {validezStr}</Text> : null}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Cliente</Text>
        <View style={styles.clienteBox}>
          <Text style={styles.clienteNombre}>{cliente?.nombre ?? "—"}</Text>
          {cliente?.nif ? <Text style={styles.clienteLinea}>NIF: {cliente.nif}</Text> : null}
          {clienteDirTxt ? <Text style={styles.clienteLinea}>{clienteDirTxt}</Text> : null}
          {cliente?.telefono ? <Text style={styles.clienteLinea}>{cliente.telefono}</Text> : null}
          {cliente?.email ? <Text style={styles.clienteLinea}>{cliente.email}</Text> : null}
          {proyecto ? <Text style={[styles.clienteLinea, { marginTop: 4, color: "#3f3f46" }]}>Proyecto: {proyecto.nombre}</Text> : null}
        </View>

        <Text style={styles.sectionTitle}>Desglose</Text>
        <View style={styles.table}>
          <View style={styles.thead}>
            <Text style={[styles.th, styles.colDescripcion]}>Descripción</Text>
            <Text style={[styles.th, styles.colCantidad]}>Cantidad</Text>
            <Text style={[styles.th, styles.colUnidad]}>Ud.</Text>
            <Text style={[styles.th, styles.colPrecio]}>€/ud</Text>
            <Text style={[styles.th, styles.colDesc]}>Desc.</Text>
            <Text style={[styles.th, styles.colTotal]}>Total</Text>
          </View>
          {grupos.map((g) => (
            <View key={g.cat}>
              <View style={styles.trCategoria}>
                <Text>{CAT_LBL[g.cat] ?? g.cat}</Text>
              </View>
              {g.lineas.map((l) => (
                <View key={l.id} style={styles.tr}>
                  <Text style={[styles.td, styles.colDescripcion]}>{l.descripcion}</Text>
                  <Text style={[styles.td, styles.colCantidad]}>{Number(l.cantidad).toLocaleString("es-ES", { maximumFractionDigits: 2 })}</Text>
                  <Text style={[styles.td, styles.colUnidad]}>{l.unidad}</Text>
                  <Text style={[styles.td, styles.colPrecio]}>{formatEur(Number(l.precio_unitario_eur))}</Text>
                  <Text style={[styles.td, styles.colDesc]}>{Number(l.descuento_linea_pct) > 0 ? `-${l.descuento_linea_pct}%` : "—"}</Text>
                  <Text style={[styles.td, styles.colTotal]}>{formatEur(Number(l.total_linea_eur))}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.totalesBox}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>{formatEur(Number(presupuesto.subtotal_eur))}</Text>
          </View>
          {Number(presupuesto.descuento_global_pct) > 0 ? (
            <View style={styles.totalRow}>
              <Text>Descuento global ({presupuesto.descuento_global_pct}%)</Text>
              <Text>-{formatEur(Number(presupuesto.descuento_eur))}</Text>
            </View>
          ) : null}
          <View style={styles.totalRow}>
            <Text>Base imponible</Text>
            <Text>{formatEur(Number(presupuesto.base_imponible_eur))}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>IVA {presupuesto.iva_pct}%</Text>
            <Text>{formatEur(Number(presupuesto.iva_eur))}</Text>
          </View>
          <View style={styles.totalFinal}>
            <Text>TOTAL</Text>
            <Text>{formatEur(Number(presupuesto.total_eur))}</Text>
          </View>
        </View>

        {presupuesto.notas ? (
          <View style={styles.notasBox}>
            <Text>{presupuesto.notas}</Text>
          </View>
        ) : null}

        <View style={styles.pieBox} fixed>
          <Text>{empresa.nombre}</Text>
          <Text>Presupuesto {presupuesto.numero ?? "(borrador)"} · {fechaStr}</Text>
          <Text render={({ pageNumber, totalPages }) => `Pág. ${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
