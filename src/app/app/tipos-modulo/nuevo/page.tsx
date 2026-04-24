import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { crearTipo } from "../actions";
import { TipoModuloForm } from "../tipo-form";
import { CatalogoFormCard, ToastFromSearchParams } from "../../catalogo/shared";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default async function NuevoTipoPage() {
  const s = await createClient();
  const { data: referencias } = await s
    .from("referencias_tablero")
    .select("id, grosor_mm, materiales(nombre), acabados(nombre)")
    .eq("activo", true)
    .order("grosor_mm");

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <Link href="/app/tipos-modulo" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Tipos de módulo
      </Link>
      <PageHeader
        eyebrow="Configuración"
        title="Nuevo tipo de módulo"
        description="Crea primero el tipo con sus dimensiones por defecto. Luego podrás añadir piezas y herrajes en la pantalla de detalle."
      />
      <CatalogoFormCard>
        {/* @ts-expect-error relación supabase llega como objeto/array según tipos */}
        <TipoModuloForm referencias={referencias ?? []} action={crearTipo} submitLabel="Crear tipo" />
      </CatalogoFormCard>
    </div>
  );
}
