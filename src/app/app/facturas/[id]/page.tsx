import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Trash2, Send, CheckCircle2, FileText, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  actualizarFactura,
  añadirLinea,
  eliminarLinea,
  emitirFactura,
  marcarPagada,
  eliminarFacturaBorrador,
  crearRectificativa,
} from "../actions";
import { ToastFromSearchParams } from "../../catalogo/shared";
import { ESTADOS_FACTURA, FORMAS_PAGO, TIPOS_IVA, fmtEur } from "@/lib/tipos/facturas";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

const LBL = Object.fromEntries(ESTADOS_FACTURA.map((e) => [e.value, e]));

export default async function DetalleFacturaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await createClient();

  const [{ data: f }, { data: lineas }] = await Promise.all([
    s.from("facturas").select("*").eq("id", id).maybeSingle(),
    s.from("factura_lineas").select("*").eq("factura_id", id).order("orden"),
  ]);
  if (!f) notFound();

  const editable = f.estado === "borrador";
  const meta = LBL[f.estado as string];

  const update    = async (fd: FormData) => { "use server"; await actualizarFactura(id, fd); };
  const addLinea  = async (fd: FormData) => { "use server"; await añadirLinea(id, fd); };
  const emitir    = async () => { "use server"; await emitirFactura(id); };
  const marcarP   = async () => { "use server"; await marcarPagada(id, !f.pagada); };
  const borrar    = async () => { "use server"; await eliminarFacturaBorrador(id); };
  const rectif    = async (fd: FormData) => {
    "use server";
    const motivo = String(fd.get("motivo") ?? "").trim() || "Rectificación";
    await crearRectificativa(id, motivo);
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>

      <Link href="/app/facturas" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Facturas
      </Link>

      <PageHeader
        eyebrow={f.tipo === "rectificativa" ? "Factura rectificativa" : "Factura"}
        title={f.numero_completo === "BORRADOR" ? "Factura en borrador" : f.numero_completo}
        actions={
          <>
            <Badge className={`${meta?.color ?? ""} border-0`}>{meta?.label ?? f.estado}</Badge>
            {editable && (
              <>
                <form action={emitir}>
                  <Button type="submit" size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700">
                    <Send className="h-3.5 w-3.5" />
                    Emitir factura
                  </Button>
                </form>
                <form action={borrar}>
                  <Button type="submit" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </form>
              </>
            )}
            {!editable && (f.estado === "emitida" || f.estado === "enviada") && (
              <form action={marcarP}>
                <Button type="submit" size="sm" variant={f.pagada ? "outline" : "default"}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {f.pagada ? "Marcar como impagada" : "Marcar como pagada"}
                </Button>
              </form>
            )}
            <a
              href={`/api/facturas/${id}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-muted"
            >
              <FileText className="h-3.5 w-3.5" />
              PDF
            </a>
          </>
        }
      />

      {/* Datos fiscales */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card label="Emisor">
          <p className="font-semibold">{f.emisor.razon_social}</p>
          <p className="font-mono text-xs text-muted-foreground">NIF · {f.emisor.nif}</p>
          <p className="text-xs text-muted-foreground">{f.emisor.domicilio_fiscal}</p>
        </Card>
        <Card label="Receptor">
          <p className="font-semibold">{f.receptor.razon_social}</p>
          {f.receptor.nif && <p className="font-mono text-xs text-muted-foreground">NIF · {f.receptor.nif}</p>}
          {f.receptor.domicilio && <p className="text-xs text-muted-foreground">{f.receptor.domicilio}</p>}
        </Card>
      </section>

      {/* Form datos generales */}
      <form action={update} className="mt-6 grid gap-3 rounded-2xl border border-border bg-card p-6 shadow-sm sm:grid-cols-3">
        <div className="space-y-1.5"><Label>Fecha emisión</Label><Input name="fecha_emision" type="date" defaultValue={f.fecha_emision} disabled={!editable} /></div>
        <div className="space-y-1.5"><Label>Fecha operación</Label><Input name="fecha_operacion" type="date" defaultValue={f.fecha_operacion ?? ""} disabled={!editable} /></div>
        <div className="space-y-1.5">
          <Label>Forma de pago</Label>
          <select name="forma_pago" defaultValue={f.forma_pago} disabled={!editable} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
            {FORMAS_PAGO.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div className="space-y-1.5"><Label>Vencimiento (días)</Label><Input name="vencimiento_dias" type="number" defaultValue={f.vencimiento_dias} disabled={!editable} /></div>
        <div className="space-y-1.5"><Label>Fecha vencimiento</Label><Input name="fecha_vencimiento" type="date" defaultValue={f.fecha_vencimiento ?? ""} disabled={!editable} /></div>
        <div className="space-y-1.5"><Label>IBAN</Label><Input name="iban" defaultValue={f.iban ?? ""} placeholder="ES00 0000 0000 0000 0000 0000" /></div>
        <div className="space-y-1.5"><Label>Retención IRPF (%)</Label><Input name="retencion_irpf_pct" type="number" step="0.01" defaultValue={f.retencion_irpf_pct ?? 0} disabled={!editable} /></div>
        <div className="space-y-1.5"><Label>Recargo equivalencia (%)</Label><Input name="recargo_eq_pct" type="number" step="0.01" defaultValue={f.recargo_eq_pct ?? 0} disabled={!editable} /></div>
        {f.tipo === "rectificativa" && (
          <div className="space-y-1.5 sm:col-span-3"><Label>Motivo rectificación *</Label><Input name="motivo_rectificacion" defaultValue={f.motivo_rectificacion ?? ""} disabled={!editable} required /></div>
        )}
        <div className="space-y-1.5 sm:col-span-3"><Label>Notas</Label><Input name="notas" defaultValue={f.notas ?? ""} /></div>
        <div className="sm:col-span-3 flex justify-end">
          <Button type="submit">Guardar</Button>
        </div>
      </form>

      {/* Líneas */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-bold">Líneas de la factura</h2>
        {(lineas ?? []).length === 0 ? (
          <p className="rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">Sin líneas. Añade la primera abajo.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">Descripción</th>
                  <th className="px-3 py-2 text-right">Cant.</th>
                  <th className="px-3 py-2 text-right">PVP</th>
                  <th className="px-3 py-2 text-right">Dto %</th>
                  <th className="px-3 py-2 text-right">IVA %</th>
                  <th className="px-3 py-2 text-right">Base</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  {editable && <th className="w-10" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(lineas ?? []).map((l) => {
                  const del = async () => { "use server"; await eliminarLinea(id, l.id as string); };
                  return (
                    <tr key={l.id as string}>
                      <td className="px-3 py-2">{l.descripcion as string}</td>
                      <td className="px-3 py-2 text-right font-mono">{l.cantidad as number}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmtEur(Number(l.precio_unitario))}</td>
                      <td className="px-3 py-2 text-right font-mono">{l.descuento_pct as number}%</td>
                      <td className="px-3 py-2 text-right font-mono">{l.iva_pct as number}%</td>
                      <td className="px-3 py-2 text-right font-mono">{fmtEur(Number(l.base_linea))}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold">{fmtEur(Number(l.total_linea))}</td>
                      {editable && (
                        <td>
                          <form action={del} className="inline">
                            <button type="submit" className="flex h-7 w-7 items-center justify-center rounded text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </form>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {editable && (
          <form action={addLinea} className="mt-4 grid gap-2 rounded-lg border border-dashed border-border bg-muted/20 p-3 sm:grid-cols-12">
            <Input name="descripcion" placeholder="Descripción *" required className="sm:col-span-5" />
            <Input name="cantidad" type="number" step="0.01" defaultValue={1} placeholder="Cant." className="sm:col-span-1" />
            <Input name="precio_unitario" type="number" step="0.01" placeholder="PVP" className="sm:col-span-2" />
            <Input name="descuento_pct" type="number" step="0.01" defaultValue={0} placeholder="Dto %" className="sm:col-span-1" />
            <select name="iva_pct" defaultValue={21} className="flex h-9 rounded-md border border-input bg-background px-2 text-sm sm:col-span-1">
              {TIPOS_IVA.map((t) => <option key={t} value={t}>{t}%</option>)}
            </select>
            <Button type="submit" size="sm" className="sm:col-span-2"><Plus className="h-3.5 w-3.5" /> Línea</Button>
          </form>
        )}
      </section>

      {/* Totales */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-bold">Resumen</h2>
        <dl className="grid gap-2 text-sm">
          <Row label="Base imponible" value={fmtEur(Number(f.base_imponible))} />
          <Row label="IVA" value={fmtEur(Number(f.cuota_iva))} />
          {Number(f.recargo_eq_pct) > 0 && <Row label={`Recargo equivalencia (${f.recargo_eq_pct}%)`} value={fmtEur(Number(f.cuota_recargo_eq))} />}
          {Number(f.retencion_irpf_pct) > 0 && <Row label={`Retención IRPF (${f.retencion_irpf_pct}%)`} value={`-${fmtEur(Number(f.cuota_irpf))}`} />}
          <div className="mt-2 border-t border-border pt-2">
            <Row label="TOTAL" value={fmtEur(Number(f.total))} bold />
          </div>
        </dl>
      </section>

      {/* Rectificativa */}
      {f.estado !== "borrador" && f.tipo !== "rectificativa" && f.estado !== "rectificada" && (
        <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-bold">Rectificar factura</h2>
          <p className="mt-1 text-xs text-muted-foreground">Una factura emitida es inmutable. Para corregirla emite una rectificativa indicando el motivo.</p>
          <form action={rectif} className="mt-3 flex gap-2">
            <Input name="motivo" placeholder="Motivo de la rectificación (obligatorio)" required />
            <Button type="submit" variant="outline">Crear rectificativa</Button>
          </form>
        </section>
      )}
    </div>
  );
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={bold ? "font-bold" : "text-muted-foreground"}>{label}</dt>
      <dd className={`font-mono ${bold ? "text-lg font-bold" : ""}`}>{value}</dd>
    </div>
  );
}
