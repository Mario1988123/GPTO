import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Sparkles, Plus, Printer } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  regenerarTaladrosArmario,
  añadirPuntoTaladro,
  eliminarPuntoTaladro,
} from "../../../../taladros-actions";
import { ToastFromSearchParams } from "../../../../../catalogo/shared";
import { TIPOS_TALADRO, CARAS_TALADRO } from "@/lib/tipos/taladros";
import type { PuntoTaladro } from "@/lib/tipos/taladros";
import { PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PiezaTaladroSVG } from "./pieza-taladro-svg";

export const dynamic = "force-dynamic";

type Pieza = {
  id: string;
  nombre: string;
  largo_mm: number;
  ancho_mm: number;
  grosor_mm: number;
  cantidad: number;
  modulos_armario: { id: string; nombre_override: string | null; tipos_modulo: { nombre: string } | null };
};

export default async function MontajePage({
  params,
}: {
  params: Promise<{ id: string; armarioId: string }>;
}) {
  const { id: proyectoId, armarioId } = await params;
  const s = await createClient();

  const [{ data: armario }, { data: piezas }, { data: taladros }] = await Promise.all([
    s.from("armarios").select("id, nombre, ancho_total_mm, alto_total_mm, fondo_mm").eq("id", armarioId).maybeSingle(),
    s.from("piezas_modulo")
      .select(`id, nombre, largo_mm, ancho_mm, grosor_mm, cantidad,
        modulos_armario!inner(id, armario_id, nombre_override, tipos_modulo(nombre))`)
      .eq("modulos_armario.armario_id", armarioId)
      .order("orden")
      .returns<Pieza[]>(),
    s.from("pieza_puntos_taladro")
      .select("id, pieza_modulo_id, tipo, cara, x_mm, y_mm, diametro_mm, profundidad_mm, pasante, notas, generado_auto")
      .returns<PuntoTaladro[]>(),
  ]);

  if (!armario) notFound();

  const taladrosPorPieza = new Map<string, PuntoTaladro[]>();
  const piezaIds = new Set((piezas ?? []).map((p) => p.id));
  for (const t of taladros ?? []) {
    if (!piezaIds.has(t.pieza_modulo_id)) continue;
    const arr = taladrosPorPieza.get(t.pieza_modulo_id) ?? [];
    arr.push(t);
    taladrosPorPieza.set(t.pieza_modulo_id, arr);
  }

  const totalTaladros = (taladros ?? []).filter((t) => piezaIds.has(t.pieza_modulo_id)).length;

  const regenerar = async () => { "use server"; await regenerarTaladrosArmario(proyectoId, armarioId); };
  const añadir = async (fd: FormData) => { "use server"; await añadirPuntoTaladro(proyectoId, armarioId, fd); };

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 print:max-w-full print:px-2 print:py-2">
      <Suspense><ToastFromSearchParams /></Suspense>

      <Link
        href={`/app/proyectos/${proyectoId}/armarios/${armarioId}`}
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground print:hidden"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver al armario
      </Link>

      <PageHeader
        eyebrow="Plano de montaje"
        title={`${(armario as { nombre: string }).nombre} · taladros`}
        description={`${piezas?.length ?? 0} piezas · ${totalTaladros} puntos de taladro`}
        actions={
          <>
            <form action={regenerar} className="print:hidden">
              <Button type="submit" variant="outline" size="sm">
                <Sparkles className="h-3.5 w-3.5" />
                Regenerar automático
              </Button>
            </form>
            <a
              href={`/api/montaje/${armarioId}/pdf`}
              target="_blank"
              rel="noreferrer"
              className={`${buttonVariants({ variant: "outline", size: "sm" })} print:hidden`}
            >
              <Printer className="h-3.5 w-3.5" />
              PDF montaje
            </a>
          </>
        }
      />

      {/* Leyenda */}
      <section className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 p-3 text-xs print:hidden">
        <p className="font-bold">Leyenda:</p>
        {TIPOS_TALADRO.map((t) => (
          <span key={t.value} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full ring-1 ring-border" style={{ background: t.color }} />
            {t.label}
          </span>
        ))}
      </section>

      {/* Planos */}
      <section className="mt-6 grid gap-4 md:grid-cols-2 print:grid-cols-2 print:gap-2">
        {(piezas ?? []).map((p) => {
          const ts = taladrosPorPieza.get(p.id) ?? [];
          return (
            <article key={p.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm print:break-inside-avoid">
              <div className="mb-2 flex items-baseline justify-between">
                <div>
                  <p className="text-sm font-bold">{p.nombre}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {p.largo_mm}×{p.ancho_mm}×{p.grosor_mm} mm · ud×{p.cantidad} · {p.modulos_armario?.nombre_override ?? p.modulos_armario?.tipos_modulo?.nombre ?? ""}
                  </p>
                </div>
                <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-bold">{ts.length} taladros</span>
              </div>

              <PiezaTaladroSVG largo={p.largo_mm} ancho={p.ancho_mm} taladros={ts} />

              {/* Tabla de taladros */}
              {ts.length > 0 && (
                <details className="mt-2 text-xs print:open">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground print:hidden">
                    Detalle taladros
                  </summary>
                  <table className="mt-2 w-full text-[10px]">
                    <thead className="bg-muted/40 uppercase">
                      <tr>
                        <th className="px-1 py-1 text-left">Tipo</th>
                        <th className="px-1 py-1">Cara</th>
                        <th className="px-1 py-1 text-right">X</th>
                        <th className="px-1 py-1 text-right">Y</th>
                        <th className="px-1 py-1 text-right">Ø</th>
                        <th className="px-1 py-1 text-right">Prof</th>
                        <th className="w-6 print:hidden" />
                      </tr>
                    </thead>
                    <tbody>
                      {ts.map((t) => {
                        const meta = TIPOS_TALADRO.find((x) => x.value === t.tipo);
                        const borrar = async () => { "use server"; await eliminarPuntoTaladro(proyectoId, armarioId, t.id); };
                        return (
                          <tr key={t.id} className="border-t border-border/50">
                            <td className="px-1 py-1">
                              <span className="inline-flex items-center gap-1">
                                <span className="inline-block h-2 w-2 rounded-full" style={{ background: meta?.color ?? "#888" }} />
                                {meta?.label ?? t.tipo}
                              </span>
                            </td>
                            <td className="px-1 py-1 text-center">{t.cara}</td>
                            <td className="px-1 py-1 text-right font-mono">{Number(t.x_mm).toFixed(0)}</td>
                            <td className="px-1 py-1 text-right font-mono">{Number(t.y_mm).toFixed(0)}</td>
                            <td className="px-1 py-1 text-right font-mono">{Number(t.diametro_mm).toFixed(0)}</td>
                            <td className="px-1 py-1 text-right font-mono">{t.profundidad_mm ? Number(t.profundidad_mm).toFixed(0) : (t.pasante ? "pas" : "—")}</td>
                            <td className="px-1 py-1 text-right print:hidden">
                              <form action={borrar}>
                                <button type="submit" className="text-destructive hover:underline text-[10px]">×</button>
                              </form>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </details>
              )}
            </article>
          );
        })}
      </section>

      {/* Form añadir punto manual */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm print:hidden">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Añadir punto manual
        </p>
        <form action={añadir} className="grid gap-3 sm:grid-cols-7">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="pieza_modulo_id">Pieza</Label>
            <select id="pieza_modulo_id" name="pieza_modulo_id" required className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">— elegir —</option>
              {(piezas ?? []).map((p) => (
                <option key={p.id} value={p.id}>{p.nombre} ({p.largo_mm}×{p.ancho_mm})</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tipo">Tipo</Label>
            <select id="tipo" name="tipo" defaultValue="otro" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              {TIPOS_TALADRO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cara">Cara</Label>
            <select id="cara" name="cara" defaultValue="lateral_izq" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              {CARAS_TALADRO.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="x_mm">X (mm)</Label><Input id="x_mm" name="x_mm" type="number" step="0.1" required /></div>
          <div className="space-y-1.5"><Label htmlFor="y_mm">Y (mm)</Label><Input id="y_mm" name="y_mm" type="number" step="0.1" required /></div>
          <div className="space-y-1.5"><Label htmlFor="diametro_mm">Ø (mm)</Label><Input id="diametro_mm" name="diametro_mm" type="number" step="0.1" defaultValue={5} /></div>
          <div className="space-y-1.5"><Label htmlFor="profundidad_mm">Prof.</Label><Input id="profundidad_mm" name="profundidad_mm" type="number" step="0.1" /></div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="pasante" /> Pasante</label>
          </div>
          <div className="space-y-1.5 sm:col-span-5"><Label htmlFor="notas">Notas</Label><Input id="notas" name="notas" /></div>
          <div className="sm:col-span-7"><Button type="submit"><Plus className="h-4 w-4" /> Añadir</Button></div>
        </form>
      </section>
    </div>
  );
}
