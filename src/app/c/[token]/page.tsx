import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ESTADOS_PROYECTO, type EstadoProyecto } from "@/lib/tipos/proyectos";
import { ESTADOS_PRESUPUESTO, formatEur, type EstadoPresupuesto } from "@/lib/tipos/presupuestos";
import { ESTADOS_PEDIDO, type EstadoPedido } from "@/lib/tipos/pedidos";
import { ESTADOS_PIEZA, type EstadoPieza } from "@/lib/tipos/piezas";

export const dynamic = "force-dynamic";

const EST_PROY = Object.fromEntries(ESTADOS_PROYECTO.map((e) => [e.value, e]));
const EST_PRES = Object.fromEntries(ESTADOS_PRESUPUESTO.map((e) => [e.value, e]));
const EST_PED = Object.fromEntries(ESTADOS_PEDIDO.map((e) => [e.value, e]));
const EST_PIEZA = Object.fromEntries(ESTADOS_PIEZA.map((e) => [e.value, e]));

// UUID v4 regex (básico) para validar el token antes de consultar.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PortalClientePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!UUID_RE.test(token)) notFound();

  // Cliente service_role: se salta RLS; el filtrado lo hace el token único.
  const sb = createAdminClient();

  const { data: proyecto } = await sb
    .from("proyectos")
    .select("id, nombre, estado, notas, updated_at, clientes(nombre), empresas(nombre, config_empresa)")
    .eq("acceso_token", token)
    .maybeSingle();

  if (!proyecto) notFound();

  // Datos auxiliares
  const [armariosRes, presupuestoRes, pedidoRes] = await Promise.all([
    sb.from("armarios").select("id, nombre, ancho_total_mm, alto_total_mm, fondo_mm, modulos_armario(id, ancho_mm, alto_mm, fondo_mm, particiones_verticales, tipos_modulo(nombre), piezas_modulo(id, estado))").eq("proyecto_id", proyecto.id).order("orden"),
    sb.from("presupuestos").select("numero, estado, total_eur, fecha_emision, validez_dias").eq("proyecto_id", proyecto.id).in("estado", ["enviado", "aceptado"]).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    sb.from("pedidos").select("numero, estado, fecha_pedido, fecha_entrega_prevista").eq("proyecto_id", proyecto.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const armarios = (armariosRes.data ?? []) as unknown as {
    id: string; nombre: string; ancho_total_mm: number; alto_total_mm: number; fondo_mm: number;
    modulos_armario: { id: string; ancho_mm: number; alto_mm: number; fondo_mm: number; particiones_verticales: number; tipos_modulo: { nombre: string } | null; piezas_modulo: { id: string; estado: EstadoPieza }[] }[];
  }[];

  // @ts-expect-error relacion
  const empresa = proyecto.empresas as { nombre: string; config_empresa: Record<string, string | undefined> } | null;
  const cfg = (empresa?.config_empresa ?? {}) as Record<string, string | undefined>;

  const estProy = EST_PROY[proyecto.estado as EstadoProyecto];

  // Total piezas y resumen producción
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
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 py-8 dark:from-zinc-950 dark:to-black">
      <div className="mx-auto max-w-2xl px-4">
        {/* Cabecera empresa */}
        <div className="mb-4 text-center">
          {cfg.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cfg.logo_url} alt={empresa?.nombre ?? "Empresa"} className="mx-auto h-14 object-contain" />
          ) : null}
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400">
            Portal cliente · GPTO
          </p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">{empresa?.nombre ?? ""}</p>
        </div>

        {/* Tarjeta proyecto */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-zinc-400 dark:text-zinc-600">Proyecto</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                {proyecto.nombre}
              </h1>
              {/* @ts-expect-error relacion */}
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{proyecto.clientes?.nombre ?? ""}</p>
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${estProy?.color ?? ""}`}>
              {estProy?.label ?? proyecto.estado}
            </span>
          </div>

          {/* Progreso de producción */}
          {piezasTotales > 0 ? (
            <div className="mt-5">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-medium text-zinc-600 dark:text-zinc-400">Progreso de fabricación</span>
                <span className="font-mono font-semibold">{pctProduccion}%</span>
              </div>
              <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: `${pctProduccion}%` }} />
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[10px]">
                {ESTADOS_PIEZA.map((e) => (
                  <div key={e.value} className={`rounded-lg px-2 py-1 ${e.color}`}>
                    <div className="font-mono font-bold">{piezasPorEstado[e.value]}</div>
                    <div className="text-[9px] opacity-90">{e.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Pedido */}
        {pedido ? (
          <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Pedido</p>
                <p className="mt-0.5 font-mono text-lg font-semibold">{pedido.numero ?? "—"}</p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${EST_PED[pedido.estado]?.color ?? ""}`}>
                {EST_PED[pedido.estado]?.label ?? pedido.estado}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Fecha pedido</p>
                <p className="font-mono">{new Date(pedido.fecha_pedido).toLocaleDateString("es-ES")}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Entrega prevista</p>
                <p className="font-mono">{pedido.fecha_entrega_prevista ? new Date(pedido.fecha_entrega_prevista).toLocaleDateString("es-ES") : "—"}</p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Presupuesto */}
        {presupuesto ? (
          <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Presupuesto</p>
                <p className="mt-0.5 font-mono text-lg font-semibold">{presupuesto.numero ?? "—"}</p>
                {presupuesto.fecha_emision ? (
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    Emitido {new Date(presupuesto.fecha_emision).toLocaleDateString("es-ES")} · Válido {presupuesto.validez_dias} días
                  </p>
                ) : null}
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${EST_PRES[presupuesto.estado]?.color ?? ""}`}>
                {EST_PRES[presupuesto.estado]?.label ?? presupuesto.estado}
              </span>
            </div>
            <p className="mt-3 font-mono text-2xl font-semibold">{formatEur(Number(presupuesto.total_eur))}</p>
          </div>
        ) : null}

        {/* Armarios y módulos */}
        {armarios.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Armarios ({armarios.length})
            </h2>
            <div className="space-y-3">
              {armarios.map((a) => {
                const totalP = (a.modulos_armario ?? []).reduce((acc, m) => acc + (m.piezas_modulo?.length ?? 0), 0);
                const hechas = (a.modulos_armario ?? []).reduce((acc, m) => acc + (m.piezas_modulo ?? []).filter((p) => p.estado !== "pendiente").length, 0);
                return (
                  <div key={a.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                    <div className="flex items-baseline justify-between">
                      <p className="font-medium">{a.nombre}</p>
                      <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                        {a.ancho_total_mm}×{a.alto_total_mm}×{a.fondo_mm} mm
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                      {(a.modulos_armario ?? []).length} módulo(s) · {totalP} pieza(s) · {hechas}/{totalP} avanzadas
                    </p>
                    {(a.modulos_armario ?? []).length > 0 ? (
                      <ul className="mt-2 space-y-1">
                        {(a.modulos_armario ?? []).map((m) => (
                          <li key={m.id} className="flex items-center justify-between text-xs">
                            <span className="text-zinc-700 dark:text-zinc-300">
                              {m.tipos_modulo?.nombre ?? "Módulo"}
                              {m.particiones_verticales > 1 ? (
                                <span className="ml-1 text-amber-600 dark:text-amber-400">
                                  ({m.particiones_verticales}× apilado)
                                </span>
                              ) : null}
                            </span>
                            <span className="font-mono text-zinc-500 dark:text-zinc-400">
                              {m.ancho_mm}×{m.alto_mm}
                            </span>
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
        {(cfg.empresa_telefono || cfg.empresa_email) ? (
          <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              ¿Alguna duda?
            </h2>
            <div className="space-y-1 text-sm">
              {cfg.empresa_telefono ? (
                <p><a href={`tel:${cfg.empresa_telefono}`} className="font-medium text-zinc-900 hover:underline dark:text-zinc-100">📞 {cfg.empresa_telefono}</a></p>
              ) : null}
              {cfg.empresa_email ? (
                <p><a href={`mailto:${cfg.empresa_email}`} className="font-medium text-zinc-900 hover:underline dark:text-zinc-100">✉ {cfg.empresa_email}</a></p>
              ) : null}
            </div>
          </div>
        ) : null}

        <p className="mt-6 text-center text-[10px] text-zinc-400 dark:text-zinc-600">
          Enlace privado · No compartas este link públicamente
        </p>
      </div>
    </main>
  );
}
