import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Plus, AlertTriangle, Calendar, Trash2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ToastFromSearchParams } from "../../../catalogo/shared";
import {
  crearTarea,
  actualizarTarea,
  eliminarTarea,
  cambiarEstadoTarea,
  crearDependencia,
  eliminarDependencia,
  moverTareaDias,
  crearIncidencia,
  resolverIncidencia,
  actualizarFechaEntrega,
} from "../../tareas-actions";
import { Gantt } from "./gantt";
import {
  ESTADOS_TAREA,
  ESPECIALIDADES,
  TIPOS_INCIDENCIA,
  diasHastaHoy,
  type Tarea,
  type TareaDependencia,
  type Incidencia,
} from "@/lib/tipos/tareas";
import type { Proyecto, Armario } from "@/lib/tipos/proyectos";
import type { Estancia } from "@/lib/tipos/estancias";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

type Usuario = {
  id: string;
  nombre: string;
  rol: string;
  especialidades: string[];
};

export default async function AgendaProyectoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: proyectoId } = await params;
  const s = await createClient();

  const [{ data: proyecto }, { data: tareas }, { data: deps }, { data: incidencias }, { data: usuarios }, { data: estancias }, { data: armarios }] = await Promise.all([
    s.from("proyectos").select("*, clientes(nombre, email), usuarios!proyectos_interiorista_usuario_id_fkey(id, nombre)").eq("id", proyectoId).maybeSingle(),
    s.from("tareas").select("*").eq("proyecto_id", proyectoId).order("fecha_inicio_plan").returns<Tarea[]>(),
    s.from("tarea_dependencias").select("*").returns<TareaDependencia[]>(),
    s.from("incidencias").select("*").eq("proyecto_id", proyectoId).order("created_at", { ascending: false }).returns<Incidencia[]>(),
    s.from("usuarios").select("id, nombre, rol, especialidades").order("nombre").returns<Usuario[]>(),
    s.from("estancias").select("id, nombre, tipo").eq("proyecto_id", proyectoId).order("orden").returns<Estancia[]>(),
    s.from("armarios").select("id, nombre, estancia_id").eq("proyecto_id", proyectoId).order("orden").returns<Pick<Armario, "id" | "nombre" | "estancia_id">[]>(),
  ]);

  if (!proyecto) notFound();

  // Filtrar deps a las que pertenezcan al proyecto
  const tareasIds = new Set((tareas ?? []).map((t) => t.id));
  const depsProyecto = (deps ?? []).filter(
    (d) => tareasIds.has(d.tarea_id) && tareasIds.has(d.depende_de_tarea_id),
  );

  const fechaEntregaComp = proyecto.fecha_entrega_comprometida as string | null;
  const fechaEntregaAct = proyecto.fecha_entrega_actual as string | null;
  const retrasoDias =
    fechaEntregaComp && fechaEntregaAct
      ? Math.max(0, -diasHastaHoy(fechaEntregaAct) + diasHastaHoy(fechaEntregaComp))
      : 0;
  // Simplificación: diferencia entre actual y comprometida
  const diasRetrasoReal =
    fechaEntregaComp && fechaEntregaAct && fechaEntregaAct > fechaEntregaComp
      ? Math.round(
          (new Date(fechaEntregaAct + "T00:00:00Z").getTime() -
            new Date(fechaEntregaComp + "T00:00:00Z").getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0;
  void retrasoDias;

  const totalTareas = (tareas ?? []).length;
  const completadas = (tareas ?? []).filter((t) => t.estado === "completada").length;
  const progreso = totalTareas > 0 ? Math.round((completadas / totalTareas) * 100) : 0;

  const interiorista = (proyecto as unknown as { usuarios?: { id: string; nombre: string } | null }).usuarios ?? null;

  const actualizarEntrega = async (fd: FormData) => {
    "use server";
    await actualizarFechaEntrega(proyectoId, fd);
  };

  return (
    <div className="mx-auto max-w-7xl p-6 md:p-8 space-y-6">
      <Suspense><ToastFromSearchParams /></Suspense>

      <Link
        href={`/app/proyectos/${proyectoId}`}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver al proyecto
      </Link>

      <PageHeader
        eyebrow="Planificación"
        title={`Agenda · ${proyecto.nombre as string}`}
        description="Diagrama de Gantt con tareas, dependencias e incidencias"
        actions={
          <>
            <Badge variant="secondary">{completadas}/{totalTareas} completadas</Badge>
            {progreso > 0 ? <Badge className="bg-blue-500/10 text-blue-700">{progreso}%</Badge> : null}
            {proyecto.cerrado_at ? (
              <Badge className="bg-emerald-500/10 text-emerald-700">Cerrado</Badge>
            ) : null}
          </>
        }
      />

      {/* Cabecera con fechas + interiorista */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-500" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Entrega comprometida
            </p>
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900">
            {fechaEntregaComp ? new Date(fechaEntregaComp + "T00:00:00").toLocaleDateString("es-ES") : "—"}
          </p>
          <p className="mt-1 text-xs text-slate-500">Pactada con el cliente</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-500" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Entrega actual
            </p>
          </div>
          <p className={`mt-2 font-mono text-2xl font-bold ${diasRetrasoReal > 0 ? "text-red-600" : "text-emerald-600"}`}>
            {fechaEntregaAct ? new Date(fechaEntregaAct + "T00:00:00").toLocaleDateString("es-ES") : "—"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {diasRetrasoReal > 0
              ? `+${diasRetrasoReal} día${diasRetrasoReal === 1 ? "" : "s"} de retraso`
              : "En plazo"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Interiorista</p>
          <p className="mt-2 text-base font-bold text-slate-900">
            {interiorista?.nombre ?? "Sin asignar"}
          </p>
          <p className="mt-1 text-xs text-slate-500">Acceso solo lectura</p>
        </div>
      </div>

      {/* Form editar fechas + interiorista */}
      <form
        action={actualizarEntrega}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
      >
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-600">Fecha entrega comprometida</label>
          <input
            name="fecha_entrega_comprometida"
            type="date"
            defaultValue={fechaEntregaComp ?? ""}
            className="flex h-9 w-48 rounded-md border border-slate-200 bg-white px-3 text-sm shadow-sm"
          />
        </div>
        <div className="space-y-1 min-w-[220px]">
          <label className="block text-xs font-semibold text-slate-600">Interiorista</label>
          <select
            name="interiorista_usuario_id"
            defaultValue={interiorista?.id ?? ""}
            className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm shadow-sm"
          >
            <option value="">Sin asignar</option>
            {(usuarios ?? [])
              .filter((u) => u.rol === "interiorista")
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
          </select>
        </div>
        <Button type="submit" size="sm">Guardar</Button>
      </form>

      {/* Incidencias abiertas */}
      {(incidencias ?? []).filter((i) => !i.resuelta).length > 0 ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h2 className="font-bold text-amber-900">
              {(incidencias ?? []).filter((i) => !i.resuelta).length} incidencia{(incidencias ?? []).filter((i) => !i.resuelta).length === 1 ? "" : "s"} abierta{(incidencias ?? []).filter((i) => !i.resuelta).length === 1 ? "" : "s"}
            </h2>
          </div>
          <ul className="space-y-2">
            {(incidencias ?? [])
              .filter((i) => !i.resuelta)
              .map((i) => {
                const resolver = async () => {
                  "use server";
                  await resolverIncidencia(proyectoId, i.id);
                };
                return (
                  <li key={i.id} className="flex items-start gap-3 rounded-lg bg-white p-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-red-500/10 text-red-700 text-[10px]">{i.tipo}</Badge>
                        <p className="font-semibold text-slate-900">{i.titulo}</p>
                        {i.dias_impacto > 0 ? (
                          <span className="text-xs font-mono text-amber-700">
                            +{i.dias_impacto}d
                          </span>
                        ) : null}
                      </div>
                      {i.descripcion ? (
                        <p className="mt-0.5 text-sm text-slate-600">{i.descripcion}</p>
                      ) : null}
                      <p className="mt-1 text-[10px] text-slate-400">
                        {new Date(i.created_at).toLocaleString("es-ES")}
                      </p>
                    </div>
                    <form action={resolver}>
                      <Button type="submit" size="xs" variant="outline">
                        <Check className="h-3 w-3" />
                        Resolver
                      </Button>
                    </form>
                  </li>
                );
              })}
          </ul>
        </section>
      ) : null}

      {/* Gantt */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-slate-900">Diagrama de Gantt</h2>
          <p className="text-xs text-slate-500">Arrastra una barra para mover la tarea (propaga retraso)</p>
        </div>
        <Gantt
          proyectoId={proyectoId}
          tareas={tareas ?? []}
          dependencias={depsProyecto}
          usuarios={usuarios ?? []}
          onMoverTarea={async (tareaId, dias) => {
            "use server";
            await moverTareaDias(proyectoId, tareaId, dias);
          }}
        />
      </section>

      {/* Form crear tarea */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Nueva tarea</h2>
        <form action={async (fd: FormData) => { "use server"; await crearTarea(proyectoId, fd); }} className="grid gap-3 sm:grid-cols-6">
          <div className="sm:col-span-2 space-y-1">
            <label className="block text-xs font-semibold text-slate-600">Título *</label>
            <input name="titulo" required className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-600">Especialidad</label>
            <select name="especialidad" defaultValue="cualquiera" className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm">
              {ESPECIALIDADES.map((e) => (
                <option key={e.value} value={e.value}>{e.emoji} {e.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-600">Asignado a</label>
            <select name="asignado_a" className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm">
              <option value="">—</option>
              {(usuarios ?? [])
                .filter((u) => u.rol === "admin" || u.rol === "operario" || u.rol === "montador")
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre}
                  </option>
                ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-600">Inicio *</label>
            <input name="fecha_inicio_plan" type="date" required className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-600">Fin *</label>
            <input name="fecha_fin_plan" type="date" required className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" />
          </div>
          <div className="sm:col-span-3 space-y-1">
            <label className="block text-xs font-semibold text-slate-600">Estancia</label>
            <select name="estancia_id" className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm">
              <option value="">—</option>
              {(estancias ?? []).map((e) => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-3 space-y-1">
            <label className="block text-xs font-semibold text-slate-600">Armario</label>
            <select name="armario_id" className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm">
              <option value="">—</option>
              {(armarios ?? []).map((a) => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-6 space-y-1">
            <label className="block text-xs font-semibold text-slate-600">Descripción</label>
            <textarea name="descripcion" rows={2} className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-6">
            <Button type="submit"><Plus className="h-4 w-4" />Añadir tarea</Button>
          </div>
        </form>
      </section>

      {/* Tabla tareas con acciones */}
      {(tareas ?? []).length > 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-bold text-slate-900">Lista de tareas</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarea</TableHead>
                <TableHead>Especialidad</TableHead>
                <TableHead>Asignado</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Fin</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Depende de</TableHead>
                <TableHead className="w-32">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(tareas ?? []).map((t) => {
                const depsEntrantes = depsProyecto.filter((d) => d.tarea_id === t.id);
                const estadoMeta = ESTADOS_TAREA.find((e) => e.value === t.estado);
                const cambiar = async (fd: FormData) => {
                  "use server";
                  const nuevo = String(fd.get("estado"));
                  await cambiarEstadoTarea(proyectoId, t.id, nuevo as typeof t.estado);
                };
                const eliminar = async () => {
                  "use server";
                  await eliminarTarea(proyectoId, t.id);
                };
                const actualizar = async (fd: FormData) => {
                  "use server";
                  await actualizarTarea(proyectoId, t.id, fd);
                };
                void actualizar;
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-semibold">{t.titulo}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">
                        {ESPECIALIDADES.find((e) => e.value === (t.especialidad ?? "cualquiera"))?.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs">
                      {(usuarios ?? []).find((u) => u.id === t.asignado_a)?.nombre ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{t.fecha_inicio_plan}</TableCell>
                    <TableCell className="font-mono text-xs">{t.fecha_fin_plan}</TableCell>
                    <TableCell>
                      <form action={cambiar}>
                        <select
                          name="estado"
                          defaultValue={t.estado}
                          onChange={(e) => e.currentTarget.form?.requestSubmit()}
                          className={`h-7 rounded-md border-0 px-2 text-xs font-semibold ${estadoMeta?.color ?? ""}`}
                        >
                          {ESTADOS_TAREA.map((e) => (
                            <option key={e.value} value={e.value}>{e.label}</option>
                          ))}
                        </select>
                      </form>
                    </TableCell>
                    <TableCell className="text-xs">
                      {depsEntrantes.length === 0 ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        depsEntrantes.map((d) => {
                          const dep = (tareas ?? []).find((x) => x.id === d.depende_de_tarea_id);
                          const delDep = async () => {
                            "use server";
                            await eliminarDependencia(proyectoId, d.id);
                          };
                          return (
                            <form
                              key={d.id}
                              action={delDep}
                              className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px]"
                            >
                              <span className="truncate max-w-[120px]">{dep?.titulo}</span>
                              <button type="submit" className="text-red-500 hover:text-red-700">×</button>
                            </form>
                          );
                        })
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <form action={eliminar}>
                          <Button type="submit" variant="ghost" size="icon-xs" className="text-red-500">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </section>
      ) : null}

      {/* Form crear dependencia */}
      {(tareas ?? []).length > 1 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-bold text-slate-900">Añadir dependencia</h2>
          <p className="mb-3 text-xs text-slate-500">
            La tarea <strong>A</strong> no empezará hasta que acabe la tarea <strong>B</strong>.
          </p>
          <form action={async (fd: FormData) => {
            "use server";
            await crearDependencia(proyectoId, String(fd.get("tarea_id")), String(fd.get("depende_de_tarea_id")));
          }} className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600">Tarea A (bloqueada)</label>
              <select name="tarea_id" required className="flex h-9 w-56 rounded-md border border-slate-200 bg-white px-3 text-sm">
                {(tareas ?? []).map((t) => <option key={t.id} value={t.id}>{t.titulo}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600">depende de acabar B</label>
              <select name="depende_de_tarea_id" required className="flex h-9 w-56 rounded-md border border-slate-200 bg-white px-3 text-sm">
                {(tareas ?? []).map((t) => <option key={t.id} value={t.id}>{t.titulo}</option>)}
              </select>
            </div>
            <Button type="submit" size="sm"><Plus className="h-3 w-3" />Crear</Button>
          </form>
        </section>
      ) : null}

      {/* Form crear incidencia */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-bold text-slate-900">Reportar incidencia</h2>
        <form action={async (fd: FormData) => { "use server"; await crearIncidencia(proyectoId, fd); }} className="grid gap-3 sm:grid-cols-5">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-600">Tipo</label>
            <select name="tipo" defaultValue="retraso" className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm">
              {TIPOS_INCIDENCIA.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2 space-y-1">
            <label className="block text-xs font-semibold text-slate-600">Título</label>
            <input name="titulo" required className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-600">Tarea afectada</label>
            <select name="tarea_id" className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm">
              <option value="">—</option>
              {(tareas ?? []).map((t) => <option key={t.id} value={t.id}>{t.titulo}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-600">Días impacto</label>
            <input name="dias_impacto" type="number" min={0} defaultValue={0} className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 font-mono text-sm" />
          </div>
          <div className="sm:col-span-5 space-y-1">
            <label className="block text-xs font-semibold text-slate-600">Descripción</label>
            <textarea name="descripcion" rows={2} className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-5">
            <Button type="submit" size="sm"><Plus className="h-3 w-3" />Reportar</Button>
          </div>
        </form>
      </section>
    </div>
  );
}
