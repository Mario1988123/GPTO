import { notFound } from "next/navigation";
import { Sparkles, Check, Phone, Mail, MapPin, Clock } from "lucide-react";
import { createPublicClient } from "@/lib/supabase/public";
import { ESTADOS_PIEZA, type EstadoPieza, type PiezaModulo } from "@/lib/tipos/piezas";

export const dynamic = "force-dynamic";

const EST = Object.fromEntries(ESTADOS_PIEZA.map((e) => [e.value, e]));
const ORDEN: EstadoPieza[] = ["pendiente", "cortada", "producida", "entregada"];

const ESTADO_VARIANT: Record<string, string> = {
  pendiente: "bg-muted text-muted-foreground",
  cortada: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  producida: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  entregada: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

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
    <main className="min-h-screen bg-gradient-to-b from-muted/30 via-background to-background py-10">
      <div className="mx-auto max-w-md px-4">
        {/* Cabecera */}
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
            Trazabilidad
          </p>
          <p className="mt-0.5 text-sm font-semibold">{empresa?.nombre ?? ""}</p>
        </div>

        {/* Tarjeta pieza */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
          <div className="bg-gradient-to-br from-foreground via-foreground to-sidebar-primary p-6 text-background">
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">
                {data.modulos_armario?.nombre_override ?? data.modulos_armario?.tipos_modulo?.nombre ?? "—"}
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight">{data.nombre}</h1>
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-background/20 px-3 py-1.5 text-xs font-bold backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-background/60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-background" />
                </span>
                {est?.label ?? data.estado}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="p-6">
            <div className="relative flex items-start justify-between">
              {ORDEN.map((e, i) => {
                const hecho = i <= currentIdx;
                const actual = i === currentIdx;
                const label = EST[e].label;
                return (
                  <div key={e} className="relative z-10 flex flex-1 flex-col items-center">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition ${
                        actual
                          ? `${ESTADO_VARIANT[e] ?? ""} ring-2 ring-foreground`
                          : hecho
                            ? "bg-emerald-500 text-white"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {hecho && !actual ? <Check className="h-4 w-4" /> : i + 1}
                    </div>
                    <span className={`mt-2 text-center text-[10px] ${hecho ? "font-semibold" : "text-muted-foreground"}`}>
                      {label}
                    </span>
                  </div>
                );
              })}
              <div className="absolute top-[18px] left-[12%] right-[12%] h-0.5 -translate-y-1/2 bg-muted">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700"
                  style={{ width: `${(currentIdx / (ORDEN.length - 1)) * 100}%` }}
                />
              </div>
            </div>
            {entregaPrevista ? (
              <div className="mt-6 flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Entrega prevista: <strong className="font-mono">{entregaPrevista}</strong>
              </div>
            ) : null}
          </div>
        </div>

        {/* Detalles */}
        <div className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Detalles</h2>
          <dl className="divide-y divide-border text-sm">
            <Row k="Dimensiones" v={`${data.largo_mm} × ${data.ancho_mm} × ${data.grosor_mm} mm`} mono />
            <Row k="Unidades" v={String(data.cantidad)} mono />
            <Row k="Canto" v={data.lados_con_canto === "ninguno" ? "Sin canto" : data.lados_con_canto.replace(/_/g, " ")} />
            <Row k="Veta" v={data.respeta_veta ? "Respeta veta" : "Libre"} />
            <Row k="Armario" v={data.modulos_armario?.armarios?.nombre ?? "—"} />
            <Row k="Proyecto" v={data.modulos_armario?.armarios?.proyectos?.nombre ?? "—"} />
            <Row k="Cliente" v={data.modulos_armario?.armarios?.proyectos?.clientes?.nombre ?? "—"} />
            {pedido?.numero ? <Row k="Pedido" v={pedido.numero} mono /> : null}
          </dl>
        </div>

        {/* Historial */}
        {(eventos ?? []).length > 0 ? (
          <div className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Historial</h2>
            <ol className="relative space-y-4 border-l-2 border-border pl-4">
              {((eventos ?? []) as Evento[]).slice().reverse().map((ev) => {
                const estEv = EST[ev.estado_nuevo as EstadoPieza];
                return (
                  <li key={ev.id} className="relative">
                    <span className="absolute -left-[22px] top-1 h-3 w-3 rounded-full border-2 border-card bg-foreground" />
                    <p className="text-sm">
                      <span className="font-bold">{estEv?.label ?? ev.estado_nuevo}</span>
                      {ev.estado_anterior ? (
                        <span className="text-muted-foreground"> · desde {EST[ev.estado_anterior as EstadoPieza]?.label ?? ev.estado_anterior}</span>
                      ) : (
                        <span className="text-muted-foreground"> · creada</span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {new Date(ev.created_at).toLocaleString("es-ES")}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : null}

        {/* Contacto */}
        {cfg.empresa_telefono || cfg.empresa_email ? (
          <div className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Contacto</h2>
            <div className="space-y-2 text-sm">
              {cfg.empresa_telefono ? (
                <a href={`tel:${cfg.empresa_telefono}`} className="flex items-center gap-2 rounded-lg border border-border p-3 font-semibold transition hover:bg-muted/50">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {cfg.empresa_telefono}
                </a>
              ) : null}
              {cfg.empresa_email ? (
                <a href={`mailto:${cfg.empresa_email}`} className="flex items-center gap-2 rounded-lg border border-border p-3 font-semibold transition hover:bg-muted/50">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {cfg.empresa_email}
                </a>
              ) : null}
              {cfg.empresa_direccion ? (
                <div className="flex items-start gap-2 rounded-lg border border-border p-3 text-xs text-muted-foreground">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {cfg.empresa_direccion}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <p className="mt-8 text-center font-mono text-[10px] text-muted-foreground/70">
          QR · {data.qr_code}
        </p>
      </div>
    </main>
  );
}

function Row({ k, v, mono = false }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{k}</dt>
      <dd className={`text-right font-semibold ${mono ? "font-mono" : ""}`}>{v}</dd>
    </div>
  );
}
