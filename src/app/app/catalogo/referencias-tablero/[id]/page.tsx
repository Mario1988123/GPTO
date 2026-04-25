import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { actualizar, alternar, eliminar } from "../actions";
import { crearFormato, eliminarFormato } from "../formatos-actions";
import { ReferenciaTableroForm } from "../form";
import { ActivoPill, CatalogoDetalleActions, CatalogoFormCard, ToastFromSearchParams } from "../../shared";
import type { ReferenciaTablero } from "@/lib/tipos/catalogo";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

export default async function DetalleReferenciaTableroPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const s = await createClient();
  const { data: r } = await s
    .from("referencias_tablero")
    .select("*")
    .eq("id", id)
    .maybeSingle<ReferenciaTablero>();
  if (!r) notFound();

  const [{ data: materiales }, { data: acabados }, { data: proveedores }, { data: formatos }] = await Promise.all([
    s.from("materiales").select("id, nombre, categoria").eq("activo", true).order("nombre"),
    s.from("acabados").select("id, nombre").eq("activo", true).order("nombre"),
    s.from("proveedores").select("id, nombre").eq("activo", true).order("nombre"),
    s.from("referencia_tablero_formatos")
      .select("id, ancho_mm, alto_mm, ancho_util_mm, alto_util_mm, precio_unidad_eur, notas")
      .eq("referencia_tablero_id", id)
      .eq("activo", true)
      .order("ancho_mm", { ascending: false }),
  ]);

  const addFormato = async (fd: FormData) => { "use server"; await crearFormato(id, fd); };

  const update = async (fd: FormData) => { "use server"; await actualizar(id, fd); };
  const toggle = async () => { "use server"; await alternar(id, !r.activo); };
  const del = async () => { "use server"; await eliminar(id); };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <Link href="/app/catalogo/referencias-tablero" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Referencias
      </Link>
      <PageHeader eyebrow="Referencia tablero" title="Editar referencia" actions={<ActivoPill activo={r.activo} />} />
      <CatalogoFormCard>
        <ReferenciaTableroForm
          referencia={r}
          materiales={materiales ?? []}
          acabados={acabados ?? []}
          proveedores={proveedores ?? []}
          action={update}
          submitLabel="Guardar cambios"
        />
      </CatalogoFormCard>
      <CatalogoDetalleActions activo={r.activo} toggle={toggle} del={del} />

      {/* Formatos disponibles (migración 047) */}
      <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Formatos disponibles
          </p>
          <h2 className="mt-0.5 text-lg font-bold tracking-tight">Tamaños de tablero</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Una misma melamina/tablero puede comprarse en varios formatos (244×122, 305×122, 380×144...).
            El nesting elegirá el que minimice el número de tableros usados.
          </p>
        </div>

        {(formatos ?? []).length > 0 ? (
          <ul className="mb-5 divide-y divide-border overflow-hidden rounded-lg border border-border">
            {(formatos ?? []).map((f) => {
              const borrar = async () => { "use server"; await eliminarFormato(id, f.id as string); };
              return (
                <li key={f.id as string} className="flex items-center gap-4 px-4 py-2.5">
                  <div className="flex-1">
                    <p className="font-mono font-semibold">
                      {f.ancho_mm} × {f.alto_mm} mm
                      <span className="ml-2 text-xs text-muted-foreground">
                        (útil {f.ancho_util_mm} × {f.alto_util_mm})
                      </span>
                    </p>
                    {f.notas ? <p className="text-xs text-muted-foreground">{f.notas as string}</p> : null}
                  </div>
                  {f.precio_unidad_eur ? (
                    <span className="font-mono text-sm font-bold">{Number(f.precio_unidad_eur).toFixed(2)} €/ud</span>
                  ) : null}
                  <form action={borrar} className="inline">
                    <Button type="submit" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mb-5 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
            Sin formatos configurados. Mientras no haya ninguno, el nesting usa la medida de `config_empresa`.
          </p>
        )}

        <form action={addFormato} className="grid gap-3 rounded-xl border border-dashed border-border bg-muted/20 p-4 sm:grid-cols-6">
          <div className="space-y-1"><Label htmlFor="ancho_mm">Ancho (mm) *</Label><Input id="ancho_mm" name="ancho_mm" type="number" min="1" required placeholder="2440" /></div>
          <div className="space-y-1"><Label htmlFor="alto_mm">Alto (mm) *</Label><Input id="alto_mm" name="alto_mm" type="number" min="1" required placeholder="1220" /></div>
          <div className="space-y-1"><Label htmlFor="ancho_util_mm">Ancho útil</Label><Input id="ancho_util_mm" name="ancho_util_mm" type="number" min="1" placeholder="2400" /></div>
          <div className="space-y-1"><Label htmlFor="alto_util_mm">Alto útil</Label><Input id="alto_util_mm" name="alto_util_mm" type="number" min="1" placeholder="1200" /></div>
          <div className="space-y-1"><Label htmlFor="precio_unidad_eur">Precio €/ud</Label><Input id="precio_unidad_eur" name="precio_unidad_eur" type="number" step="0.01" /></div>
          <div className="flex items-end">
            <Button type="submit" size="sm"><Plus className="h-3.5 w-3.5" /> Añadir</Button>
          </div>
          <div className="sm:col-span-6 space-y-1">
            <Label htmlFor="notas">Notas (opcional)</Label>
            <Input id="notas" name="notas" placeholder="Ej: solo para pedidos > 10 uds" />
          </div>
        </form>
      </section>
    </div>
  );
}
