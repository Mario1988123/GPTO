import Link from "next/link";
import { Suspense } from "react";
import { Users, Plus, Search, Mail, Phone, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ToastFromSearchParams } from "./toasts";
import type { Cliente } from "@/lib/tipos/cliente";
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
  searchParams: Promise<{ q?: string; ver?: string }>;
}) {
  const { q = "", ver = "activos" } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("clientes")
    .select("id, nombre, email, telefono, nif, activo, created_at")
    .order("nombre");

  if (ver === "activos") query = query.eq("activo", true);
  if (ver === "inactivos") query = query.eq("activo", false);
  if (q) query = query.ilike("nombre", `%${q}%`);

  const { data: clientes, error } = await query;

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
          <Link href="/app/clientes/nuevo" className={buttonVariants()}>
            <Plus className="h-4 w-4" />
            Nuevo cliente
          </Link>
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
        <div className="w-[180px] space-y-1.5">
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
                <TableHead>Nombre</TableHead>
                <TableHead>NIF</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(clientes as Pick<Cliente, "id" | "nombre" | "email" | "telefono" | "nif" | "activo" | "created_at">[]).map((c) => (
                <TableRow key={c.id} className="group">
                  <TableCell>
                    <Link
                      href={`/app/clientes/${c.id}`}
                      className="font-semibold transition group-hover:text-foreground"
                    >
                      {c.nombre}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {c.nif ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex flex-col gap-0.5 text-xs">
                      {c.email ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Mail className="h-3 w-3" />
                          {c.email}
                        </span>
                      ) : null}
                      {c.telefono ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="h-3 w-3" />
                          {c.telefono}
                        </span>
                      ) : null}
                      {!c.email && !c.telefono ? "—" : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    {c.activo ? (
                      <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400">
                        Activo
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Inactivo</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/app/clientes/${c.id}`}
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
