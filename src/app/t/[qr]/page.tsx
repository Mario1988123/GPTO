import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { ESTADOS_PIEZA, type EstadoPieza, type PiezaModulo } from "@/lib/tipos/piezas";

export const dynamic = "force-dynamic";

const EST = Object.fromEntries(ESTADOS_PIEZA.map((e) => [e.value, e]));
const ORDEN: EstadoPieza[] = ["pendiente", "cortada", "producida", "entregada"];

type Trace = PiezaModulo & {
  modulos_armario: {
    nombre_override: string | null;
    tipos_modulo: { nombre: string } | null;
    armarios: {
      nombre: string;
      proyectos: {
        nombre: string;
        clientes: { nombre: string } | null;
        empresas: { nombre: string; config_empresa: Record<string, unknown> } | null;
        pedidos: { numero: string | null; fecha_entrega_prevista: string | null }[] | null;
      } | null;
    } | null;
  } | null;
};

type Evento = {
  id: string;
  estado_anterior: string | null;
  estado_nuevo: string;
  created_at: string;
};

export default async function TracePage({ params }: { params: Promise<{ qr: string }> }) {
  const { qr } = await params;
  const sb = createPublicClient();

  const { data } = await sb
    .from("piezas_modulo")
    .select(
      "id, nombre, cantidad, largo_mm, ancho_mm, grosor_mm, lados_con_canto, respeta_veta, qr_code, estado, created_at, modulos_armario(nombre_override, tipos_modulo(nombre), armarios(nombre, proyectos(nombre, clientes(nombre), empresas(nombre, config_empresa), pedidos(numero, fecha_entrega_prevista))))",
    )
    .eq("qr_code", qr)
    .maybeSingle<Trace>();

  if (!data) notFound();

  const { data: eventos } = await sb
    .from("pieza_eventos")
    .select("id, estado_anterior, estado_nuevo, created_at")
    .eq("pieza_modulo_id", data.id)
    .order("created_at");

  const est = EST[data.estado as EstadoPieza];
  const currentIdx = ORDEN.indexOf(data.estado as EstadoPieza);
  const empresa = data.modulos_armario?.armarios?.proyectos?.empresas;
  const cfg = (empresa?.config_empresa ?? {}) as Record<string, string | undefined>;
  const pedido = data.modulos_armario?.armarios?.proyectos?.pedidos?.[0];
  const entregaPrevista = pedido?.fecha_entrega_prevista
    ? new Date(pedido.fecha_entrega_prevista).toLocaleDateString("es-ES")
    : null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 py-8 dark:from-zinc-950 dark:to-black">
      <div className="mx-auto max-w-md px-4">
        {/* Cabecera empresa */}
        <div className="mb-4 text-center">
          {cfg.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cfg.logo_url} alt={empresa?.nombre ?? "Empresa"} className="mx-auto h-14 object-contain" />
          ) : null}
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400">
            Trazabilidad GPTO
          </p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">{empresa?.nombre ?? ""}</p>
        </div>

        {/* Tarjeta principal */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-center">
            <p className="text-xs uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
              {data.modulos_armario?.nombre_override ?? data.modulos_armario?.tipos_modulo?.nombre ?? "—"}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {data.nombre}
            </h1>
            <div className="mt-3 flex items-center justify-center">
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${est?.color ?? ""}`}>
                ● {est?.label ?? data.estado}
              </span>
            </div>
          </div>

          {/* Timeline visual */}
          <div className="mt-6">
            <div className="relative flex items-start justify-between">
              {ORDEN.map((e, i) => {
                const hecho = i <= currentIdx;
                const actual = i === currentIdx;
                const label = EST[e].label;
                return (
                  <div key={e} className="relative z-10 flex flex-1 flex-col items-center">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition ${
                        actual
                          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                          : hecho
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-zinc-200 bg-white text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-600"
                      }`}
                    >
                      {hecho && !actual ? "✓" : i + 1}
                    </div>
                    <span className={`mt-2 text-[10px] ${hecho ? "font-semibold text-zinc-900 dark:text-zinc-50" : "text-zinc-400 dark:text-zinc-600"}`}>
                      {label}
                    </span>
                  </div>
                );
              })}
              <div className="absolute top-4 left-[12%] right-[12%] h-0.5 -translate-y-1/2 bg-zinc-200 dark:bg-zinc-800">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${(currentIdx / (ORDEN.length - 1)) * 100}%` }}
                />
              </div>
            </div>
            {entregaPrevista ? (
              <p className="mt-5 text-center text-xs text-zinc-600 dark:text-zinc-400">
                Entrega prevista: <strong>{entregaPrevista}</strong>
              </p>
            ) : null}
          </div>
        </div>

        {/* Detalles */}
        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Detalles</h2>
          <dl className="divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
            <Row k="Dimensiones" v={`${data.largo_mm} × ${data.ancho_mm} × ${data.grosor_mm} mm`} />
            <Row k="Unidades" v={String(data.cantidad)} />
            <Row k="Canto" v={data.lados_con_canto === "ninguno" ? "Sin canto" : data.lados_con_canto.replace(/_/g, " ")} />
            <Row k="Veta" v={data.respeta_veta ? "Respeta veta" : "Libre"} />
            <Row k="Armario" v={data.modulos_armario?.armarios?.nombre ?? "—"} />
            <Row k="Proyecto" v={data.modulos_armario?.armarios?.proyectos?.nombre ?? "—"} />
            <Row k="Cliente" v={data.modulos_armario?.armarios?.proyectos?.clientes?.nombre ?? "—"} />
            {pedido?.numero ? <Row k="Pedido" v={pedido.numero} /> : null}
          </dl>
        </div>

        {/* Historial */}
        {(eventos ?? []).length > 0 ? (
          <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Historial</h2>
            <ol className="relative space-y-3 border-l border-zinc-200 pl-4 dark:border-zinc-800">
              {((eventos ?? []) as Evento[]).slice().reverse().map((ev) => {
                const estEv = EST[ev.estado_nuevo as EstadoPieza];
                return (
                  <li key={ev.id} className="relative">
                    <span className="absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-white bg-zinc-400 dark:border-zinc-900" />
                    <p className="text-xs">
                      <span className="font-semibold">{estEv?.label ?? ev.estado_nuevo}</span>
                      {ev.estado_anterior
                        ? <span className="text-zinc-400"> · desde {EST[ev.estado_anterior as EstadoPieza]?.label ?? ev.estado_anterior}</span>
                        : <span className="text-zinc-400"> · creada</span>}
                    </p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      {new Date(ev.created_at).toLocaleString("es-ES")}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : null}

        {/* Contacto */}
        {(cfg.empresa_telefono || cfg.empresa_email) ? (
          <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Contacto</h2>
            <div className="space-y-1 text-sm">
              {cfg.empresa_telefono ? (
                <p><a href={`tel:${cfg.empresa_telefono}`} className="font-medium text-zinc-900 hover:underline dark:text-zinc-100">{cfg.empresa_telefono}</a></p>
              ) : null}
              {cfg.empresa_email ? (
                <p><a href={`mailto:${cfg.empresa_email}`} className="font-medium text-zinc-900 hover:underline dark:text-zinc-100">{cfg.empresa_email}</a></p>
              ) : null}
              {cfg.empresa_direccion ? (
                <p className="text-xs text-zinc-600 dark:text-zinc-400">{cfg.empresa_direccion}</p>
              ) : null}
            </div>
          </div>
        ) : null}

        <p className="mt-6 text-center text-[10px] font-mono text-zinc-400 dark:text-zinc-600">
          QR: {data.qr_code}
        </p>
      </div>
    </main>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{k}</dt>
      <dd className="text-right font-medium text-zinc-900 dark:text-zinc-100">{v}</dd>
    </div>
  );
}
