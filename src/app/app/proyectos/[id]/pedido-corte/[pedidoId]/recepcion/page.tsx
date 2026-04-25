import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, AlertTriangle, CheckCircle2, Trash2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  registrarIncidenciaPieza,
  resolverIncidencia,
  eliminarIncidencia,
  confirmarPiezaRecibida,
} from "../../../../recepcion-actions";
import { ToastFromSearchParams } from "../../../../../catalogo/shared";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const TIPOS_INCIDENCIA = [
  { v: "mal_cortada",        l: "Mal cortada",        c: "bg-red-500/10 text-red-700 dark:text-red-400" },
  { v: "tocada",             l: "Tocada / golpeada",  c: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  { v: "rayada",             l: "Rayada",             c: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  { v: "falta",              l: "Falta (no llegó)",   c: "bg-red-500/10 text-red-700 dark:text-red-400" },
  { v: "grosor_incorrecto",  l: "Grosor incorrecto",  c: "bg-orange-500/10 text-orange-700 dark:text-orange-400" },
  { v: "veta_incorrecta",    l: "Veta incorrecta",    c: "bg-violet-500/10 text-violet-700 dark:text-violet-400" },
  { v: "canto_defectuoso",   l: "Canto defectuoso",   c: "bg-pink-500/10 text-pink-700 dark:text-pink-400" },
  { v: "otro",               l: "Otro",               c: "bg-zinc-500/10 text-zinc-700" },
];

export default async function RecepcionPedidoPage({
  params,
}: {
  params: Promise<{ id: string; pedidoId: string }>;
}) {
  const { id: proyectoId, pedidoId } = await params;
  const s = await createClient();

  const [{ data: pedido }, { data: piezas }, { data: incidencias }, { data: asignaciones }, { data: almacenes }, { data: furgonetas }] = await Promise.all([
    s.from("pedidos_tableros_corte").select("id, fecha_pedido, estado").eq("id", pedidoId).maybeSingle(),
    s.from("piezas_modulo")
      .select(`id, nombre, largo_mm, ancho_mm, grosor_mm, cantidad,
        modulos_armario!inner(armario_id, armarios!inner(proyecto_id, nombre))`)
      .eq("modulos_armario.armarios.proyecto_id", proyectoId)
      .order("orden"),
    s.from("incidencias_piezas_recibidas")
      .select("id, pieza_modulo_id, ocurrencia, tipo, descripcion, resuelto, requiere_repeticion, foto_url, created_at"),
    s.from("pedido_corte_entrega_piezas")
      .select("id, pieza_modulo_id, ocurrencia, confirmada, con_incidencia, entrega_id, pedido_corte_entregas!inner(pedido_id)")
      .eq("pedido_corte_entregas.pedido_id", pedidoId),
    s.from("almacenes").select("id, nombre").eq("activo", true).order("nombre"),
    s.from("furgonetas").select("id, nombre").eq("activa", true).order("nombre"),
  ]);

  if (!pedido) notFound();

  // Index incidencias por pieza
  const incPorPieza = new Map<string, typeof incidencias>();
  for (const inc of incidencias ?? []) {
    const arr = incPorPieza.get(inc.pieza_modulo_id) ?? [];
    arr.push(inc);
    incPorPieza.set(inc.pieza_modulo_id, arr);
  }
  const asigPorPieza = new Map<string, { confirmada: boolean; con_incidencia: boolean; ocurrencia: number }[]>();
  for (const a of asignaciones ?? []) {
    const arr = asigPorPieza.get(a.pieza_modulo_id) ?? [];
    arr.push({ confirmada: a.confirmada as boolean, con_incidencia: a.con_incidencia as boolean, ocurrencia: a.ocurrencia as number });
    asigPorPieza.set(a.pieza_modulo_id, arr);
  }

  const piezasArr = piezas ?? [];
  const totalPiezas = piezasArr.reduce((acc, p) => acc + (p.cantidad as number), 0);
  const totalConfirmadas = (asignaciones ?? []).filter((a) => a.confirmada).length;
  const totalIncidencias = (incidencias ?? []).filter((i) => !i.resuelto).length;

  const reg = async (fd: FormData) => { "use server"; await registrarIncidenciaPieza(proyectoId, pedidoId, fd); };

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <Link
        href={`/app/proyectos/${proyectoId}/pedido-corte/${pedidoId}`}
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver al pedido
      </Link>

      <PageHeader
        eyebrow="Recepción"
        title="Checklist de recepción"
        description={`Pedido del ${(pedido as { fecha_pedido?: string }).fecha_pedido ?? "—"}`}
      />

      {/* Stats */}
      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Piezas totales" value={String(totalPiezas)} />
        <Stat label="Confirmadas" value={String(totalConfirmadas)} good />
        <Stat label="Incidencias abiertas" value={String(totalIncidencias)} alert={totalIncidencias > 0} />
      </section>

      {/* Listado de piezas con checklist + form de incidencia */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase">
            <tr>
              <th className="px-3 py-2 text-left">Pieza</th>
              <th className="px-3 py-2 text-center">Medidas</th>
              <th className="px-3 py-2 text-center">Cant.</th>
              <th className="px-3 py-2 text-center">Confirmadas</th>
              <th className="px-3 py-2 text-left">Incidencias</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {piezasArr.map((p) => {
              const asigs = asigPorPieza.get(p.id) ?? [];
              const confirmadas = asigs.filter((a) => a.confirmada).length;
              const incs = (incPorPieza.get(p.id) ?? []).filter((i) => !i.resuelto);
              const todoOk = confirmadas === p.cantidad && incs.length === 0;

              const confirmar = async () => {
                "use server";
                // Confirma todas las que falten, las mete en el almacén principal o el primero
                const pendientes = Array.from({ length: p.cantidad as number }, (_, i) => i + 1)
                  .filter((occ) => !asigs.some((a) => a.ocurrencia === occ && a.confirmada));
                const almacenId = (almacenes ?? [])[0]?.id as string | undefined;
                for (const occ of pendientes) {
                  await confirmarPiezaRecibida(proyectoId, pedidoId, p.id, occ, almacenId ?? null, null);
                }
              };

              return (
                <tr key={p.id} className={todoOk ? "bg-emerald-500/5" : ""}>
                  <td className="px-3 py-2">
                    <p className="font-semibold">{p.nombre}</p>
                    {/* @ts-expect-error supabase relacion */}
                    <p className="text-[10px] text-muted-foreground">{p.modulos_armario?.armarios?.nombre ?? ""}</p>
                  </td>
                  <td className="px-3 py-2 text-center font-mono text-xs">{p.largo_mm}×{p.ancho_mm}×{p.grosor_mm}</td>
                  <td className="px-3 py-2 text-center font-mono">{p.cantidad}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={confirmadas === p.cantidad ? "text-emerald-600 font-bold" : "text-muted-foreground"}>
                      {confirmadas} / {p.cantidad}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {incs.length === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {incs.map((i) => {
                          const meta = TIPOS_INCIDENCIA.find((t) => t.v === i.tipo);
                          const resolver = async () => { "use server"; await resolverIncidencia(proyectoId, pedidoId, i.id); };
                          const borrar = async () => { "use server"; await eliminarIncidencia(proyectoId, pedidoId, i.id); };
                          return (
                            <span key={i.id} className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] ${meta?.c ?? ""}`}>
                              <AlertTriangle className="h-3 w-3" />
                              {meta?.l ?? i.tipo}
                              <form action={resolver} className="inline"><button type="submit" title="Resolver" className="opacity-60 hover:opacity-100">✓</button></form>
                              <form action={borrar} className="inline"><button type="submit" title="Borrar" className="opacity-60 hover:opacity-100">×</button></form>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {confirmadas < p.cantidad && (
                      <form action={confirmar}>
                        <Button type="submit" size="sm" variant="outline">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Recibir
                        </Button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Form registrar incidencia */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          Registrar incidencia
        </p>
        <form action={reg} className="grid gap-3 sm:grid-cols-6">
          <div className="space-y-1.5 sm:col-span-3">
            <Label htmlFor="pieza_modulo_id">Pieza *</Label>
            <select id="pieza_modulo_id" name="pieza_modulo_id" required className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">— elegir —</option>
              {piezasArr.map((p) => <option key={p.id} value={p.id}>{p.nombre} ({p.largo_mm}×{p.ancho_mm})</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ocurrencia">Ud. nº</Label>
            <Input id="ocurrencia" name="ocurrencia" type="number" min={1} defaultValue={1} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="tipo">Tipo de incidencia *</Label>
            <select id="tipo" name="tipo" defaultValue="mal_cortada" required className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              {TIPOS_INCIDENCIA.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-6"><Label htmlFor="descripcion">Descripción</Label><Input id="descripcion" name="descripcion" placeholder="Detalle del problema..." /></div>
          <div className="space-y-1.5 sm:col-span-4"><Label htmlFor="foto_url">URL foto</Label><Input id="foto_url" name="foto_url" placeholder="(opcional, evidencia para reclamar al proveedor)" /></div>
          <div className="flex items-end gap-3 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="requiere_repeticion" defaultChecked /> Requiere rehacer</label>
          </div>
          <div className="sm:col-span-6"><Button type="submit" className="bg-amber-600 text-white hover:bg-amber-700"><Plus className="h-4 w-4" /> Registrar incidencia</Button></div>
        </form>
      </section>

      {/* Listado de incidencias resueltas */}
      {(incidencias ?? []).filter((i) => i.resuelto).length > 0 && (
        <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Resueltas</p>
          <ul className="divide-y divide-border">
            {(incidencias ?? []).filter((i) => i.resuelto).map((i) => {
              const meta = TIPOS_INCIDENCIA.find((t) => t.v === i.tipo);
              const borrar = async () => { "use server"; await eliminarIncidencia(proyectoId, pedidoId, i.id); };
              return (
                <li key={i.id} className="flex items-center gap-3 py-2 text-sm">
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-0"><CheckCircle2 className="mr-1 h-3 w-3" />Resuelta</Badge>
                  <span>{meta?.l ?? i.tipo}</span>
                  <span className="flex-1 text-xs text-muted-foreground">{i.descripcion}</span>
                  <form action={borrar}><Button type="submit" variant="ghost" size="sm" className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button></form>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, good, alert }: { label: string; value: string; good?: boolean; alert?: boolean }) {
  return (
    <div className={`rounded-2xl border ${alert ? "border-red-300 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20" : good ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20" : "border-border bg-card"} p-5 shadow-sm`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 font-mono text-3xl font-bold ${alert ? "text-red-700 dark:text-red-400" : good ? "text-emerald-700 dark:text-emerald-400" : ""}`}>{value}</p>
    </div>
  );
}
