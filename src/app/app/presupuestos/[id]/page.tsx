import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Send,
  Trash2,
  Check,
  X,
  Clock,
  Plus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  actualizarLinea,
  actualizarMetadatos,
  cambiarEstadoPresupuesto,
  crearLineaCustom,
  eliminarLinea,
  eliminarPresupuesto,
  emitirPresupuesto,
  regenerarLineas,
} from "../../proyectos/presupuestos-actions";
import { ToastFromSearchParams } from "../../catalogo/shared";
import {
  CATEGORIAS_LINEA,
  ESTADOS_PRESUPUESTO,
  formatEur,
  type EstadoPresupuesto,
  type Presupuesto,
  type PresupuestoLinea,
} from "@/lib/tipos/presupuestos";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

const EST = Object.fromEntries(ESTADOS_PRESUPUESTO.map((e) => [e.value, e]));
const CAT_LBL = Object.fromEntries(CATEGORIAS_LINEA.map((c) => [c.value, c.label]));

const ESTADO_VARIANT: Record<string, string> = {
  borrador: "bg-muted text-muted-foreground",
  enviado: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  aceptado: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  rechazado: "bg-red-500/10 text-red-700 dark:text-red-400",
  caducado: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

const INPUT_XS = "h-8 rounded-md border border-input bg-background px-2 text-xs shadow-xs outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/15";

export default async function DetallePresupuestoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await createClient();

  const { data: pres } = await s
    .from("presupuestos")
    .select("*, proyectos(id, nombre, clientes(nombre, nif, email, telefono))")
    .eq("id", id)
    .maybeSingle<Presupuesto & { proyectos: { id: string; nombre: string; clientes: { nombre: string; nif: string | null; email: string | null; telefono: string | null } | null } | null }>();
  if (!pres) notFound();

  const { data: lineas } = await s
    .from("presupuestos_lineas")
    .select("*")
    .eq("presupuesto_id", id)
    .order("orden")
    .returns<PresupuestoLinea[]>();

  const editable = pres.estado === "borrador";
  const metaAction = async (fd: FormData) => { "use server"; await actualizarMetadatos(id, fd); };
  const regen = async () => { "use server"; await regenerarLineas(id); };
  const emitir = async () => { "use server"; await emitirPresupuesto(id); };
  const delPres = async () => { "use server"; await eliminarPresupuesto(id); };
  const nuevaLinea = async (fd: FormData) => { "use server"; await crearLineaCustom(id, fd); };

  // Agrupar líneas por categoría para la UI
  const lineasPorCategoria = (lineas ?? []).reduce<Record<string, PresupuestoLinea[]>>((acc, l) => {
    const cat = l.categoria ?? "otro";
    (acc[cat] ??= []).push(l);
    return acc;
  }, {});
  const ordenCategorias = ["tableros", "cantos", "herrajes", "mano_obra", "otro"];

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Suspense>
        <ToastFromSearchParams />
      </Suspense>

      <nav className="mb-4 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Link href="/app/presupuestos" className="inline-flex items-center gap-1 transition hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Presupuestos
        </Link>
        {pres.proyectos ? (
          <>
            <span>·</span>
            <Link href={`/app/proyectos/${pres.proyectos.id}`} className="transition hover:text-foreground">
              {pres.proyectos.nombre}
            </Link>
          </>
        ) : null}
      </nav>

      <PageHeader
        eyebrow="Presupuesto"
        title={pres.numero ?? pres.numero_borrador ?? "Sin número"}
        description={
          pres.proyectos?.clientes?.nombre
            ? `${pres.proyectos.clientes.nombre}${pres.fecha_emision ? ` · Emitido el ${new Date(pres.fecha_emision).toLocaleDateString("es-ES")}` : ""}`
            : undefined
        }
        actions={
          <>
            <Badge className={`${ESTADO_VARIANT[pres.estado] ?? ""} border-0`}>
              {EST[pres.estado]?.label}
            </Badge>
            <a
              href={`/api/presupuestos/${id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium transition hover:bg-muted"
            >
              <Download className="h-3.5 w-3.5" />
              PDF
            </a>
            {editable ? (
              <>
                <form action={regen}>
                  <Button type="submit" variant="outline" size="sm">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Regenerar
                  </Button>
                </form>
                <form action={emitir}>
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Emitir
                  </Button>
                </form>
                <form action={delPres}>
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    className="border-destructive/30 text-destructive hover:bg-destructive/5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </form>
              </>
            ) : (
              <ChangeEstadoButtons id={id} estado={pres.estado} />
            )}
          </>
        }
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6 min-w-0">
        {/* main column */}

      {/* Metadatos */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Configuración</p>
          <h2 className="mt-0.5 text-lg font-bold tracking-tight">Datos del presupuesto</h2>
        </div>
        <form action={metaAction} className="grid gap-4 sm:grid-cols-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-muted-foreground">Validez (días)</label>
            <select
              name="validez_dias"
              defaultValue={pres.validez_dias}
              disabled={!editable}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs disabled:opacity-60"
            >
              <option value="15">15</option>
              <option value="30">30</option>
              <option value="60">60</option>
              <option value="90">90</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-muted-foreground">Modo presentación</label>
            <select
              name="modo_presentacion"
              defaultValue={pres.modo_presentacion}
              disabled={!editable}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs disabled:opacity-60"
            >
              <option value="detallado_modulo">Detallado</option>
              <option value="precio_cerrado">Precio cerrado</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-muted-foreground">Descuento global %</label>
            <input
              name="descuento_global_pct"
              type="number"
              step="0.01"
              min="0"
              max="100"
              defaultValue={pres.descuento_global_pct}
              disabled={!editable}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-sm shadow-xs disabled:opacity-60"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-muted-foreground">IVA %</label>
            <input
              name="iva_pct"
              type="number"
              step="0.01"
              min="0"
              max="100"
              defaultValue={pres.iva_pct}
              disabled={!editable}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-sm shadow-xs disabled:opacity-60"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-4">
            <label className="block text-xs font-semibold text-muted-foreground">Notas</label>
            <textarea
              name="notas"
              rows={2}
              defaultValue={pres.notas ?? ""}
              disabled={!editable}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs disabled:opacity-60"
            />
          </div>
          {editable ? (
            <div className="sm:col-span-4 border-t border-border pt-4">
              <Button type="submit">Guardar metadatos</Button>
            </div>
          ) : null}
        </form>
      </section>

      {/* Líneas */}
      <section className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-baseline justify-between border-b border-border px-6 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Detalle</p>
            <h2 className="mt-0.5 text-lg font-bold tracking-tight">
              Líneas {lineas?.length ? `· ${lineas.length}` : ""}
            </h2>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoría</TableHead>
                <TableHead className="min-w-[200px]">Descripción</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Ud.</TableHead>
                <TableHead>Precio/ud</TableHead>
                <TableHead>Desc.</TableHead>
                <TableHead className="text-right">Total</TableHead>
                {editable ? <TableHead className="w-10" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(lineas ?? []).map((l) => {
                const upd = async (fd: FormData) => { "use server"; await actualizarLinea(id, l.id, fd); };
                const del = async () => { "use server"; await eliminarLinea(id, l.id); };
                return (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {CAT_LBL[l.categoria] ?? l.categoria}
                    </TableCell>
                    {editable ? (
                      <TableCell colSpan={5}>
                        <form action={upd} className="grid gap-2 sm:grid-cols-5">
                          <input name="descripcion" defaultValue={l.descripcion} className={`col-span-2 ${INPUT_XS}`} />
                          <input name="cantidad" type="number" step="0.01" defaultValue={l.cantidad} className={`${INPUT_XS} font-mono`} />
                          <input name="precio_unitario_eur" type="number" step="0.01" defaultValue={l.precio_unitario_eur} className={`${INPUT_XS} font-mono`} />
                          <div className="flex items-center gap-1">
                            <input
                              name="descuento_linea_pct"
                              type="number"
                              step="0.01"
                              defaultValue={l.descuento_linea_pct}
                              placeholder="%"
                              className={`w-16 ${INPUT_XS} font-mono`}
                            />
                            <Button type="submit" size="xs">OK</Button>
                          </div>
                        </form>
                      </TableCell>
                    ) : (
                      <>
                        <TableCell>{l.descripcion}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {Number(l.cantidad).toLocaleString("es-ES")}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{l.unidad}</TableCell>
                        <TableCell className="font-mono text-xs">{formatEur(Number(l.precio_unitario_eur))}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {Number(l.descuento_linea_pct) > 0 ? `${l.descuento_linea_pct}%` : "—"}
                        </TableCell>
                      </>
                    )}
                    <TableCell className="text-right font-mono text-sm font-bold">
                      {formatEur(Number(l.total_linea_eur))}
                    </TableCell>
                    {editable ? (
                      <TableCell className="text-right">
                        <form action={del}>
                          <Button
                            type="submit"
                            variant="ghost"
                            size="icon-xs"
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </form>
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {editable ? (
          <form action={nuevaLinea} className="m-6 grid gap-2 rounded-xl border border-dashed border-border bg-muted/20 p-4 sm:grid-cols-6">
            <select name="categoria" defaultValue="otro" className={INPUT_XS}>
              {CATEGORIAS_LINEA.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <input name="descripcion" placeholder="Descripción" required className={`sm:col-span-2 ${INPUT_XS}`} />
            <input name="cantidad" type="number" step="0.01" placeholder="Cantidad" required className={`${INPUT_XS} font-mono`} />
            <select name="unidad" defaultValue="ud" className={INPUT_XS}>
              <option value="ud">ud</option>
              <option value="m2">m²</option>
              <option value="ml">ml</option>
              <option value="h">h</option>
              <option value="global">global</option>
            </select>
            <div className="flex items-center gap-1">
              <input name="precio_unitario_eur" type="number" step="0.01" placeholder="€" required className={`flex-1 ${INPUT_XS} font-mono`} />
              <Button type="submit" size="xs">
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </form>
        ) : null}
      </section>
        </div>

        {/* Sidebar derecho: totales sticky */}
        <aside className="space-y-4">
          <div className="sticky top-6 space-y-4">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="border-b border-border bg-muted/30 px-5 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Totales
                </p>
              </div>
              <dl className="divide-y divide-border">
                <SidebarRow label="Subtotal" value={formatEur(Number(pres.subtotal_eur))} />
                {Number(pres.descuento_eur) > 0 ? (
                  <SidebarRow
                    label="Descuento"
                    value={`−${formatEur(Number(pres.descuento_eur))}`}
                    highlight="red"
                  />
                ) : null}
                <SidebarRow label="Base imponible" value={formatEur(Number(pres.base_imponible_eur))} />
                <SidebarRow
                  label={`IVA ${pres.iva_pct}%`}
                  value={formatEur(Number(pres.iva_eur))}
                />
              </dl>
              <div className="border-t-2 border-foreground bg-gradient-to-br from-foreground to-foreground/90 px-5 py-4 text-background">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-background/70">
                  Total
                </p>
                <p className="mt-1 font-mono text-3xl font-bold tracking-tight tabular-nums">
                  {formatEur(Number(pres.total_eur))}
                </p>
              </div>
            </div>

            {/* Cliente resumen */}
            {pres.proyectos?.clientes ? (
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Cliente
                </p>
                <p className="mt-1 font-bold text-slate-900">{pres.proyectos.clientes.nombre}</p>
                {pres.proyectos.clientes.nif ? (
                  <p className="font-mono text-xs text-muted-foreground">{pres.proyectos.clientes.nif}</p>
                ) : null}
                {pres.proyectos.clientes.email ? (
                  <p className="mt-1 text-xs">{pres.proyectos.clientes.email}</p>
                ) : null}
                {pres.proyectos.clientes.telefono ? (
                  <p className="text-xs">{pres.proyectos.clientes.telefono}</p>
                ) : null}
              </div>
            ) : null}

            {/* Cantidad líneas */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Resumen líneas
              </p>
              <dl className="mt-2 space-y-1 text-xs">
                {ordenCategorias.map((cat) => {
                  const n = lineasPorCategoria[cat]?.length ?? 0;
                  if (n === 0) return null;
                  const subtotal = (lineasPorCategoria[cat] ?? []).reduce(
                    (a, l) => a + Number(l.total_linea_eur),
                    0,
                  );
                  return (
                    <div key={cat} className="flex items-center justify-between">
                      <dt className="text-muted-foreground">
                        {CAT_LBL[cat]} · <span className="font-mono">{n}</span>
                      </dt>
                      <dd className="font-mono font-semibold">{formatEur(subtotal)}</dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SidebarRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "red" | "emerald";
}) {
  const color =
    highlight === "red"
      ? "text-red-600"
      : highlight === "emerald"
        ? "text-emerald-600"
        : "text-foreground";
  return (
    <div className="flex items-center justify-between px-5 py-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`font-mono font-semibold tabular-nums ${color}`}>{value}</dd>
    </div>
  );
}

function ChangeEstadoButtons({ id, estado }: { id: string; estado: EstadoPresupuesto }) {
  const aceptar = async () => { "use server"; await cambiarEstadoPresupuesto(id, "aceptado"); };
  const rechazar = async () => { "use server"; await cambiarEstadoPresupuesto(id, "rechazado"); };
  const caducar = async () => { "use server"; await cambiarEstadoPresupuesto(id, "caducado"); };
  const facturar = async () => {
    "use server";
    const { crearFacturaDesdePresupuesto } = await import("../../facturas/actions");
    await crearFacturaDesdePresupuesto(id);
  };
  if (estado === "aceptado") {
    return (
      <form action={facturar}>
        <Button type="submit" size="sm" className="bg-blue-600 text-white hover:bg-blue-700">
          <Check className="h-3.5 w-3.5" />
          Crear factura
        </Button>
      </form>
    );
  }
  if (estado === "enviado") {
    return (
      <>
        <form action={aceptar}>
          <Button type="submit" size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700">
            <Check className="h-3.5 w-3.5" />
            Aceptado
          </Button>
        </form>
        <form action={rechazar}>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="border-destructive/30 text-destructive hover:bg-destructive/5"
          >
            <X className="h-3.5 w-3.5" />
            Rechazado
          </Button>
        </form>
        <form action={caducar}>
          <Button type="submit" variant="outline" size="sm">
            <Clock className="h-3.5 w-3.5" />
            Caducado
          </Button>
        </form>
      </>
    );
  }
  return null;
}
