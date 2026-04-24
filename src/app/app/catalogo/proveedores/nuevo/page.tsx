import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { crear } from "../actions";
import { ProveedorForm } from "../form";
import { CatalogoFormCard, ToastFromSearchParams } from "../../shared";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default function NuevoProveedorPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <Link href="/app/catalogo/proveedores" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Proveedores
      </Link>
      <PageHeader eyebrow="Catálogo" title="Nuevo proveedor" />
      <CatalogoFormCard>
        <ProveedorForm action={crear} submitLabel="Crear proveedor" />
      </CatalogoFormCard>
    </div>
  );
}
