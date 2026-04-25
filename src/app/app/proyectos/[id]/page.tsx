import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Trash2,
  Receipt,
  Scissors,
  Home,
  Plus,
  Boxes,
  Calendar,
  Lock,
  Unlock,
  Pencil,
  User,
  Building2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  crearArmario,
  eliminarProyecto,
  reabrirProyecto,
} from "../actions";
import { ToastFromSearchParams } from "../../catalogo/shared";
import { ESTADOS_PROYECTO, esProyectoCerrado, type Armario, type Proyecto } from "@/lib/tipos/proyectos";
import type { Cliente } from "@/lib/tipos/cliente";
import { nombreCompletoCliente } from "@/lib/tipos/cliente";
import { PageHeader } from "@/components/page-header";
import { AsistenteIA } from "./asistente-ia";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { CopiarEnlaceCliente } from "./copiar-enlace-cliente";

export const dynamic = "force-dynamic";

const LBL = Object.fromEntries(ESTADOS_PROYECTO.map((e) => [e.value, e]));

const ESTADO_VARIANT: Record<string, string> = {
  borrador: "bg-muted text-muted-foreground",
  presupuestado: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  confirmado: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  en_fabricacion: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  entregado: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  cancelado: "bg-red-500/10 text-red-700 dark:text-red-400",
};

const TIPO_ESTANCIA_ICON: Record<string, string> = {
  vestidor: "Vestidor",
  armario_pasillo: "Armario pasillo",
  cocina: "Cocina",
  comedor: "Comedor",
  dormitorio: "Dormitorio",
  bano: "Baño",
  entrada: "Entrada",
  salon: "Salón",
  despacho: "Despacho",
  otro: "Otro",
};

export default async function DetalleProyectoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await createClient();

  const { data: proyecto } = await s.from("proyectos").select("*").eq("id", id).maybeSingle<Proyecto>();
  if (!proyecto) notFound();

  const [{ data: cliente }, { data: armarios }, { data: estancias }] = await Promise.all([
    s.from("clientes").select("id, nombre, apellido1, apellido2, es_empresa").eq("id", proyecto.cliente_id).maybeSingle<Pick<Cliente, "id" | "nombre" | "apellido1" | "apellido2" | "es_empresa">>(),
    s.from("armarios").select("*").eq("proyecto_id", id).order("orden").returns<Armario[]>(),
    s.from("estancias").select("id, nombre, tipo, orden, largo_mm, ancho_mm, alto_mm").eq("proyecto_id", id).order("orden"),
  ]);

  const cerrado = esProyectoCerrado(proyecto);
  const hayArmarios = (armarios ?? []).length > 0;

  const del = async () => { "use server"; await eliminarProyecto(id); };
  const addArm = async (fd: FormData) => { "use server"; await crearArmario(id, fd); };
  const addEst = async (fd: FormData) => {
    "use server";
    const { crearEstancia } = await import("../estancias-actions");
    await crearEstancia(id, fd);
  };
  const reabrir = async () => { "use server"; await reabrirProyecto(id); };

  const armariosPorEstancia = new Map<string, Armario[]>();
  for (const a of armarios ?? []) {
    const arr = armariosPorEstancia.get(a.estancia_id) ?? [];
    arr.push(a);
    armariosPorEstancia.set(a.estancia_id, arr);
  }

  const clienteLabel = cliente ? nombreCompletoCliente(cliente) : "—";

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Suspense>
        <ToastFromSearchParams />
      </Suspense>

      <Link
        href="/app/proyectos"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a proyectos
      </Link>

      <PageHeader
        eyebrow="Proyecto"
        title={proyecto.nombre}
        description={
          cliente ? (
            <span className="inline-flex items-center gap-1.5">
              {cliente.es_empresa ? <Building2 className="h-3.5 w-3.5 text-blue-600" /> : <User className="h-3.5 w-3.5" />}
              <Link href={`/app/clientes/${cliente.id}`} className="transition hover:text-foreground hover:underline">
                {clienteLabel}
              </Link>
            </span>
          ) : undefined
        }
        actions={
          <>
            <Badge className={`${ESTADO_VARIANT[proyecto.estado] ?? ""} border-0`}>
              {LBL[proyecto.estado]?.label}
            </Badge>
            {cerrado && (
              <Badge className="border-0 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                <Lock className="mr-1 h-3 w-3" />
                Cerrado
              </Badge>
            )}
            <Link
              href={`/app/proyectos/${id}/agenda`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Calendar className="h-3.5 w-3.5" />
              Agenda
            </Link>
            {/* Acciones dependientes de armarios: solo si hay al menos uno */}
            {hayArmarios && !cerrado && (
              <>
                <form action={async () => {
                  "use server";
                  const { regenerarPiezasProyectoYRedirect } = await import("../piezas-actions");
                  await regenerarPiezasProyectoYRedirect(id, `/app/proyectos/${id}`);
                }}>
                  <Button type="submit" variant="outline" size="sm">
                    <Boxes className="h-3.5 w-3.5" />
                    Explosionar piezas
                  </Button>
                </form>
                <form action={async () => {
                  "use server";
                  const { regenerarPiezasProyecto } = await import("../piezas-actions");
                  const { ejecutarNesting } = await import("../nesting-actions");
                  try { await regenerarPiezasProyecto(id); } catch {}
                  await ejecutarNesting(id);
                }}>
                  <Button type="submit" size="sm" className="bg-gradient-to-br from-blue-500 to-cyan-400 text-white hover:shadow-lg hover:shadow-blue-500/30">
                    <Scissors className="h-3.5 w-3.5" />
                    Optimizar tableros
                  </Button>
                </form>
                <form action={async () => { "use server"; const { crearBorrador } = await import("../presupuestos-actions"); await crearBorrador(id); }}>
                  <Button type="submit" variant="outline" size="sm">
                    <Receipt className="h-3.5 w-3.5" />
                    Calcular presupuesto
                  </Button>
                </form>
                <Link
                  href={`/app/proyectos/${id}/nesting`}
                  className={buttonVariants({ size: "sm" })}
                >
                  <Scissors className="h-3.5 w-3.5" />
                  Corte tableros
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </>
            )}
            {!cerrado && (
              <Link
                href={`/app/proyectos/${id}/editar`}
                className={buttonVariants({ variant: "ghost", size: "sm" })}
                title="Editar datos del proyecto"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Link>
            )}
            {!cerrado && (
              <form action={del} className="inline">
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  title="Eliminar proyecto"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </form>
            )}
          </>
        }
      />

      {cerrado && (
        <section className="mt-6 flex items-start gap-3 rounded-2xl border border-zinc-300 bg-zinc-100/70 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
            <Lock className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Proyecto cerrado — modo solo lectura</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {proyecto.cerrado_at
                ? `Cerrado el ${new Date(proyecto.cerrado_at).toLocaleDateString("es-ES")}.`
                : `Estado ${LBL[proyecto.estado]?.label.toLowerCase()}.`}{" "}
              Para añadir una ampliación o corregir algo, reábrelo.
            </p>
          </div>
          <form action={reabrir}>
            <Button type="submit" size="sm" variant="outline">
              <Unlock className="h-3.5 w-3.5" />
              Reabrir para ampliación
            </Button>
          </form>
        </section>
      )}

      {/* Estancias y armarios — primer bloque, es lo primero que interesa */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-baseline justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Estructura
            </p>
            <h2 className="mt-0.5 text-lg font-bold tracking-tight">
              Estancias {estancias?.length ? `· ${estancias.length}` : ""}
              {armarios?.length ? ` · ${armarios.length} armarios` : ""}
            </h2>
          </div>
        </div>

        {(estancias ?? []).length === 0 ? (
          <EmptyState
            icon={Home}
            title="Sin estancias todavía"
            description="Crea la primera estancia (ej: Vestidor, Dormitorio, Cocina) para empezar."
          />
        ) : (
          <div className="space-y-3">
            {(estancias ?? []).map((e) => {
              const arms = armariosPorEstancia.get(e.id as string) ?? [];
              return (
                <div key={e.id as string} className="overflow-hidden rounded-xl border border-border">
                  <div className="flex items-center justify-between bg-muted/30 px-4 py-3">
                    <Link
                      href={`/app/proyectos/${id}/estancias/${e.id}`}
                      className="flex items-center gap-2.5 font-semibold transition hover:text-foreground"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-background text-muted-foreground ring-1 ring-border">
                        <Home className="h-3.5 w-3.5" />
                      </div>
                      <span>{e.nombre as string}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        · {TIPO_ESTANCIA_ICON[e.tipo as string] ?? (e.tipo as string)}
                      </span>
                    </Link>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-2 py-0.5 text-xs font-medium ring-1 ring-border">
                      <Boxes className="h-3 w-3" />
                      <span className="font-mono font-semibold">{arms.length}</span>
                    </span>
                  </div>
                  {arms.length > 0 ? (
                    <ul className="grid gap-2 p-3 sm:grid-cols-2">
                      {arms.map((a) => (
                        <li key={a.id}>
                          <Link
                            href={`/app/proyectos/${id}/armarios/${a.id}`}
                            className="flex items-baseline justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm transition hover:border-foreground/20 hover:shadow-sm"
                          >
                            <span className="font-semibold">{a.nombre}</span>
                            <span className="font-mono text-xs text-muted-foreground">
                              {a.ancho_total_mm}×{a.alto_total_mm}×{a.fondo_mm}
                              <span className="ml-2 rounded bg-muted px-1 text-[10px]">
                                {a.tipo_instalacion === "empotrado" ? "emp." : "suel."}
                              </span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-4 py-3 text-xs text-muted-foreground">
                      Sin armarios en esta estancia. Entra y añade el primero.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Nueva estancia */}
        {!cerrado && <form action={addEst} className="mt-5 grid gap-3 rounded-xl border border-dashed border-border bg-muted/20 p-4 sm:grid-cols-6">
          <div className="space-y-1.5 sm:col-span-3">
            <label className="block text-xs font-semibold text-muted-foreground">Nueva estancia *</label>
            <input
              name="nombre"
              required
              placeholder="Vestidor del dormitorio"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/15"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-3">
            <label className="block text-xs font-semibold text-muted-foreground">Tipo</label>
            <select
              name="tipo"
              defaultValue="vestidor"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/15"
            >
              {Object.entries(TIPO_ESTANCIA_ICON).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Largo (mm)</label>
            <input name="largo_mm" type="number" min="100" defaultValue={4000} className="flex h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-sm shadow-xs" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ancho (mm)</label>
            <input name="ancho_mm" type="number" min="100" defaultValue={3000} className="flex h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-sm shadow-xs" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Alto (mm)</label>
            <input name="alto_mm" type="number" min="100" defaultValue={2500} className="flex h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-sm shadow-xs" />
          </div>
          <div className="sm:col-span-6">
            <Button type="submit" className="h-9">
              <Plus className="h-4 w-4" />
              Crear estancia y entrar
            </Button>
          </div>
        </form>}

        {/* Armario directo (compat) */}
        {!cerrado && <details className="mt-4 text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium transition hover:text-foreground">
            Crear armario directo (se añade a la primera estancia)
          </summary>
          <form action={addArm} className="mt-3 grid gap-3 rounded-xl border border-dashed border-border bg-muted/20 p-4 sm:grid-cols-5">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="block text-[11px] font-semibold uppercase tracking-wider">Nombre</label>
              <input
                name="nombre"
                defaultValue="Armario"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
            {["ancho_total_mm", "alto_total_mm", "fondo_mm"].map((n, i) => (
              <div key={n} className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-wider">
                  {["Ancho", "Alto", "Fondo"][i]}
                </label>
                <input
                  name={n}
                  type="number"
                  required
                  defaultValue={[2400, 2400, 600][i]}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm font-mono"
                />
              </div>
            ))}
            <div className="sm:col-span-5">
              <Button type="submit" size="sm">
                <Plus className="h-3.5 w-3.5" />
                Añadir armario
              </Button>
            </div>
          </form>
        </details>}
      </section>

      {/* Asistente IA — sólo cuando hay al menos una estancia para tener contexto */}
      {(estancias ?? []).length > 0 && (
        <div className="mt-6">
          <AsistenteIA proyectoId={id} />
        </div>
      )}

      {/* Portal cliente — discreto, botón copiar */}
      <section className="mt-6">
        <CopiarEnlaceCliente token={proyecto.acceso_token} />
      </section>
    </div>
  );
}
