import Link from "next/link";
import { Suspense } from "react";
import { Users, Plus, Search, Mail, Pencil, Trash2, Power, FolderPlus, Building2, User, FileUp, FileDown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ToastFromSearchParams } from "./toasts";
import { alternarActivo, eliminarCliente } from "./actions";
import type { Cliente } from "@/lib/tipos/cliente";
import { nombreCompletoCliente } from "@/lib/tipos/cliente";
import { TelefonoLinks } from "@/components/telefono-links";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; ver?: string; etiqueta?: string; seguimiento?: string }>;
}) {
  const { q = "", ver = "activos", etiqueta = "", seguimiento = "" } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("clientes")
    .select("id, nombre, apellido1, apellido2, es_empresa, email, telefono, nif, etiquetas, foto_url, proximo_seguimiento, activo, created_at")
    .order("nombre");

  if (ver === "activos") query = query.eq("activo", true);
  if (ver === "inactivos") query = query.eq("activo", false);
  if (q) query = query.ilike("nombre", `%${q}%`);
  if (etiqueta) query = query.contains("etiquetas", [etiqueta]);
  if (seguimiento === "vencido") {
    query = query.lte("proximo_seguimiento", new Date().toISOString().slice(0, 10));
  } else if (seguimiento === "proximo") {
    const en7 = new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10);
    query = query.gte("proximo_seguimiento", new Date().toISOString().slice(0, 10)).lte("proximo_seguimiento", en7);
  }

  const { data: clientes, error } = await query;

  // Set de etiquetas únicas (para el filtro)
  const todasEtiquetas = new Set<string>();
  for (const c of clientes ?? []) for (const et of (c as { etiquetas?: string[] }).etiquetas ?? []) todasEtiquetas.add(et);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Suspense>
        <ToastFromSearchParams />
      </Suspense>

      <PageHeader
        eyebrow="CRM"
        title="Clientes"
        description={`${clientes?.length ?? 0} cliente${(clientes?.length ?? 0) === 1 ? "" : "s"}${ver !== "todos" ? ` · ${ver}` : ""}`}
        actions={
          <>
            <a href="/api/clientes/export" download className={buttonVariants({ variant: "outline" })}>
              <FileDown className="h-4 w-4" />
              Exportar CSV
            </a>
            <Link href="/app/clientes/importar" className={buttonVariants({ variant: "outline" })}>
              <FileUp className="h-4 w-4" />
              Importar CSV
            </Link>
            <Link href="/app/clientes/nuevo" className={buttonVariants()}>
              <Plus className="h-4 w-4" />
              Nuevo cliente
            </Link>
          </>
        }
      />

      <form className="mt-6 flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1 space-y-1.5">
          <label htmlFor="q" className="text-xs font-medium text-muted-foreground">
            Buscar
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="q"
              name="q"
              defaultValue={q}
              placeholder="Buscar por nombre..."
              className="pl-9"
            />
          </div>
        </div>
        <div className="w-[160px] space-y-1.5">
          <label htmlFor="ver" className="text-xs font-medium text-muted-foreground">
            Ver
          </label>
          <Select name="ver" defaultValue={ver}>
            <SelectTrigger id="ver">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="activos">Activos</SelectItem>
              <SelectItem value="inactivos">Inactivos</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {todasEtiquetas.size > 0 && (
          <div className="w-[160px] space-y-1.5">
            <label htmlFor="etiqueta" className="text-xs font-medium text-muted-foreground">
              Etiqueta
            </label>
            <select
              id="etiqueta"
              name="etiqueta"
              defaultValue={etiqueta}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
            >
              <option value="">— todas —</option>
              {[...todasEtiquetas].map((et) => (
                <option key={et} value={et}>{et}</option>
              ))}
            </select>
          </div>
        )}
        <div className="w-[180px] space-y-1.5">
          <label htmlFor="seguimiento" className="text-xs font-medium text-muted-foreground">
            Seguimiento
          </label>
          <select
            id="seguimiento"
            name="seguimiento"
            defaultValue={seguimiento}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
          >
            <option value="">— todos —</option>
            <option value="vencido">⏰ Vencidos</option>
            <option value="proximo">Próximos 7 días</option>
          </select>
        </div>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {error ? (
          <div className="p-6 text-sm text-destructive">Error cargando clientes: {error.message}</div>
        ) : !clientes || clientes.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Users}
              title={q ? `Sin resultados para "${q}"` : "Aún no hay clientes"}
              description={q ? "Prueba con otro término de búsqueda." : "Crea el primer cliente para empezar a gestionar proyectos."}
              action={
                !q ? (
                  <Link href="/app/clientes/nuevo" className={buttonVariants()}>
                    <Plus className="h-4 w-4" />
                    Crear cliente
                  </Link>
                ) : null
              }
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>NIF / CIF</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-40 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(clientes as Pick<Cliente, "id" | "nombre" | "apellido1" | "apellido2" | "es_empresa" | "email" | "telefono" | "nif" | "etiquetas" | "foto_url" | "proximo_seguimiento" | "activo" | "created_at">[]).map((c) => {
                const nombreMostrar = nombreCompletoCliente(c);
                const toggle = async () => { "use server"; await alternarActivo(c.id, !c.activo); };
                const borrar = async () => { "use server"; await eliminarCliente(c.id); };
                const seguimientoVencido = c.proximo_seguimiento && c.proximo_seguimiento <= new Date().toISOString().slice(0, 10);
                return (
                  <TableRow key={c.id} className="group">
                    <TableCell>
                      <Link href={`/app/clientes/${c.id}`} className="inline-flex items-center gap-2.5 font-semibold transition hover:text-foreground">
                        {c.foto_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.foto_url} alt={nombreMostrar} className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-border" />
                        ) : (
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted ring-1 ring-border">
                            {c.es_empresa ? <Building2 className="h-3.5 w-3.5 text-blue-600" /> : <User className="h-3.5 w-3.5 text-muted-foreground" />}
                          </span>
                        )}
                        <span className="flex flex-col">
                          <span>{nombreMostrar}</span>
                          {(c.etiquetas?.length ?? 0) > 0 && (
                            <span className="mt-0.5 flex flex-wrap gap-1">
                              {c.etiquetas!.slice(0, 3).map((et) => (
                                <span key={et} className="rounded bg-blue-500/10 px-1.5 py-0 text-[10px] font-medium text-blue-700 dark:text-blue-400">
                                  {et}
                                </span>
                              ))}
                            </span>
                          )}
                          {seguimientoVencido && (
                            <span className="mt-0.5 inline-flex w-fit items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                              ⏰ seguimiento {new Date(c.proximo_seguimiento!).toLocaleDateString("es-ES")}
                            </span>
                          )}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{c.nif ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex flex-col gap-1 text-xs">
                        {c.email && (
                          <a
                            href={`mailto:${c.email}`}
                            className="inline-flex items-center gap-1.5 hover:text-foreground hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Mail className="h-3 w-3" /> {c.email}
                          </a>
                        )}
                        {c.telefono && <TelefonoLinks telefono={c.telefono} size="xs" />}
                        {!c.email && !c.telefono && "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {c.activo ? (
                        <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400">Activo</Badge>
                      ) : (
                        <Badge variant="secondary">Inactivo</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/app/proyectos/nuevo?cliente_id=${c.id}`}
                          title="Crear proyecto para este cliente"
                          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-blue-500/10 hover:text-blue-600"
                        >
                          <FolderPlus className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/app/clientes/${c.id}`}
                          title="Editar"
                          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <form action={toggle} className="inline">
                          <button
                            type="submit"
                            title={c.activo ? "Desactivar" : "Reactivar"}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-amber-500/10 hover:text-amber-600"
                          >
                            <Power className="h-4 w-4" />
                          </button>
                        </form>
                        <form action={borrar} className="inline">
                          <button
                            type="submit"
                            title="Eliminar"
                            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
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
        )}
      </div>
    </div>
  );
}
