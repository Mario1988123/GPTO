import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Trash2, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  actualizarArmario,
  anadirModulo,
  eliminarArmario,
  eliminarModulo,
  moverModulo,
} from "../../../actions";
import { ToastFromSearchParams } from "../../../../catalogo/shared";
import { AnadirModuloForm } from "./anadir-modulo";
import { EditorArmarioPro } from "./editor-armario-pro";
import { ARPreview } from "./ar-preview";
import { ProponerDisenoForm } from "./proponer-diseno";
import {
  crearSubelemento,
  actualizarSubelemento,
  eliminarSubelemento,
  moverPosicionModulo,
  actualizarLedModulo,
  generarCajones,
} from "../../../subelementos-actions";
import { cambiarEstadoPieza, regenerarPiezasArmario } from "../../../piezas-actions";
import { actualizarDatosInstalacion } from "../../../estancias-actions";
import { aplicarDisenoPropuesto } from "../../../diseno-actions";
import { TIPOS_INSTALACION } from "@/lib/tipos/estancias";
import type { Armario, ModuloArmario, ModuloSubelemento, Proyecto } from "@/lib/tipos/proyectos";
import type { CategoriaModulo } from "@/lib/tipos/tipos_modulo";
import { ESTADOS_PIEZA, type EstadoPieza } from "@/lib/tipos/piezas";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type ModuloVista = ModuloArmario & {
  tipos_modulo: { nombre: string; categoria: string | null } | null;
  modulo_subelementos: ModuloSubelemento[] | null;
};

const PALETA = [
  "#b5d3ff",
  "#c3e9c8",
  "#fdd98a",
  "#e7cff8",
  "#fdb7bd",
  "#afe8f0",
  "#d6ed9f",
  "#f3b9e7",
];

export default async function ConfiguradorArmarioPage({
  params,
}: {
  params: Promise<{ id: string; armarioId: string }>;
}) {
  const { id: proyectoId, armarioId } = await params;
  const s = await createClient();

  const { data: armario } = await s.from("armarios").select("*").eq("id", armarioId).maybeSingle<Armario>();
  if (!armario) notFound();

  const [{ data: proyecto }, { data: modulos }, { data: tipos }, { data: refs }, { data: piezasRaw }] = await Promise.all([
    s.from("proyectos").select("*").eq("id", proyectoId).maybeSingle<Proyecto>(),
    s.from("modulos_armario")
      .select("*, tipos_modulo(nombre, categoria), modulo_subelementos(*)")
      .eq("armario_id", armarioId)
      .order("orden")
      .returns<ModuloVista[]>(),
    s.from("tipos_modulo")
      .select("id, nombre, ancho_default_mm, alto_default_mm, fondo_default_mm, categoria, es_estandar")
      .eq("activo", true)
      .order("categoria")
      .order("nombre"),
    s.from("referencias_tablero")
      .select("id, grosor_mm, materiales(nombre), acabados(nombre)")
      .eq("activo", true)
      .order("grosor_mm"),
    s.from("piezas_modulo")
      .select("*, modulos_armario!inner(armario_id, orden, nombre_override, tipos_modulo(nombre))")
      .eq("modulos_armario.armario_id", armarioId)
      .order("orden"),
  ]);

  if (!proyecto) notFound();

  const refOpciones = (refs ?? []).map((r) => ({
    id: r.id as string,
    // @ts-expect-error relacion
    label: `${r.materiales?.nombre ?? "?"} · ${r.acabados?.nombre ?? "?"} · ${r.grosor_mm} mm`,
  }));

  const { data: empCfg } = await s.from("empresas").select("config_empresa").limit(1).maybeSingle<{ config_empresa: Record<string, number> }>();
  const tabUtilAltoMm = Number(empCfg?.config_empresa?.tablero_util_alto_cm ?? 120) * 10;

  const anchoOcupado = (modulos ?? []).reduce((acc, m) => acc + m.ancho_mm, 0);
  const anchoLibre = armario.ancho_total_mm - anchoOcupado;

  // Calcular layout automático si todos tienen posicion_x=0 y posicion_y=0 (legacy)
  const todosCero = (modulos ?? []).every((m) => m.posicion_x_mm === 0 && m.posicion_y_mm === 0);
  const modulosConPos = todosCero
    ? (() => {
        let x = 0;
        return (modulos ?? []).map((m) => {
          const entry = { ...m, posicion_x_mm: x, posicion_y_mm: 0 };
          x += m.ancho_mm;
          return entry;
        });
      })()
    : (modulos ?? []);

  const delArm = async () => { "use server"; await eliminarArmario(proyectoId, armarioId); };
  const addMod = async (fd: FormData) => { "use server"; await anadirModulo(proyectoId, armarioId, fd); };

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <nav className="mb-4 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Link href="/app/proyectos" className="inline-flex items-center gap-1 transition hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Proyectos
        </Link>
        <span>·</span>
        <Link href={`/app/proyectos/${proyectoId}`} className="transition hover:text-foreground">
          {proyecto.nombre}
        </Link>
      </nav>

      <PageHeader
        eyebrow="Editor de armario"
        title={armario.nombre}
        description={`Hueco ${armario.ancho_total_mm} × ${armario.alto_total_mm} × ${armario.fondo_mm} mm`}
        actions={
          <>
            <Badge variant="secondary">
              {armario.tipo_instalacion === "empotrado"
                ? `Empotrado · tapeta ${armario.margen_tapeta_mm} mm`
                : "Suelto"}
            </Badge>
          </>
        }
      />

      {/* Auto-diseño */}
      <section className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200/60 bg-emerald-50/40 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">Auto-diseño</p>
          <p className="mt-0.5 text-xs text-emerald-700/80 dark:text-emerald-400/80">
            Selecciona cuántos módulos estándar quieres (cajonera, colgador, zapatero...) y GPTO los encaja automáticamente.
          </p>
          <div className="mt-3">
            <ProponerDisenoForm
              ancho_armario_mm={armario.ancho_total_mm - (armario.tipo_instalacion === "empotrado" ? 2 * armario.margen_tapeta_mm : 0)}
              tipos={(tipos ?? []).filter((t) => (t as { es_estandar?: boolean }).es_estandar).map((t) => ({
                id: (t as { id: string }).id,
                nombre: (t as { nombre: string }).nombre,
                categoria: ((t as { categoria?: CategoriaModulo }).categoria ?? "otro") as CategoriaModulo,
                ancho_default_mm: (t as { ancho_default_mm: number }).ancho_default_mm,
                alto_default_mm: (t as { alto_default_mm: number }).alto_default_mm,
                fondo_default_mm: (t as { fondo_default_mm: number }).fondo_default_mm,
              }))}
              action={async (pl) => {
                "use server";
                await aplicarDisenoPropuesto(proyectoId, armarioId, pl);
              }}
            />
          </div>
        </div>
      </section>

      {/* Editor Pro 3D + Panel lateral */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Vista 3D
            </p>
            <h2 className="mt-0.5 text-lg font-bold tracking-tight">Editor interactivo</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Ocupado <span className="font-mono font-semibold text-foreground">{anchoOcupado} mm</span>
            {" · "}
            {anchoLibre >= 0 ? (
              <>
                Libre{" "}
                <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                  {anchoLibre} mm
                </span>
              </>
            ) : (
              <span className="font-mono font-semibold text-destructive">
                Exceso {Math.abs(anchoLibre)} mm
              </span>
            )}
          </p>
        </div>

        {modulosConPos.length === 0 ? (
          <div className="flex h-[400px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
            Añade módulos o usa Auto-diseño para empezar.
          </div>
        ) : (
          <EditorArmarioPro
            proyectoId={proyectoId}
            armarioId={armarioId}
            armario_ancho_mm={armario.ancho_total_mm}
            armario_alto_mm={armario.alto_total_mm}
            armario_fondo_mm={armario.fondo_mm}
            tipo_instalacion={armario.tipo_instalacion}
            margen_tapeta_mm={armario.margen_tapeta_mm}
            modulos={modulosConPos.map((m, i) => ({
              id: m.id,
              nombre: m.nombre_override ?? m.tipos_modulo?.nombre ?? "Módulo",
              ancho_mm: m.ancho_mm,
              alto_mm: m.alto_mm,
              fondo_mm: m.fondo_mm,
              posicion_x_mm: m.posicion_x_mm,
              posicion_y_mm: m.posicion_y_mm,
              particiones: m.particiones_verticales ?? 1,
              color: PALETA[i % PALETA.length],
              tiene_led_rebaje: m.tiene_led_rebaje ?? false,
              led_color_hex: m.led_color_hex ?? null,
              led_intensidad_lm_m: m.led_intensidad_lm_m ?? null,
              categoria: m.tipos_modulo?.categoria ?? null,
              subelementos: m.modulo_subelementos ?? [],
            }))}
            onMoverModulo={async (moduloId, x, y) => {
              "use server";
              await moverPosicionModulo(proyectoId, armarioId, moduloId, x, y);
            }}
            onActualizarLed={async (moduloId, fd) => {
              "use server";
              await actualizarLedModulo(proyectoId, armarioId, moduloId, fd);
            }}
            onCrearSubelemento={async (moduloId, fd) => {
              "use server";
              await crearSubelemento(proyectoId, armarioId, moduloId, fd);
            }}
            onActualizarSubelemento={async (subId, fd) => {
              "use server";
              await actualizarSubelemento(proyectoId, armarioId, subId, fd);
            }}
            onEliminarSubelemento={async (subId) => {
              "use server";
              await eliminarSubelemento(proyectoId, armarioId, subId);
            }}
            onGenerarCajones={async (moduloId, dist, n, alturas) => {
              "use server";
              await generarCajones(proyectoId, armarioId, moduloId, dist, n, alturas);
            }}
          />
        )}
      </section>

      {/* AR Preview */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Realidad aumentada</p>
          <h2 className="mt-0.5 text-lg font-bold tracking-tight">Previsualizar sobre foto</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Sube una foto de la pared o habitación y ajusta el armario 3D encima para enseñárselo al cliente.
          </p>
        </div>
        <ARPreview
          armario_ancho_mm={armario.ancho_total_mm}
          armario_alto_mm={armario.alto_total_mm}
          armario_fondo_mm={armario.fondo_mm}
          tipo_instalacion={armario.tipo_instalacion}
          margen_tapeta_mm={armario.margen_tapeta_mm}
          modulos={modulosConPos.map((m, i) => ({
            id: m.id,
            nombre: m.nombre_override ?? m.tipos_modulo?.nombre ?? "Módulo",
            ancho_mm: m.ancho_mm,
            alto_mm: m.alto_mm,
            fondo_mm: m.fondo_mm,
            posicion_x_mm: m.posicion_x_mm,
            posicion_y_mm: m.posicion_y_mm,
            particiones: m.particiones_verticales ?? 1,
            color: PALETA[i % PALETA.length],
            tiene_led_rebaje: m.tiene_led_rebaje ?? false,
            led_color_hex: m.led_color_hex ?? null,
            led_intensidad_lm_m: m.led_intensidad_lm_m ?? null,
            categoria: m.tipos_modulo?.categoria ?? null,
            subelementos: m.modulo_subelementos ?? [],
          }))}
        />
      </section>

      {/* Form editar armario */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Dimensiones</p>
          <h2 className="mt-0.5 text-lg font-bold tracking-tight">Hueco e instalación</h2>
        </div>
        <form
          action={async (fd: FormData) => {
            "use server";
            await actualizarDatosInstalacion(proyectoId, armarioId, fd);
          }}
          className="grid gap-4 sm:grid-cols-6"
        >
          <div className="space-y-1.5 sm:col-span-2">
            <label className="block text-xs font-semibold text-muted-foreground">Instalación</label>
            <select
              name="tipo_instalacion"
              defaultValue={armario.tipo_instalacion}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs"
            >
              {TIPOS_INSTALACION.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <Inp name="margen_tapeta_mm" label="Tapeta (mm)" type="number" min={0} max={50} defaultValue={armario.margen_tapeta_mm} hint="empotrado" />
          <Inp name="nombre" label="Nombre" defaultValue={armario.nombre} />
          <Inp name="ancho_total_mm" label="Ancho (mm)" type="number" defaultValue={armario.ancho_total_mm} required />
          <Inp name="alto_total_mm" label="Alto (mm)" type="number" defaultValue={armario.alto_total_mm} required />
          <Inp name="fondo_mm" label="Fondo (mm)" type="number" defaultValue={armario.fondo_mm} required />
          <div className="sm:col-span-6 flex items-center gap-3 border-t border-border pt-4">
            <Button type="submit">Guardar cambios</Button>
            <form action={delArm} className="inline">
              <Button
                type="submit"
                variant="outline"
                className="border-destructive/30 text-destructive hover:bg-destructive/5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Eliminar armario
              </Button>
            </form>
          </div>
        </form>
      </section>

      {/* Lista módulos */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-5 flex items-baseline justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Módulos</p>
            <h2 className="mt-0.5 text-lg font-bold tracking-tight">{modulos?.length ?? 0} módulos</h2>
          </div>
        </div>

        {(modulos ?? []).length === 0 ? (
          <p className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
            Sin módulos. Añade el primero abajo.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-semibold">#</th>
                  <th className="px-3 py-2 font-semibold">Tipo</th>
                  <th className="px-3 py-2 font-semibold">Dimensiones</th>
                  <th className="px-3 py-2 font-semibold">Posición</th>
                  <th className="px-3 py-2 font-semibold">Particiones</th>
                  <th className="px-3 py-2 font-semibold">Subelementos</th>
                  <th className="px-3 py-2 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(modulosConPos ?? []).map((m, i) => {
                  const up = async () => { "use server"; await moverModulo(proyectoId, armarioId, m.id, "arriba"); };
                  const down = async () => { "use server"; await moverModulo(proyectoId, armarioId, m.id, "abajo"); };
                  const del = async () => { "use server"; await eliminarModulo(proyectoId, armarioId, m.id); };
                  const subs = m.modulo_subelementos?.length ?? 0;
                  return (
                    <tr key={m.id}>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2 font-semibold">
                        {m.nombre_override ?? m.tipos_modulo?.nombre ?? "?"}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                        {m.ancho_mm}×{m.alto_mm}×{m.fondo_mm}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        X:{m.posicion_x_mm} Y:{m.posicion_y_mm}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {(m.particiones_verticales ?? 1) > 1 ? (
                          <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400">
                            {m.particiones_verticales}× apilado
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs font-mono">{subs}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <form action={up}>
                            <Button type="submit" variant="ghost" size="icon-xs" disabled={i === 0}>
                              ↑
                            </Button>
                          </form>
                          <form action={down}>
                            <Button type="submit" variant="ghost" size="icon-xs" disabled={i === (modulos?.length ?? 0) - 1}>
                              ↓
                            </Button>
                          </form>
                          <form action={del}>
                            <Button
                              type="submit"
                              variant="ghost"
                              size="icon-xs"
                              className="text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-5 rounded-xl border border-dashed border-border bg-muted/20 p-4">
          <h3 className="mb-3 text-sm font-bold tracking-tight">Añadir módulo</h3>
          <AnadirModuloForm
            action={addMod}
            tipos={tipos ?? []}
            referencias={refOpciones}
            alto_total_mm={armario.alto_total_mm}
            fondo_mm={armario.fondo_mm}
            tablero_util_alto_mm={tabUtilAltoMm}
          />
        </div>
      </section>

      {/* Piezas físicas */}
      {(() => {
        const regen = async () => {
          "use server";
          await regenerarPiezasArmario(proyectoId, armarioId);
        };
        const EST_PIEZA = Object.fromEntries(ESTADOS_PIEZA.map((e) => [e.value, e]));
        void cambiarEstadoPieza;
        return (
          <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Producción
                </p>
                <h2 className="mt-0.5 text-lg font-bold tracking-tight">
                  Piezas físicas · {piezasRaw?.length ?? 0}
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Generadas aplicando las fórmulas del tipo de módulo a las medidas reales.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {(piezasRaw?.length ?? 0) > 0 ? (
                  <a
                    href={`/api/piezas/armario/${armarioId}/etiquetas`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    🖨️ Etiquetas QR PDF
                  </a>
                ) : null}
                <form action={regen}>
                  <Button type="submit" size="sm" disabled={(modulos?.length ?? 0) === 0}>
                    {(piezasRaw?.length ?? 0) === 0 ? "Explosionar piezas" : "Regenerar piezas"}
                  </Button>
                </form>
              </div>
            </div>

            {(piezasRaw ?? []).length === 0 ? (
              <p className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
                No hay piezas calculadas. Pulsa <strong>Explosionar piezas</strong> para generarlas.
              </p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Módulo</th>
                      <th className="px-3 py-2 font-semibold">Pieza</th>
                      <th className="px-3 py-2 font-semibold">Ud.</th>
                      <th className="px-3 py-2 font-semibold">Dimensiones</th>
                      <th className="px-3 py-2 font-semibold">Estado</th>
                      <th className="px-3 py-2 font-semibold">QR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(piezasRaw ?? []).map((p) => {
                      const rel = (p as unknown as { modulos_armario?: { nombre_override: string | null; orden: number; tipos_modulo?: { nombre?: string } | null } }).modulos_armario;
                      const modNombre = rel?.nombre_override ?? rel?.tipos_modulo?.nombre ?? "?";
                      const modOrden = (rel?.orden ?? 0) + 1;
                      const est = EST_PIEZA[p.estado as EstadoPieza];
                      return (
                        <tr key={p.id}>
                          <td className="px-3 py-2 text-xs text-muted-foreground">#{modOrden} · {modNombre}</td>
                          <td className="px-3 py-2 font-semibold">{p.nombre}</td>
                          <td className="px-3 py-2 font-mono">{p.cantidad}</td>
                          <td className="px-3 py-2 font-mono text-xs">{p.largo_mm}×{p.ancho_mm}×{p.grosor_mm}</td>
                          <td className="px-3 py-2">
                            <Badge variant="secondary">{est?.label ?? p.estado}</Badge>
                          </td>
                          <td className="px-3 py-2">
                            <Link href={`/t/${p.qr_code}`} target="_blank" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
                              ver
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })()}
    </div>
  );
}

function Inp({
  name,
  label,
  hint,
  type = "text",
  defaultValue,
  required,
  min,
  max,
}: {
  name: string;
  label: string;
  hint?: string;
  type?: string;
  defaultValue?: string | number;
  required?: boolean;
  min?: number;
  max?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-muted-foreground">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        min={min}
        max={max}
        defaultValue={defaultValue}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-sm shadow-xs outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/15"
      />
      {hint ? <p className="text-[10px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
