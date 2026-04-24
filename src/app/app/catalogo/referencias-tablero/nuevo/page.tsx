import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { crear } from "../actions";
import { ReferenciaTableroForm } from "../form";
import { CatalogoFormCard, ToastFromSearchParams } from "../../shared";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default async function NuevaReferenciaTableroPage() {
  const s = await createClient();
  const [{ data: materiales }, { data: acabados }, { data: proveedores }] = await Promise.all([
    s.from("materiales").select("id, nombre, categoria").eq("activo", true).order("nombre"),
    s.from("acabados").select("id, nombre").eq("activo", true).order("nombre"),
    s.from("proveedores").select("id, nombre").eq("activo", true).order("nombre"),
  ]);

  const faltanMaterialesAcabados = (materiales ?? []).length === 0 || (acabados ?? []).length === 0;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <Link href="/app/catalogo/referencias-tablero" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Referencias
      </Link>
      <PageHeader eyebrow="Catálogo" title="Nueva referencia de tablero" />
      {faltanMaterialesAcabados ? (
        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-amber-300/60 bg-amber-50/50 p-5 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Necesitas crear antes materiales y acabados</p>
            <p className="mt-1 text-xs opacity-80">
              Crea al menos un{" "}
              <Link href="/app/catalogo/materiales/nuevo" className="underline">material</Link> y un{" "}
              <Link href="/app/catalogo/acabados/nuevo" className="underline">acabado</Link>.
            </p>
          </div>
        </div>
      ) : (
        <CatalogoFormCard>
          <ReferenciaTableroForm
            materiales={materiales ?? []}
            acabados={acabados ?? []}
            proveedores={proveedores ?? []}
            action={crear}
            submitLabel="Crear referencia"
          />
        </CatalogoFormCard>
      )}
    </div>
  );
}
