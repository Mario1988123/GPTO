import * as React from "react";
import { createClient } from "@/lib/supabase/server";
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Svg, Rect, Circle, Line as PdfLine } from "@react-pdf/renderer";
import { TIPOS_TALADRO } from "@/lib/tipos/taladros";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 9, fontFamily: "Helvetica" },
  h1: { fontSize: 14, fontWeight: "bold", marginBottom: 4 },
  sub: { color: "#666", marginBottom: 8 },
  piezaCard: { border: "1pt solid #ccc", borderRadius: 4, padding: 8, marginBottom: 10 },
  piezaTitle: { fontSize: 11, fontWeight: "bold" },
  piezaMeta: { fontSize: 8, color: "#666", marginTop: 2 },
  table: { marginTop: 6 },
  tr: { flexDirection: "row", borderBottom: "0.5pt solid #ddd", paddingVertical: 1.5 },
  tdSmall: { width: 30, textAlign: "right", fontFamily: "Courier" },
  tdLabel: { flex: 2 },
  tdMid: { width: 60, textAlign: "center" },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  legendItem: { fontSize: 8, marginRight: 8, flexDirection: "row", alignItems: "center" },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 3 },
});

export async function GET(_req: Request, { params }: { params: Promise<{ armarioId: string }> }) {
  const { armarioId } = await params;
  const s = await createClient();
  const [{ data: armario }, { data: piezas }, { data: taladros }] = await Promise.all([
    s.from("armarios").select("nombre, ancho_total_mm, alto_total_mm, fondo_mm, proyectos(nombre, clientes(nombre))").eq("id", armarioId).maybeSingle(),
    s.from("piezas_modulo")
      .select("id, nombre, largo_mm, ancho_mm, grosor_mm, cantidad, modulos_armario!inner(armario_id, nombre_override, tipos_modulo(nombre))")
      .eq("modulos_armario.armario_id", armarioId)
      .order("orden"),
    s.from("pieza_puntos_taladro").select("*"),
  ]);
  if (!armario) return new Response("Armario no encontrado", { status: 404 });

  const piezaIds = new Set((piezas ?? []).map((p) => p.id));
  type PT = { id: string; pieza_modulo_id: string; tipo: string; cara: string; x_mm: number; y_mm: number; diametro_mm: number; profundidad_mm: number | null; pasante: boolean };
  const tPorPieza = new Map<string, PT[]>();
  for (const t of (taladros ?? []) as PT[]) {
    if (!piezaIds.has(t.pieza_modulo_id)) continue;
    const arr = tPorPieza.get(t.pieza_modulo_id) ?? [];
    arr.push(t);
    tPorPieza.set(t.pieza_modulo_id, arr);
  }

  const a = armario as unknown as { nombre: string; ancho_total_mm: number; alto_total_mm: number; fondo_mm: number; proyectos?: { nombre?: string; clientes?: { nombre?: string } | { nombre?: string }[] } | { nombre?: string; clientes?: { nombre?: string } }[] };
  const proyArr = Array.isArray(a.proyectos) ? a.proyectos[0] : a.proyectos;
  const proyectoNombre = proyArr?.nombre ?? "";
  const cliRaw = proyArr?.clientes;
  const cliObj = Array.isArray(cliRaw) ? cliRaw[0] : cliRaw;
  const clienteNombre = cliObj?.nombre ?? "";

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Plano de montaje · {a.nombre}</Text>
        <Text style={styles.sub}>
          {proyectoNombre}{clienteNombre ? ` — ${clienteNombre}` : ""} · Armario {a.ancho_total_mm}×{a.alto_total_mm}×{a.fondo_mm} mm
        </Text>

        <View style={styles.legend}>
          {TIPOS_TALADRO.map((t) => (
            <View key={t.value} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: t.color }]} />
              <Text>{t.label}</Text>
            </View>
          ))}
        </View>

        {(piezas ?? []).map((p) => {
          const ts = tPorPieza.get(p.id) ?? [];
          // SVG escala: ancho disponible ~ 540pt, mantener proporción.
          const W_PT = 270;
          const H_PT = (p.ancho_mm / p.largo_mm) * W_PT;
          const sx = W_PT / p.largo_mm;
          const sy = H_PT / p.ancho_mm;
          // @ts-expect-error relacion supabase
          const moduloNombre: string = p.modulos_armario?.nombre_override ?? p.modulos_armario?.tipos_modulo?.nombre ?? "";
          return (
            <View key={p.id} style={styles.piezaCard} wrap={false}>
              <Text style={styles.piezaTitle}>{p.nombre}</Text>
              <Text style={styles.piezaMeta}>
                {p.largo_mm}×{p.ancho_mm}×{p.grosor_mm} mm · ud×{p.cantidad} · {moduloNombre} · {ts.length} taladros
              </Text>
              <View style={{ flexDirection: "row", marginTop: 6 }}>
                <View style={{ width: W_PT + 4 }}>
                  <Svg width={W_PT + 4} height={H_PT + 24}>
                    <Rect x={2} y={2} width={W_PT} height={H_PT} fill="#fff" stroke="#1e293b" strokeWidth={1} />
                    {ts.map((t) => {
                      const meta = TIPOS_TALADRO.find((x) => x.value === t.tipo);
                      const cx = 2 + t.x_mm * sx;
                      const cy = 2 + t.y_mm * sy;
                      const r = Math.max(2, t.diametro_mm * 0.4);
                      return (
                        <React.Fragment key={t.id}>
                          <Circle cx={cx} cy={cy} r={r} fill={meta?.color ?? "#888"} stroke="#fff" strokeWidth={0.5} />
                          <PdfLine x1={cx - r * 0.6} y1={cy} x2={cx + r * 0.6} y2={cy} stroke="#fff" strokeWidth={0.5} />
                          <PdfLine x1={cx} y1={cy - r * 0.6} x2={cx} y2={cy + r * 0.6} stroke="#fff" strokeWidth={0.5} />
                        </React.Fragment>
                      );
                    })}
                  </Svg>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  {ts.length > 0 ? (
                    <View style={styles.table}>
                      <View style={[styles.tr, { backgroundColor: "#f3f3f3", borderBottom: "1pt solid #999" }]}>
                        <Text style={styles.tdLabel}>Tipo</Text>
                        <Text style={styles.tdMid}>Cara</Text>
                        <Text style={styles.tdSmall}>X</Text>
                        <Text style={styles.tdSmall}>Y</Text>
                        <Text style={styles.tdSmall}>Ø</Text>
                        <Text style={styles.tdSmall}>Pf</Text>
                      </View>
                      {ts.map((t) => {
                        const meta = TIPOS_TALADRO.find((x) => x.value === t.tipo);
                        return (
                          <View key={t.id} style={styles.tr}>
                            <Text style={styles.tdLabel}>{meta?.label ?? t.tipo}</Text>
                            <Text style={styles.tdMid}>{t.cara}</Text>
                            <Text style={styles.tdSmall}>{Number(t.x_mm).toFixed(0)}</Text>
                            <Text style={styles.tdSmall}>{Number(t.y_mm).toFixed(0)}</Text>
                            <Text style={styles.tdSmall}>{Number(t.diametro_mm).toFixed(0)}</Text>
                            <Text style={styles.tdSmall}>{t.profundidad_mm ? Number(t.profundidad_mm).toFixed(0) : (t.pasante ? "pas" : "—")}</Text>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={{ fontSize: 8, color: "#888", marginTop: 4 }}>Sin taladros definidos.</Text>
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </Page>
    </Document>
  );

  // react-pdf no necesita React.Fragment importado, lo añadimos como alias:
  const buf = await renderToBuffer(doc);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="montaje-${a.nombre}.pdf"`,
    },
  });
}
