import Link from "next/link";
import { Suspense } from "react";
import { Hammer, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ToastFromSearchParams } from "../catalogo/shared";
import { ESTADOS_PIEZA, type EstadoPieza } from "@/lib/tipos/piezas";
import { moverPiezaProduccion } from "./actions";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const ESTADO_COLOR: Record<EstadoPieza, string> = {
  pendiente: "bg-muted text-muted-foreground",
  cortada: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  producida: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  entregada: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

type PiezaKanban = {
  id: string;
  nombre: string;
  cantidad: number;
  largo_mm: number;
  ancho_mm: number;
  grosor_mm: number;
  estado: EstadoPieza;
  qr_code: string;
  modulos_armario: {
    armarios: {
      nombre: string;
      proyectos: {
        id: string;
        nombre: string;
        clientes: { nombre: string } | null;
        pedidos: { id: string; numero: string | null }[] | null;
      } | null;
    } | null;
  } | null;
};

export default async function ProduccionPage({
  searchParams,
}: {
  searchParams: Promise<{ pedido?: string }>;
}) {
  const { pedido: pedidoId } = await searchParams;
  const s = await createClient();

  const { data: pedidos } = await s
    .from("pedidos")
    .select("id, numero, estado, proyectos(nombre, clientes(nombre))")
    .in("estado", ["pendiente", "en_fabricacion", "fabricado"])
    .order("created_at", { ascending: false });

  let q = s
    .from("piezas_modulo")
    .select(
      "id, nombre, cantidad, largo_mm, ancho_mm, grosor_mm, estado, qr_code, modulos_armario!inner(armarios!inner(nombre, proyectos!inner(id, nombre, clientes(nombre), pedidos(id, numero))))",
    );

  if (pedidoId) {
    const { data: ped } = await s.from("pedidos").select("proyecto_id").eq("id", pedidoId).maybeSingle();
    if (ped?.proyecto_id) q = q.eq("modulos_armario.armarios.proyectos.id", ped.proyecto_id);
  } else {
    const { data: pedsPorId } = await s
      .from("pedidos")
      .select("proyecto_id")
      .in("estado", ["pendiente", "en_fabricacion", "fabricado"]);
    const proyectosIds = (pedsPorId ?? []).map((x) => x.proyecto_id as string);
    if (proyectosIds.length === 0) proyectosIds.push("00000000-0000-0000-0000-000000000000");
    q = q.in("modulos_armario.armarios.proyectos.id", proyectosIds);
  }

  const { data: piezas } = await q.returns<PiezaKanban[]>();

  const porEstado: Record<EstadoPieza, PiezaKanban[]> = {
    pendiente: [],
    cortada: [],
    producida: [],
    entregada: [],
  };
  for (const p of piezas ?? []) porEstado[p.estado].push(p);

  const total = (piezas ?? []).length;

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-8">
      <Suspense>
        <ToastFromSearchParams />
      </Suspense>

      <PageHeader
        eyebrow="Taller"
        title="Producción"
        description="Kanban de piezas por estado. Las piezas se generan al explosionar cada armario."
      />

      <form className="mt-6 flex flex-wrap items-end gap-3">
        <div className="min-w-[320px] flex-1 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Filtrar por pedido activo</label>
          <select
            name="pedido"
            defaultValue={pedidoId ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/15"
          >
            <option value="">Todos los pedidos activos</option>
            {(pedidos ?? []).map((p) => {
              const pp = p as unknown as { id: string; numero: string | null; proyectos: { nombre: string; clientes: { nombre: string } | null } | null };
              return (
                <option key={pp.id} value={pp.id}>
                  {pp.numero ?? "(sin nº)"} · {pp.proyectos?.nombre ?? "?"} · {pp.proyectos?.clientes?.nombre ?? "?"}
                </option>
              );
            })}
          </select>
        </div>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      {total === 0 ? (
        <div className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <EmptyState
            icon={Hammer}
            title="Sin piezas en producción"
            description="Entra en un armario y pulsa Explosionar para generar las piezas del proyecto."
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {ESTADOS_PIEZA.map((est) => {
            const piezasCol = porEstado[est.value];
            return (
              <section key={est.value} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <header className="flex items-center justify-between border-b border-border px-4 py-3">
                  <h2 className="text-sm font-bold tracking-tight">{est.label}</h2>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${ESTADO_COLOR[est.value]}`}>
                    {piezasCol.length}
                  </span>
                </header>
                <div className="flex max-h-[65vh] flex-col gap-2 overflow-auto p-3">
                  {piezasCol.length === 0 ? (
                    <p className="py-10 text-center text-xs text-muted-foreground/60">—</p>
                  ) : (
                    piezasCol.map((p) => {
                      const proy = p.modulos_armario?.armarios?.proyectos;
                      return (
                        <article
                          key={p.id}
                          className="rounded-xl border border-border bg-background p-3 transition hover:border-foreground/20 hover:shadow-sm"
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="truncate text-sm font-semibold">{p.nombre}</p>
                            <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                              ×{p.cantidad}
                            </span>
                          </div>
                          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                            {p.largo_mm} × {p.ancho_mm} × {p.grosor_mm}
                          </p>
                          <p className="mt-1 truncate text-[11px] text-muted-foreground">
                            {proy?.nombre ?? "?"} · {p.modulos_armario?.armarios?.nombre ?? "?"}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {ESTADOS_PIEZA.filter((e) => e.value !== p.estado).map((e) => {
                              const mover = async () => {
                                "use server";
                                await moverPiezaProduccion(p.id, e.value, pedidoId);
                              };
                              return (
                                <form key={e.value} action={mover}>
                                  <button
                                    type="submit"
                                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition hover:opacity-80 ${ESTADO_COLOR[e.value]}`}
                                  >
                                    → {e.label}
                                  </button>
                                </form>
                              );
                            })}
                          </div>
                          <Link
                            href={`/t/${p.qr_code}`}
                            target="_blank"
                            className="mt-2 inline-flex items-center gap-1 text-[10px] text-muted-foreground transition hover:text-foreground"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Ver QR
                          </Link>
                        </article>
                      );
                    })
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
