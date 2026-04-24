"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  diasEntre,
  sumarDias,
  type EspecialidadTarea,
  type EstadoTarea,
  type Tarea,
} from "@/lib/tipos/tareas";

const ESPECIALIDADES: EspecialidadTarea[] = [
  "cocina", "muebles", "puertas", "ventanas", "parquet", "cualquiera",
];

const ESTADOS: EstadoTarea[] = [
  "pendiente", "en_curso", "completada", "bloqueada", "cancelada",
];

function payload(fd: FormData) {
  const titulo = String(fd.get("titulo") ?? "").trim();
  if (!titulo) throw new Error("Título obligatorio.");
  const fecha_inicio_plan = String(fd.get("fecha_inicio_plan") ?? "").trim();
  const fecha_fin_plan = String(fd.get("fecha_fin_plan") ?? "").trim();
  if (!fecha_inicio_plan || !fecha_fin_plan) throw new Error("Fechas obligatorias.");
  if (fecha_fin_plan < fecha_inicio_plan) throw new Error("Fecha fin no puede ser anterior a inicio.");

  const esp = String(fd.get("especialidad") ?? "").trim() as EspecialidadTarea | "";
  const asignado = String(fd.get("asignado_a") ?? "").trim();
  const estancia = String(fd.get("estancia_id") ?? "").trim();
  const armario = String(fd.get("armario_id") ?? "").trim();

  return {
    titulo,
    descripcion: String(fd.get("descripcion") ?? "").trim() || null,
    especialidad: esp && ESPECIALIDADES.includes(esp) ? esp : null,
    asignado_a: asignado || null,
    estancia_id: estancia || null,
    armario_id: armario || null,
    fecha_inicio_plan,
    fecha_fin_plan,
  };
}

export async function crearTarea(proyectoId: string, fd: FormData) {
  const s = await createClient();
  const { data: max } = await s
    .from("tareas")
    .select("orden")
    .eq("proyecto_id", proyectoId)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();
  const orden = ((max?.orden ?? -1) as number) + 1;

  const { error } = await s.from("tareas").insert({
    ...payload(fd),
    proyecto_id: proyectoId,
    orden,
    estado: "pendiente",
  });
  if (error) {
    redirect(`/app/proyectos/${proyectoId}/agenda?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath(`/app/proyectos/${proyectoId}/agenda`);
  redirect(`/app/proyectos/${proyectoId}/agenda?ok=creado`);
}

export async function actualizarTarea(proyectoId: string, tareaId: string, fd: FormData) {
  const s = await createClient();

  const { data: actual } = await s
    .from("tareas")
    .select("fecha_inicio_plan, fecha_fin_plan")
    .eq("id", tareaId)
    .maybeSingle<{ fecha_inicio_plan: string; fecha_fin_plan: string }>();

  const nueva = payload(fd);

  const { error } = await s.from("tareas").update(nueva).eq("id", tareaId);
  if (error) {
    redirect(`/app/proyectos/${proyectoId}/agenda?error=${encodeURIComponent(error.message)}`);
  }

  // Si se ha retrasado la fecha fin → propagar a tareas dependientes
  if (actual) {
    const diasRetraso = diasEntre(actual.fecha_fin_plan, nueva.fecha_fin_plan);
    if (diasRetraso > 0) {
      await propagarRetraso(proyectoId, tareaId, diasRetraso, "Retraso en tarea");
    }
  }

  await recalcularFechaEntregaActual(proyectoId);

  revalidatePath(`/app/proyectos/${proyectoId}/agenda`);
  redirect(`/app/proyectos/${proyectoId}/agenda?ok=actualizado`);
}

export async function eliminarTarea(proyectoId: string, tareaId: string) {
  const s = await createClient();
  const { error } = await s.from("tareas").delete().eq("id", tareaId);
  if (error) {
    redirect(`/app/proyectos/${proyectoId}/agenda?error=${encodeURIComponent(error.message)}`);
  }
  await recalcularFechaEntregaActual(proyectoId);
  revalidatePath(`/app/proyectos/${proyectoId}/agenda`);
  redirect(`/app/proyectos/${proyectoId}/agenda?ok=eliminado`);
}

export async function cambiarEstadoTarea(
  proyectoId: string,
  tareaId: string,
  nuevo: EstadoTarea,
) {
  if (!ESTADOS.includes(nuevo)) throw new Error("Estado inválido.");
  const s = await createClient();
  const hoy = new Date().toISOString().slice(0, 10);

  const update: Record<string, unknown> = { estado: nuevo };
  if (nuevo === "en_curso") update.fecha_inicio_real = hoy;
  if (nuevo === "completada") update.fecha_fin_real = hoy;

  const { error } = await s.from("tareas").update(update).eq("id", tareaId);
  if (error) {
    redirect(`/app/proyectos/${proyectoId}/agenda?error=${encodeURIComponent(error.message)}`);
  }

  // Cierre automático del proyecto si todas las tareas están completadas o canceladas
  await cerrarProyectoSiProcede(proyectoId);

  revalidatePath(`/app/proyectos/${proyectoId}/agenda`);
  revalidatePath(`/app/proyectos/${proyectoId}`);
  redirect(`/app/proyectos/${proyectoId}/agenda?ok=actualizado`);
}

/**
 * Mueve la tarea y todas sus dependientes `dias` días hacia delante en cascada.
 * Deja registrada una incidencia de retraso.
 */
export async function propagarRetraso(
  proyectoId: string,
  tareaRaizId: string,
  dias: number,
  motivo: string,
): Promise<number> {
  const s = await createClient();

  // BFS por dependencias
  const visitadas = new Set<string>();
  const cola = [tareaRaizId];
  const afectadas: string[] = [];
  while (cola.length > 0) {
    const actual = cola.shift()!;
    if (visitadas.has(actual)) continue;
    visitadas.add(actual);

    const { data: hijos } = await s
      .from("tarea_dependencias")
      .select("tarea_id")
      .eq("depende_de_tarea_id", actual);

    for (const h of (hijos ?? []) as { tarea_id: string }[]) {
      if (!visitadas.has(h.tarea_id)) {
        cola.push(h.tarea_id);
        afectadas.push(h.tarea_id);
      }
    }
  }

  if (afectadas.length === 0) return 0;

  // Desplazar fechas
  const { data: tareasAfec } = await s
    .from("tareas")
    .select("id, fecha_inicio_plan, fecha_fin_plan")
    .in("id", afectadas);

  for (const t of (tareasAfec ?? []) as { id: string; fecha_inicio_plan: string; fecha_fin_plan: string }[]) {
    await s
      .from("tareas")
      .update({
        fecha_inicio_plan: sumarDias(t.fecha_inicio_plan, dias),
        fecha_fin_plan: sumarDias(t.fecha_fin_plan, dias),
      })
      .eq("id", t.id);
  }

  // Registrar incidencia
  await s.from("incidencias").insert({
    proyecto_id: proyectoId,
    tarea_id: tareaRaizId,
    tipo: "retraso",
    titulo: `Retraso ${dias} día${dias === 1 ? "" : "s"}`,
    descripcion: `${motivo}. Se han desplazado ${afectadas.length} tarea${afectadas.length === 1 ? "" : "s"} dependiente${afectadas.length === 1 ? "" : "s"}.`,
    dias_impacto: dias,
  });

  return afectadas.length;
}

/** Recalcula `proyectos.fecha_entrega_actual` = max(fecha_fin_plan) de todas las tareas activas. */
export async function recalcularFechaEntregaActual(proyectoId: string) {
  const s = await createClient();
  const { data: tareas } = await s
    .from("tareas")
    .select("fecha_fin_plan, estado")
    .eq("proyecto_id", proyectoId)
    .neq("estado", "cancelada");

  if (!tareas || tareas.length === 0) return;
  const fechas = (tareas as { fecha_fin_plan: string }[])
    .map((t) => t.fecha_fin_plan)
    .sort()
    .reverse();
  const maxFecha = fechas[0];

  await s.from("proyectos").update({ fecha_entrega_actual: maxFecha }).eq("id", proyectoId);
}

/** Cierra el proyecto si todas las tareas están completadas o canceladas. */
export async function cerrarProyectoSiProcede(proyectoId: string) {
  const s = await createClient();
  const { data: tareas } = await s
    .from("tareas")
    .select("estado")
    .eq("proyecto_id", proyectoId);

  if (!tareas || tareas.length === 0) return;
  const todas = (tareas as { estado: EstadoTarea }[]).every((t) =>
    t.estado === "completada" || t.estado === "cancelada",
  );

  if (todas) {
    await s
      .from("proyectos")
      .update({
        cerrado_at: new Date().toISOString(),
        estado: "entregado",
      })
      .eq("id", proyectoId);
  } else {
    // Si se reabre alguna tarea, reseteamos cerrado_at
    await s.from("proyectos").update({ cerrado_at: null }).eq("id", proyectoId);
  }
}

export async function crearDependencia(
  proyectoId: string,
  tareaId: string,
  dependeDeId: string,
) {
  if (tareaId === dependeDeId) throw new Error("Una tarea no puede depender de sí misma");
  const s = await createClient();
  const { error } = await s.from("tarea_dependencias").insert({
    tarea_id: tareaId,
    depende_de_tarea_id: dependeDeId,
    tipo: "finish_to_start",
    lag_dias: 0,
  });
  if (error) {
    redirect(`/app/proyectos/${proyectoId}/agenda?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath(`/app/proyectos/${proyectoId}/agenda`);
  redirect(`/app/proyectos/${proyectoId}/agenda?ok=creado`);
}

export async function eliminarDependencia(proyectoId: string, dependenciaId: string) {
  const s = await createClient();
  const { error } = await s.from("tarea_dependencias").delete().eq("id", dependenciaId);
  if (error) {
    redirect(`/app/proyectos/${proyectoId}/agenda?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath(`/app/proyectos/${proyectoId}/agenda`);
  redirect(`/app/proyectos/${proyectoId}/agenda?ok=eliminado`);
}

export async function actualizarFechaEntrega(
  proyectoId: string,
  fd: FormData,
) {
  const s = await createClient();
  const comprometida = String(fd.get("fecha_entrega_comprometida") ?? "").trim() || null;
  const interiorista = String(fd.get("interiorista_usuario_id") ?? "").trim() || null;
  const { error } = await s
    .from("proyectos")
    .update({
      fecha_entrega_comprometida: comprometida,
      interiorista_usuario_id: interiorista,
    })
    .eq("id", proyectoId);
  if (error) {
    redirect(`/app/proyectos/${proyectoId}?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath(`/app/proyectos/${proyectoId}`);
  redirect(`/app/proyectos/${proyectoId}?ok=actualizado`);
}

/** Mueve una tarea completa N días (para drag & drop del Gantt). */
export async function moverTareaDias(
  proyectoId: string,
  tareaId: string,
  dias: number,
) {
  const s = await createClient();
  const { data: t } = await s
    .from("tareas")
    .select("fecha_inicio_plan, fecha_fin_plan")
    .eq("id", tareaId)
    .maybeSingle<{ fecha_inicio_plan: string; fecha_fin_plan: string }>();
  if (!t) throw new Error("Tarea no encontrada");

  await s
    .from("tareas")
    .update({
      fecha_inicio_plan: sumarDias(t.fecha_inicio_plan, dias),
      fecha_fin_plan: sumarDias(t.fecha_fin_plan, dias),
    })
    .eq("id", tareaId);

  if (dias > 0) {
    await propagarRetraso(proyectoId, tareaId, dias, "Tarea movida en Gantt");
  }

  await recalcularFechaEntregaActual(proyectoId);
  revalidatePath(`/app/proyectos/${proyectoId}/agenda`);
}

/** Crea una incidencia manual (ej. material pendiente). */
export async function crearIncidencia(
  proyectoId: string,
  fd: FormData,
) {
  const s = await createClient();
  const tipo = String(fd.get("tipo") ?? "otro");
  const titulo = String(fd.get("titulo") ?? "").trim();
  const descripcion = String(fd.get("descripcion") ?? "").trim() || null;
  const diasImpactoRaw = String(fd.get("dias_impacto") ?? "0");
  const tareaId = String(fd.get("tarea_id") ?? "").trim() || null;
  const dias = Number.parseInt(diasImpactoRaw, 10) || 0;

  if (!titulo) throw new Error("Título obligatorio");

  const { error } = await s.from("incidencias").insert({
    proyecto_id: proyectoId,
    tarea_id: tareaId,
    tipo,
    titulo,
    descripcion,
    dias_impacto: dias,
  });
  if (error) {
    redirect(`/app/proyectos/${proyectoId}/agenda?error=${encodeURIComponent(error.message)}`);
  }

  // Si la incidencia afecta a una tarea y tiene días de impacto, propagamos el retraso.
  if (tareaId && dias > 0) {
    const { data: t } = await s
      .from("tareas")
      .select("fecha_inicio_plan, fecha_fin_plan")
      .eq("id", tareaId)
      .maybeSingle<{ fecha_inicio_plan: string; fecha_fin_plan: string }>();
    if (t) {
      await s
        .from("tareas")
        .update({
          fecha_inicio_plan: sumarDias(t.fecha_inicio_plan, dias),
          fecha_fin_plan: sumarDias(t.fecha_fin_plan, dias),
        })
        .eq("id", tareaId);
      await propagarRetraso(proyectoId, tareaId, dias, titulo);
    }
    await recalcularFechaEntregaActual(proyectoId);
  }

  revalidatePath(`/app/proyectos/${proyectoId}/agenda`);
  redirect(`/app/proyectos/${proyectoId}/agenda?ok=creado`);
}

export async function resolverIncidencia(proyectoId: string, incidenciaId: string) {
  const s = await createClient();
  const { error } = await s
    .from("incidencias")
    .update({ resuelta: true, resuelta_at: new Date().toISOString() })
    .eq("id", incidenciaId);
  if (error) throw new Error(error.message);
  revalidatePath(`/app/proyectos/${proyectoId}/agenda`);
  redirect(`/app/proyectos/${proyectoId}/agenda?ok=actualizado`);
}

/** Helper: lista todas las tareas de un proyecto. */
export async function listarTareas(proyectoId: string): Promise<Tarea[]> {
  const s = await createClient();
  const { data } = await s
    .from("tareas")
    .select("*")
    .eq("proyecto_id", proyectoId)
    .order("fecha_inicio_plan");
  return (data ?? []) as Tarea[];
}
