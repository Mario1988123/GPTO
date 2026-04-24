import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { crear } from "../actions";
import { HerrajeForm } from "../form";
import { CatalogoFormCard, ToastFromSearchParams } from "../../shared";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default async function NuevoHerrajePage() {
  const s = await createClient();
  const { data: proveedores } = await s.from("proveedores").select("id, nombre").eq("activo", true).order("nombre");

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <Link href="/app/catalogo/herrajes" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Herrajes
      </Link>
      <PageHeader eyebrow="Catálogo" title="Nuevo herraje" />
      <CatalogoFormCard>
        <HerrajeForm proveedores={proveedores ?? []} action={crear} submitLabel="Crear herraje" />
      </CatalogoFormCard>
    </div>
  );
}
