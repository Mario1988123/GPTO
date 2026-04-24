import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { crear } from "../actions";
import { CantoForm } from "../form";
import { CatalogoFormCard, ToastFromSearchParams } from "../../shared";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default async function NuevoCantoPage() {
  const s = await createClient();
  const [{ data: acabados }, { data: proveedores }] = await Promise.all([
    s.from("acabados").select("id, nombre").eq("activo", true).order("nombre"),
    s.from("proveedores").select("id, nombre").eq("activo", true).order("nombre"),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <Link href="/app/catalogo/cantos" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Cantos
      </Link>
      <PageHeader eyebrow="Catálogo" title="Nuevo canto" />
      <CatalogoFormCard>
        <CantoForm acabados={acabados ?? []} proveedores={proveedores ?? []} action={crear} submitLabel="Crear canto" />
      </CatalogoFormCard>
    </div>
  );
}
