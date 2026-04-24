import { notFound } from "next/navigation";
import { Sparkles, Phone, Mail, Lock, Ruler } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { ESTADOS_PROYECTO, type EstadoProyecto } from "@/lib/tipos/proyectos";
import { ESTADOS_PRESUPUESTO, formatEur, type EstadoPresupuesto } from "@/lib/tipos/presupuestos";
import { ESTADOS_PEDIDO, type EstadoPedido } from "@/lib/tipos/pedidos";
import { ESTADOS_PIEZA, type EstadoPieza } from "@/lib/tipos/piezas";

export const dynamic = "force-dynamic";

const EST_PROY = Object.fromEntries(ESTADOS_PROYECTO.map((e) => [e.value, e]));
const EST_PRES = Object.fromEntries(ESTADOS_PRESUPUESTO.map((e) => [e.value, e]));
const EST_PED = Object.fromEntries(ESTADOS_PEDIDO.map((e) => [e.value, e]));

const ESTADO_PROY_VARIANT: Record<string, string> = {
  borrador: "bg-muted text-muted-foreground",
  presupuestado: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  confirmado: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  en_fabricacion: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  entregado: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  cancelado: "bg-red-500/10 text-red-700 dark:text-red-400",
};
const ESTADO_PED_VARIANT: Record<string, string> = {
  pendiente: "bg-muted text-muted-foreground",
  en_fabricacion: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  fabricado: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  entregado: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  cancelado: "bg-red-500/10 text-red-700 dark:text-red-400",
};
const ESTADO_PRES_VARIANT: Record<string, string> = {
  borrador: "bg-muted text-muted-foreground",
  enviado: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  aceptado: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  rechazado: "bg-red-500/10 text-red-700 dark:text-red-400",
  caducado: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};
const ESTADO_PIEZA_VARIANT: Record<string, string> = {
  pendiente: "bg-muted text-muted-foreground",
  cortada: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  producida: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  entregada: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PortalClientePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!UUID_RE.test(token)) notFound();

  const sb = createAdminClient();

  const { data: proyecto } = await sb
    .from("proyectos")
    .select("id, nombre, estado, notas, updated_at, clientes(nombre), empresas(nombre, config_empresa)")
    .eq("acceso_token", token)
    .maybeSingle();

  if (!proyecto) notFound();

  const [armariosRes, presupuestoRes, pedidoRes] = await Promise.all([
    sb.from("armarios").select("id, nombre, ancho_total_mm, alto_total_mm, fondo_mm, modulos_armario(id, ancho_mm, alto_mm, fondo_mm, particiones_verticales, tipos_modulo(nombre), piezas_modulo(id, estado))").eq("proyecto_id", proyecto.id).order("orden"),
    sb.from("presupuestos").select("numero, estado, total_eur, fecha_emision, validez_dias").eq("proyecto_id", proyecto.id).in("estado", ["enviado", "aceptado"]).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    sb.from("pedidos").select("numero, estado, fecha_pedido, fecha_entrega_prevista").eq("proyecto_id", proyecto.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const armarios = (armariosRes.data ?? []) as unknown as {
    id: string;
    nombre: string;
    ancho_total_mm: number;
    alto_total_mm: number;
    fondo_mm: number;
    modulos_armario: { id: string; ancho_mm: number; alto_mm: number; fondo_mm: number; particiones_verticales: number; tipos_modulo: { nombre: string } | null; piezas_modulo: { id: string; estado: EstadoPieza }[] }[];
  }[];

  // @ts-expect-error relacion
  const empresa = proyecto.empresas as { nombre: string; config_empresa: Record<string, string | undefined> } | null;
  const cfg = (empresa?.config_empresa ?? {}) as Record<string, string | undefined>;

  const estProy = EST_PROY[proyecto.estado as EstadoProyecto];

  let piezasTotales = 0;
  const piezasPorEstado: Record<EstadoPieza, number> = { pendiente: 0, cortada: 0, producida: 0, entregada: 0 };
  for (const a of armarios) {
    for (const m of a.modulos_armario ?? []) {
      for (const p of m.piezas_modulo ?? []) {
        piezasTotales++;
        piezasPorEstado[p.estado]++;
      }
    }
  }
  const pctProduccion = piezasTotales > 0
    ? Math.round(((piezasPorEstado.cortada + piezasPorEstado.producida + piezasPorEstado.entregada) / piezasTotales) * 100)
    : 0;

  const presupuesto = presupuestoRes.data as
    | { numero: string | null; estado: EstadoPresupuesto; total_eur: number; fecha_emision: string | null; validez_dias: number }
    | null;
  const pedido = pedidoRes.data as
    | { numero: string | null; estado: EstadoPedido; fecha_pedido: string; fecha_entrega_prevista: string | null }
    | null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-muted/30 via-background to-background py-10">
      <div className="mx-auto max-w-2xl px-4">
        {/* Cabecera empresa */}
        <div className="mb-6 flex flex-col items-center text-center">
          {cfg.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cfg.logo_url} alt={empresa?.nombre ?? "Empresa"} className="h-14 object-contain" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-foreground text-background shadow-lg">
              <Sparkles className="h-5 w-5" />
            </div>
          )}
          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
            Portal cliente
          </p>
          <p className="mt-0.5 text-sm font-semibold">{empresa?.nombre ?? ""}</p>
        </div>

        {/* Tarjeta proyecto */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
          <div className="bg-gradient-to-br from-foreground via-foreground to-sidebar-primary p-6 text-background">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">Proyecto</p>
                <h1 className="mt-1 truncate text-2xl font-bold tracking-tight">{proyecto.nombre}</h1>
                {/* @ts-expect-error relacion */}
                <p className="mt-1 text-sm opacity-80">{proyecto.clientes?.nombre ?? ""}</p>
              </div>
              <span
                className={`shrink-0 rounded-full bg-background/20 px-3 py-1 text-xs font-bold backdrop-blur-sm`}
              >
                {estProy?.label ?? proyecto.estado}
              </span>
            </div>
          </div>

          {/* Progreso */}
          {piezasTotales > 0 ? (
            <div className="p-6">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-bold">Progreso de fabricación</span>
                <span className="font-mono text-xl font-bold tabular-nums">{pctProduccion}%</span>
              </div>
              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700"
                  style={{ width: `${pctProduccion}%` }}
                />
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {ESTADOS_PIEZA.map((e) => (
                  <div
                    key={e.value}
                    className={`rounded-lg border-0 px-2 py-2 text-center ${ESTADO_PIEZA_VARIANT[e.value] ?? ""}`}
                  >
                    <div className="font-mono text-lg font-bold tabular-nums">{piezasPorEstado[e.value]}</div>
                    <div className="text-[9px] font-semibold opacity-80">{e.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6" />
          )}
        </div>

        {/* Pedido */}
        {pedido ? (
          <div className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Pedido</p>
                <p className="mt-0.5 font-mono text-lg font-bold">{pedido.numero ?? "—"}</p>
              </div>
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO_PED_VARIANT[pedido.estado] ?? ""}`}>
                {EST_PED[pedido.estado]?.label ?? pedido.estado}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Fecha</p>
                <p className="mt-0.5 font-mono font-semibold">{new Date(pedido.fecha_pedido).toLocaleDateString("es-ES")}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Entrega prevista</p>
                <p className="mt-0.5 font-mono font-semibold">
                  {pedido.fecha_entrega_prevista ? new Date(pedido.fecha_entrega_prevista).toLocaleDateString("es-ES") : "—"}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Presupuesto */}
        {presupuesto ? (
          <div className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Presupuesto</p>
                <p className="mt-0.5 font-mono text-lg font-bold">{presupuesto.numero ?? "—"}</p>
                {presupuesto.fecha_emision ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Emitido {new Date(presupuesto.fecha_emision).toLocaleDateString("es-ES")} · Válido {presupuesto.validez_dias} días
                  </p>
                ) : null}
              </div>
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO_PRES_VARIANT[presupuesto.estado] ?? ""}`}>
                {EST_PRES[presupuesto.estado]?.label ?? presupuesto.estado}
              </span>
            </div>
            <p className="mt-4 font-mono text-3xl font-bold tracking-tight tabular-nums">
              {formatEur(Number(presupuesto.total_eur))}
            </p>
          </div>
        ) : null}

        {/* Armarios */}
        {armarios.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Armarios · {armarios.length}
              </h2>
              <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              {armarios.map((a) => {
                const totalP = (a.modulos_armario ?? []).reduce((acc, m) => acc + (m.piezas_modulo?.length ?? 0), 0);
                const hechas = (a.modulos_armario ?? []).reduce((acc, m) => acc + (m.piezas_modulo ?? []).filter((p) => p.estado !== "pendiente").length, 0);
                return (
                  <div key={a.id} className="rounded-xl border border-border bg-muted/30 p-4">
                    <div className="flex items-baseline justify-between">
                      <p className="font-semibold">{a.nombre}</p>
                      <span className="font-mono text-xs text-muted-foreground">
                        {a.ancho_total_mm}×{a.alto_total_mm}×{a.fondo_mm} mm
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {(a.modulos_armario ?? []).length} módulos · {totalP} piezas ·{" "}
                      <span className="font-semibold text-foreground">{hechas}/{totalP} avanzadas</span>
                    </p>
                    {(a.modulos_armario ?? []).length > 0 ? (
                      <ul className="mt-3 space-y-1 border-t border-border pt-3">
                        {(a.modulos_armario ?? []).map((m) => (
                          <li key={m.id} className="flex items-center justify-between text-xs">
                            <span>
                              {m.tipos_modulo?.nombre ?? "Módulo"}
                              {m.particiones_verticales > 1 ? (
                                <span className="ml-1 text-amber-700 dark:text-amber-400">
                                  ({m.particiones_verticales}× apilado)
                                </span>
                              ) : null}
                            </span>
                            <span className="font-mono text-muted-foreground">{m.ancho_mm}×{m.alto_mm}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Contacto */}
        {cfg.empresa_telefono || cfg.empresa_email ? (
          <div className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              ¿Alguna duda?
            </h2>
            <div className="space-y-2 text-sm">
              {cfg.empresa_telefono ? (
                <a
                  href={`tel:${cfg.empresa_telefono}`}
                  className="flex items-center gap-2 rounded-lg border border-border p-3 font-semibold transition hover:bg-muted/50"
                >
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {cfg.empresa_telefono}
                </a>
              ) : null}
              {cfg.empresa_email ? (
                <a
                  href={`mailto:${cfg.empresa_email}`}
                  className="flex items-center gap-2 rounded-lg border border-border p-3 font-semibold transition hover:bg-muted/50"
                >
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {cfg.empresa_email}
                </a>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/80">
          <Lock className="h-3 w-3" />
          Enlace privado · No compartas este link
        </div>
      </div>
    </main>
  );
}
