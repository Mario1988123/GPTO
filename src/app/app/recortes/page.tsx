import { Suspense } from "react";
import { Scissors } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ToastFromSearchParams } from "../catalogo/shared";
import { cambiarEstadoRecorte } from "../proyectos/nesting-actions";
import { ESTADOS_RECORTE, type EstadoRecorte } from "@/lib/tipos/nesting";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

const EST = Object.fromEntries(ESTADOS_RECORTE.map((e) => [e.value, e]));

const ESTADO_COLOR: Record<string, string> = {
  pendiente: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  conservado: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  usado: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  descartado: "bg-muted text-muted-foreground",
};

type Fila = {
  id: string;
  largo_mm: number;
  ancho_mm: number;
  estado: EstadoRecorte;
  notas: string | null;
  created_at: string;
  referencias_tablero: { grosor_mm: number; materiales: { nombre: string } | null; acabados: { nombre: string } | null } | null;
};

export default async function RecortesPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { estado = "conservado" } = await searchParams;
  const s = await createClient();

  let q = s
    .from("recortes")
    .select("id, largo_mm, ancho_mm, estado, notas, created_at, referencias_tablero(grosor_mm, materiales(nombre), acabados(nombre))")
    .order("created_at", { ascending: false });
  if (estado && estado !== "todos") q = q.eq("estado", estado);
  const { data } = await q.returns<Fila[]>();

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>

      <PageHeader
        eyebrow="Taller"
        title="Almacén de recortes"
        description="Retales reutilizables tras el nesting. Filtra por estado para gestionarlos."
      />

      <form className="mt-6 flex flex-wrap items-end gap-3">
        <div className="w-[240px] space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Estado</label>
          <select
            name="estado"
            defaultValue={estado}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/15"
          >
            <option value="conservado">Conservados</option>
            <option value="pendiente">Pendientes de validar</option>
            <option value="descartado">Descartados</option>
            <option value="usado">Ya utilizados</option>
            <option value="todos">Todos</option>
          </select>
        </div>
        <Button type="submit" variant="outline">Filtrar</Button>
      </form>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {!data || data.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Scissors}
              title={`Sin recortes${estado !== "todos" ? ` en estado "${EST[estado]?.label ?? estado}"` : ""}`}
              description="Los recortes se generan automáticamente tras ejecutar un nesting."
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referencia</TableHead>
                <TableHead>Dimensiones</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((rec) => {
                const est = EST[rec.estado];
                const conservar = async () => { "use server"; await cambiarEstadoRecorte(rec.id, "conservado", "/app/recortes"); };
                const descartar = async () => { "use server"; await cambiarEstadoRecorte(rec.id, "descartado", "/app/recortes"); };
                const usar = async () => { "use server"; await cambiarEstadoRecorte(rec.id, "usado", "/app/recortes"); };
                return (
                  <TableRow key={rec.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {rec.referencias_tablero?.materiales?.nombre ?? "?"} · {rec.referencias_tablero?.acabados?.nombre ?? "?"} · {rec.referencias_tablero?.grosor_mm ?? "?"} mm
                    </TableCell>
                    <TableCell className="font-mono font-semibold tabular-nums">{rec.largo_mm} × {rec.ancho_mm} mm</TableCell>
                    <TableCell>
                      <Badge className={`${ESTADO_COLOR[rec.estado] ?? ""} border-0`}>
                        {est?.label ?? rec.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(rec.created_at).toLocaleDateString("es-ES")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {rec.estado === "pendiente" ? (
                          <>
                            <form action={conservar}>
                              <Button type="submit" size="xs" variant="outline" className="border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/5 dark:text-emerald-400">
                                Conservar
                              </Button>
                            </form>
                            <form action={descartar}>
                              <Button type="submit" size="xs" variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/5">
                                Descartar
                              </Button>
                            </form>
                          </>
                        ) : null}
                        {rec.estado === "conservado" ? (
                          <>
                            <form action={usar}>
                              <Button type="submit" size="xs" variant="outline" className="border-violet-500/30 text-violet-700 hover:bg-violet-500/5 dark:text-violet-400">
                                Usado
                              </Button>
                            </form>
                            <form action={descartar}>
                              <Button type="submit" size="xs" variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/5">
                                Descartar
                              </Button>
                            </form>
                          </>
                        ) : null}
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
