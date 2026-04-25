import { Suspense } from "react";
import { ArrowRight, ArrowLeftRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ToastFromSearchParams } from "../catalogo/shared";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";

type Movimiento = {
  id: string;
  cantidad: number;
  origen_tipo: string;
  destino_tipo: string;
  motivo: string | null;
  fecha: string;
  pieza: { nombre: string; modulos_armario: { armarios: { nombre: string; proyectos: { nombre: string } } } } | null;
  tablero: { id: string; ancho_mm: number; alto_mm: number; referencias_tablero: { materiales: { nombre: string } } } | null;
  origen_almacen: { nombre: string } | null;
  origen_furgoneta: { nombre: string } | null;
  origen_proveedor: { nombre: string } | null;
  destino_almacen: { nombre: string } | null;
  destino_furgoneta: { nombre: string } | null;
  destino_proyecto: { nombre: string } | null;
};

function nombreUbicacion(tipo: string, alm: { nombre: string } | null, fur: { nombre: string } | null, prov: { nombre: string } | null, prj: { nombre: string } | null): string {
  if (tipo === "proveedor") return prov?.nombre ?? "Proveedor";
  if (tipo === "almacen")   return alm?.nombre ?? "Almacén";
  if (tipo === "furgoneta") return fur?.nombre ?? "Furgoneta";
  if (tipo === "obra")      return prj?.nombre ? `Obra · ${prj.nombre}` : "Obra";
  if (tipo === "consumida") return "Consumida (montada)";
  return tipo;
}

export default async function MovimientosPage() {
  const s = await createClient();
  const { data } = await s
    .from("movimientos_stock")
    .select(`
      id, cantidad, origen_tipo, destino_tipo, motivo, fecha,
      pieza:pieza_modulo_id(nombre, modulos_armario(armarios(nombre, proyectos(nombre)))),
      tablero:tablero_fisico_id(id, ancho_mm, alto_mm, referencias_tablero(materiales(nombre))),
      origen_almacen:origen_almacen_id(nombre),
      origen_furgoneta:origen_furgoneta_id(nombre),
      origen_proveedor:origen_proveedor_id(nombre),
      destino_almacen:destino_almacen_id(nombre),
      destino_furgoneta:destino_furgoneta_id(nombre),
      destino_proyecto:destino_proyecto_id(nombre)
    `)
    .order("fecha", { ascending: false })
    .limit(200)
    .returns<Movimiento[]>();

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <PageHeader
        eyebrow="Stock"
        title="Movimientos"
        description="Bitácora cronológica de cada cambio de ubicación de piezas y tableros."
      />

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {!data || data.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={ArrowLeftRight} title="Sin movimientos" description="Los movimientos se generan al recibir un pedido o trasladar piezas entre ubicaciones." />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {data.map((m) => {
              const recurso = m.pieza
                ? `${m.pieza.nombre} (${m.pieza.modulos_armario?.armarios?.proyectos?.nombre ?? "—"})`
                : m.tablero
                ? `Tablero ${m.tablero.referencias_tablero?.materiales?.nombre ?? "?"} ${m.tablero.ancho_mm}×${m.tablero.alto_mm}`
                : "Recurso";
              const origen = nombreUbicacion(m.origen_tipo, m.origen_almacen, m.origen_furgoneta, m.origen_proveedor, null);
              const destino = nombreUbicacion(m.destino_tipo, m.destino_almacen, m.destino_furgoneta, null, m.destino_proyecto);
              return (
                <li key={m.id} className="grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-[1fr_auto_1fr_auto]">
                  <div>
                    <p className="text-sm font-semibold">{recurso}</p>
                    {m.motivo && <p className="text-xs text-muted-foreground">{m.motivo}</p>}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="rounded bg-muted px-2 py-0.5">{origen}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="rounded bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-700 dark:text-emerald-400">{destino}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(m.fecha).toLocaleString("es-ES")}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
