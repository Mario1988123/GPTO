import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { ESTADOS_PIEZA, type EstadoPieza, type PiezaModulo } from "@/lib/tipos/piezas";

export const dynamic = "force-dynamic";

const EST = Object.fromEntries(ESTADOS_PIEZA.map((e) => [e.value, e]));

type Trace = PiezaModulo & {
  modulos_armario: {
    nombre_override: string | null;
    tipos_modulo: { nombre: string } | null;
    armarios: { nombre: string; proyectos: { nombre: string; clientes: { nombre: string } | null } | null } | null;
  } | null;
};

export default async function TracePage({ params }: { params: Promise<{ qr: string }> }) {
  const { qr } = await params;
  const sb = createPublicClient();
  const { data } = await sb
    .from("piezas_modulo")
    .select(
      "id, nombre, cantidad, largo_mm, ancho_mm, grosor_mm, lados_con_canto, respeta_veta, qr_code, estado, created_at, modulos_armario(nombre_override, tipos_modulo(nombre), armarios(nombre, proyectos(nombre, clientes(nombre))))",
    )
    .eq("qr_code", qr)
    .maybeSingle<Trace>();

  if (!data) notFound();

  const est = EST[data.estado as EstadoPieza];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-zinc-50 to-zinc-100 px-6 py-10 dark:from-zinc-950 dark:to-black">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-zinc-400 dark:text-zinc-600">GPTO · Trazabilidad</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {data.nombre}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {data.modulos_armario?.nombre_override ?? data.modulos_armario?.tipos_modulo?.nombre ?? "—"}
          </p>
        </div>

        <div className="flex items-center justify-center">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${est?.color ?? ""}`}>
            {est?.label ?? data.estado}
          </span>
        </div>

        <dl className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 text-sm dark:divide-zinc-800 dark:border-zinc-800">
          <Row k="Dimensiones" v={`${data.largo_mm} × ${data.ancho_mm} × ${data.grosor_mm} mm`} />
          <Row k="Cantidad" v={String(data.cantidad)} />
          <Row k="Canto" v={data.lados_con_canto === "ninguno" ? "—" : data.lados_con_canto} />
          <Row k="Respeta veta" v={data.respeta_veta ? "Sí" : "No"} />
          <Row k="Armario" v={data.modulos_armario?.armarios?.nombre ?? "—"} />
          <Row k="Proyecto" v={data.modulos_armario?.armarios?.proyectos?.nombre ?? "—"} />
          <Row k="Cliente" v={data.modulos_armario?.armarios?.proyectos?.clientes?.nombre ?? "—"} />
        </dl>

        <p className="text-center text-[10px] font-mono text-zinc-400 dark:text-zinc-600">
          QR: {data.qr_code}
        </p>
      </div>
    </main>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
      <dt className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{k}</dt>
      <dd className="text-right font-medium text-zinc-900 dark:text-zinc-100">{v}</dd>
    </div>
  );
}
