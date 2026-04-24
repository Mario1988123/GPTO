import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Plus, Trash2, Home } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  actualizarEstancia,
  crearArmarioEnEstancia,
  eliminarEstancia,
} from "../../../estancias-actions";
import {
  crearAbertura,
  eliminarAbertura,
  guardarGeometriaPoligono,
} from "../../../estancia-geometria-actions";
import { ToastFromSearchParams } from "../../../../catalogo/shared";
import { TIPOS_ESTANCIA, TIPOS_INSTALACION, type Estancia } from "@/lib/tipos/estancias";
import type {
  Abertura,
  Armario,
  EstanciaGeometria,
  Proyecto,
} from "@/lib/tipos/proyectos";
import { Plano2D } from "./plano-2d";
import { EstanciaEditor, AberturasEditor } from "./estancia-editor";
import { Estancia3DLazy as Estancia3D } from "./estancia-3d-lazy";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const TIPO_LBL = Object.fromEntries(TIPOS_ESTANCIA.map((t) => [t.value, t]));

export default async function DetalleEstanciaPage({
  params,
}: {
  params: Promise<{ id: string; estanciaId: string }>;
}) {
  const { id: proyectoId, estanciaId } = await params;
  const s = await createClient();

  const [
    { data: proyecto },
    { data: estancia },
    { data: armarios },
    { data: geometria },
    { data: aberturas },
  ] = await Promise.all([
    s.from("proyectos").select("*").eq("id", proyectoId).maybeSingle<Proyecto>(),
    s.from("estancias").select("*").eq("id", estanciaId).maybeSingle<Estancia>(),
    s.from("armarios").select("*").eq("estancia_id", estanciaId).order("orden").returns<Armario[]>(),
    s.from("estancia_geometria").select("*").eq("estancia_id", estanciaId).maybeSingle<EstanciaGeometria>(),
    s.from("aberturas").select("*").eq("estancia_id", estanciaId).order("orden").returns<Abertura[]>(),
  ]);

  if (!proyecto || !estancia) notFound();

  const updEst = async (fd: FormData) => { "use server"; await actualizarEstancia(proyectoId, estanciaId, fd); };
  const delEst = async () => { "use server"; await eliminarEstancia(proyectoId, estanciaId); };
  const addArm = async (fd: FormData) => { "use server"; await crearArmarioEnEstancia(proyectoId, estanciaId, fd); };

  const tipoInfo = TIPO_LBL[estancia.tipo];

  // Geometría fallback si no existe: rectangular con largo_mm / ancho_mm
  const puntosEfectivos = geometria?.puntos?.length
    ? geometria.puntos
    : [
        { x: 0, y: 0 },
        { x: estancia.largo_mm ?? 4000, y: 0 },
        { x: estancia.largo_mm ?? 4000, y: estancia.ancho_mm ?? 3000 },
        { x: 0, y: estancia.ancho_mm ?? 3000 },
      ];
  const altoParedEfectivo = geometria?.alto_pared_mm ?? estancia.alto_mm ?? 2500;

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
        eyebrow={tipoInfo?.label ?? estancia.tipo}
        title={estancia.nombre}
        description={
          estancia.largo_mm || estancia.ancho_mm || estancia.alto_mm
            ? `${estancia.largo_mm ?? "—"} × ${estancia.ancho_mm ?? "—"} × ${estancia.alto_mm ?? "—"} mm`
            : undefined
        }
        actions={<Badge variant="secondary">{tipoInfo?.emoji} {tipoInfo?.label}</Badge>}
      />

      {/* Datos básicos */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Ficha</p>
          <h2 className="mt-0.5 text-lg font-bold tracking-tight">Datos básicos</h2>
        </div>
        <form action={updEst} className="grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Nombre *</label>
            <input name="nombre" required defaultValue={estancia.nombre} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs" />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Tipo</label>
            <select name="tipo" defaultValue={estancia.tipo} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs">
              {TIPOS_ESTANCIA.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.emoji} {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-4 space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Notas</label>
            <textarea name="notas" rows={2} defaultValue={estancia.notas ?? ""} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs" />
          </div>
          <p className="sm:col-span-4 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-400">
            Las dimensiones de la estancia (largo, ancho, alto) se configuran en el <strong>plano</strong> de abajo. Son la única fuente de verdad.
          </p>
          <div className="sm:col-span-4 flex items-center gap-3 border-t border-border pt-4">
            <Button type="submit">Guardar</Button>
            <form action={delEst} className="inline">
              <Button type="submit" variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/5">
                <Trash2 className="h-3.5 w-3.5" />
                Eliminar estancia
              </Button>
            </form>
          </div>
        </form>
      </section>

      {/* Editor de geometría (client) */}
      <EstanciaEditor
        proyectoId={proyectoId}
        estanciaId={estanciaId}
        geometria={geometria ?? null}
        aberturas={aberturas ?? []}
        onGuardarPoligono={async (puntos, alto_pared_mm) => {
          "use server";
          await guardarGeometriaPoligono(proyectoId, estanciaId, puntos, alto_pared_mm);
        }}
      />

      {/* Aberturas */}
      <AberturasEditor
        aberturas={aberturas ?? []}
        numParedes={puntosEfectivos.length}
        onCrear={async (fd) => {
          "use server";
          await crearAbertura(proyectoId, estanciaId, fd);
        }}
        onEliminar={async (id) => {
          "use server";
          await eliminarAbertura(proyectoId, estanciaId, id);
        }}
      />

      {/* Plano 3D */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-baseline justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Vista 3D
            </p>
            <h2 className="mt-0.5 text-lg font-bold tracking-tight">Estancia con armarios</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Paredes · puertas · ventanas · armarios colocados según plano 2D
          </p>
        </div>
        <Estancia3D
          puntos={puntosEfectivos}
          alto_pared_mm={altoParedEfectivo}
          aberturas={aberturas ?? []}
          armarios={(armarios ?? []).map((a) => ({
            id: a.id,
            nombre: a.nombre,
            ancho_total_mm: a.ancho_total_mm,
            alto_total_mm: a.alto_total_mm,
            fondo_mm: a.fondo_mm,
            plano_x_mm: a.plano_x_mm,
            plano_y_mm: a.plano_y_mm,
            plano_rotacion: a.plano_rotacion,
          }))}
        />
      </section>

      {/* Armarios */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-5 flex items-baseline justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Muebles
            </p>
            <h2 className="mt-0.5 text-lg font-bold tracking-tight">
              Armarios · {(armarios ?? []).length}
            </h2>
          </div>
        </div>
        {(armarios ?? []).length === 0 ? (
          <p className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
            Sin armarios. Añade el primero abajo.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(armarios ?? []).map((a) => (
              <li key={a.id}>
                <Link
                  href={`/app/proyectos/${proyectoId}/armarios/${a.id}`}
                  className="group block rounded-xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate font-semibold">{a.nombre}</p>
                    <Badge
                      className={
                        a.tipo_instalacion === "empotrado"
                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {a.tipo_instalacion === "empotrado" ? "empotrado" : "suelto"}
                    </Badge>
                  </div>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {a.ancho_total_mm} × {a.alto_total_mm} × {a.fondo_mm} mm
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                    Plano X:{a.plano_x_mm} Y:{a.plano_y_mm} · rot {a.plano_rotacion}°
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <form action={addArm} className="mt-5 grid gap-3 rounded-xl border border-dashed border-border bg-muted/20 p-4 sm:grid-cols-6">
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Tipo instalación</label>
            <select
              name="tipo_instalacion"
              defaultValue="suelto"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs"
            >
              {TIPOS_INSTALACION.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <NumIn name="margen_tapeta_mm" label="Tapeta (mm)" defaultValue={5} min={0} max={50} />
          <div className="sm:col-span-3 space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Nombre</label>
            <input name="nombre" defaultValue="Armario" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs" />
          </div>
          <NumIn name="ancho_total_mm" label="Ancho (mm) *" defaultValue={2400} required />
          <NumIn name="alto_total_mm" label="Alto (mm) *" defaultValue={2400} required />
          <NumIn name="fondo_mm" label="Fondo (mm) *" defaultValue={600} required />
          <div className="sm:col-span-6">
            <Button type="submit" size="sm">
              <Plus className="h-3.5 w-3.5" />
              Añadir armario
            </Button>
          </div>
        </form>
      </section>

      {/* Plano 2D legacy */}
      {estancia.largo_mm && estancia.ancho_mm && (armarios ?? []).length > 0 ? (
        <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-baseline justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Vista 2D
              </p>
              <h2 className="mt-0.5 text-lg font-bold tracking-tight">Plano en planta</h2>
            </div>
            <Link
              href="#"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Home className="h-3.5 w-3.5" />
              Editar
            </Link>
          </div>
          <Plano2D
            proyectoId={proyectoId}
            estanciaId={estanciaId}
            largoMm={estancia.largo_mm}
            anchoMm={estancia.ancho_mm}
            armarios={armarios ?? []}
          />
        </section>
      ) : null}
    </div>
  );
}

function NumIn({
  name,
  label,
  defaultValue,
  required,
  min,
  max,
}: {
  name: string;
  label: string;
  defaultValue?: number;
  required?: boolean;
  min?: number;
  max?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <input
        name={name}
        type="number"
        min={min}
        max={max}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-sm shadow-xs"
      />
    </div>
  );
}
