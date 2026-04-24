import Link from "next/link";
import { Suspense } from "react";
import { FolderKanban, Plus, ChevronRight, Boxes } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ToastFromSearchParams } from "../catalogo/shared";
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
  clientes: { nombre: string } | null;
  armarios: { count: number }[];
};

export default async function ProyectosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado = "" } = await searchParams;
  const supabase = await createClient();
  let q = supabase
    .from("proyectos")
    .select("id, nombre, estado, created_at, updated_at, clientes(nombre), armarios(count)")
    .order("updated_at", { ascending: false });
  if (estado) q = q.eq("estado", estado);
  const { data } = await q.returns<Fila[]>();

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
          <label htmlFor="estado" className="text-xs font-medium text-muted-foreground">
            Estado
          </label>
          <select
            id="estado"
            name="estado"
            defaultValue={estado}
            className="flex h-9 w-full items-center rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
          >
            <option value="">Todos los estados</option>
            {ESTADOS_PROYECTO.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {!data || data.length === 0 ? (
          <div className="p-6">
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
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proyecto</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Armarios</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Actualizado</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((p) => (
                <TableRow key={p.id} className="group">
                  <TableCell>
                    <Link href={`/app/proyectos/${p.id}`} className="font-semibold">
                      {p.nombre}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.clientes?.nombre ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Boxes className="h-3.5 w-3.5" />
                      <span className="font-mono font-semibold text-foreground">{p.armarios?.[0]?.count ?? 0}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${ESTADO_VARIANT[p.estado] ?? ""} border-0 hover:opacity-90`}>
                      {LBL[p.estado]?.label ?? p.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(p.updated_at).toLocaleDateString("es-ES")}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/app/proyectos/${p.id}`}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-muted hover:text-foreground"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
