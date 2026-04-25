import Link from "next/link";
import { Suspense } from "react";
import { FolderKanban, Plus, Boxes, Home, Pencil, Trash2, LayoutGrid, Rows3, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ToastFromSearchParams } from "../catalogo/shared";
import { eliminarProyecto } from "./actions";
import { ESTADOS_PROYECTO, type EstadoProyecto } from "@/lib/tipos/proyectos";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button, buttonVariants } from "@/components/ui/button";
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

const LBL = Object.fromEntries(ESTADOS_PROYECTO.map((e) => [e.value, e]));

const ESTADO_VARIANT: Record<EstadoProyecto, string> = {
  borrador: "bg-muted text-muted-foreground",
  presupuestado: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  confirmado: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  en_fabricacion: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  entregado: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  cancelado: "bg-red-500/10 text-red-700 dark:text-red-400",
};

type Fila = {
  id: string;
  nombre: string;
  estado: EstadoProyecto;
  created_at: string;
  updated_at: string;
  fecha_entrega_comprometida: string | null;
  clientes: { nombre: string; apellido1: string | null; es_empresa: boolean } | null;
  armarios: { count: number }[];
  estancias: { count: number }[];
};

function fmtFecha(v: string | null) {
  if (!v) return null;
  try { return new Date(v).toLocaleDateString("es-ES"); } catch { return v; }
}

function nombreCliente(c: Fila["clientes"]) {
  if (!c) return "—";
  if (c.es_empresa) return c.nombre;
  return [c.nombre, c.apellido1].filter(Boolean).join(" ").trim() || c.nombre;
}

export default async function ProyectosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; vista?: string }>;
}) {
  const { estado = "", vista = "tarjetas" } = await searchParams;
  const supabase = await createClient();
  let q = supabase
    .from("proyectos")
    .select("id, nombre, estado, created_at, updated_at, fecha_entrega_comprometida, clientes(nombre, apellido1, es_empresa), armarios(count), estancias(count)")
    .order("updated_at", { ascending: false });
  if (estado) q = q.eq("estado", estado);
  const { data } = await q.returns<Fila[]>();

  const esTarjetas = vista !== "filas";

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Suspense>
        <ToastFromSearchParams />
      </Suspense>

      <PageHeader
        eyebrow="Taller"
        title="Proyectos"
        description="Un proyecto agrupa los armarios a fabricar para un cliente."
        actions={
          <Link href="/app/proyectos/nuevo" className={buttonVariants()}>
            <Plus className="h-4 w-4" />
            Nuevo proyecto
          </Link>
        }
      />

      <form className="mt-6 flex flex-wrap items-end gap-3">
        <div className="w-[220px] space-y-1.5">
          <label htmlFor="estado" className="text-xs font-medium text-muted-foreground">Estado</label>
          <select
            id="estado"
            name="estado"
            defaultValue={estado}
            className="flex h-9 w-full items-center rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
          >
            <option value="">Todos los estados</option>
            {ESTADOS_PROYECTO.map((e) => (
              <option key={e.value} value={e.value}>{e.label}</option>
            ))}
          </select>
        </div>
        <input type="hidden" name="vista" value={vista} />
        <Button type="submit" variant="outline">Filtrar</Button>
        <div className="ml-auto inline-flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
          <Link
            href={`/app/proyectos?${new URLSearchParams({ ...(estado ? { estado } : {}), vista: "tarjetas" })}`}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition ${esTarjetas ? "bg-background shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"}`}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Tarjetas
          </Link>
          <Link
            href={`/app/proyectos?${new URLSearchParams({ ...(estado ? { estado } : {}), vista: "filas" })}`}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition ${!esTarjetas ? "bg-background shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Rows3 className="h-3.5 w-3.5" /> Filas
          </Link>
        </div>
      </form>

      {!data || data.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <EmptyState
            icon={FolderKanban}
            title={estado ? `Sin proyectos en estado "${LBL[estado]?.label ?? estado}"` : "Aún no hay proyectos"}
            description="Crea un proyecto y empieza a diseñar armarios en 3D para tus clientes."
            action={
              !estado ? (
                <Link href="/app/proyectos/nuevo" className={buttonVariants()}>
                  <Plus className="h-4 w-4" />
                  Crear proyecto
                </Link>
              ) : null
            }
          />
        </div>
      ) : esTarjetas ? (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((p) => {
            const borrar = async () => { "use server"; await eliminarProyecto(p.id); };
            return (
              <li key={p.id} className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <Link href={`/app/proyectos/${p.id}`} className="block p-5">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <h3 className="line-clamp-2 text-base font-bold leading-tight">{p.nombre}</h3>
                    <Badge className={`${ESTADO_VARIANT[p.estado] ?? ""} shrink-0 border-0`}>
                      {LBL[p.estado]?.label ?? p.estado}
                    </Badge>
                  </div>
                  <p className="mb-3 line-clamp-1 text-sm text-muted-foreground">{nombreCliente(p.clientes)}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Home className="h-3.5 w-3.5" />
                      <span className="font-mono font-semibold text-foreground">{p.estancias?.[0]?.count ?? 0}</span>
                      estancias
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Boxes className="h-3.5 w-3.5" />
                      <span className="font-mono font-semibold text-foreground">{p.armarios?.[0]?.count ?? 0}</span>
                      armarios
                    </span>
                    {p.fecha_entrega_comprometida && (
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {fmtFecha(p.fecha_entrega_comprometida)}
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-[10px] uppercase tracking-wider text-muted-foreground">
                    Actualizado {fmtFecha(p.updated_at)}
                  </p>
                </Link>
                <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                  <Link
                    href={`/app/proyectos/${p.id}/editar`}
                    title="Editar"
                    className="flex h-8 w-8 items-center justify-center rounded-md bg-background/80 text-muted-foreground backdrop-blur hover:bg-muted hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <form action={borrar} className="inline">
                    <button
                      type="submit"
                      title="Eliminar"
                      className="flex h-8 w-8 items-center justify-center rounded-md bg-background/80 text-muted-foreground backdrop-blur hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proyecto</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Estancias</TableHead>
                <TableHead className="text-right">Armarios</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Entrega</TableHead>
                <TableHead>Actualizado</TableHead>
                <TableHead className="w-28 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((p) => {
                const borrar = async () => { "use server"; await eliminarProyecto(p.id); };
                return (
                  <TableRow key={p.id} className="group">
                    <TableCell>
                      <Link href={`/app/proyectos/${p.id}`} className="font-semibold">{p.nombre}</Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{nombreCliente(p.clientes)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{p.estancias?.[0]?.count ?? 0}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{p.armarios?.[0]?.count ?? 0}</TableCell>
                    <TableCell>
                      <Badge className={`${ESTADO_VARIANT[p.estado] ?? ""} border-0`}>{LBL[p.estado]?.label ?? p.estado}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtFecha(p.fecha_entrega_comprometida) ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtFecha(p.updated_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/app/proyectos/${p.id}/editar`} title="Editar" className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <form action={borrar} className="inline">
                          <button type="submit" title="Eliminar" className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
