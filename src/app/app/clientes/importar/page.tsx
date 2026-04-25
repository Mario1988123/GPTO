import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, FileUp, Download } from "lucide-react";
import { ToastFromSearchParams } from "../toasts";
import { ImportarForm } from "./form";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const PLANTILLA = `nombre,apellido1,apellido2,es_empresa,email,telefono,nif,contacto_persona,contacto_telefono,contacto_email,etiquetas,origen,calle,numero,piso,cp,ciudad,provincia,notas
Marta,García,López,no,marta@ejemplo.com,600111222,12345678A,,,,VIP;recomendada,instagram,Calle Mayor,12,3B,28013,Madrid,Madrid,
Carpinterías Ortigueira SL,,,si,info@ortigueira.com,981555444,B70123456,Mario Ortigueira,600999888,mario@ortigueira.com,proveedor,feria,Av. Industrial,5,,15011,A Coruña,A Coruña,Pago a 30 días`;

export default async function ImportarClientesPage() {
  // Sirve la plantilla como data URL para que descargue al click sin pasar por API.
  const plantillaDataUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(PLANTILLA)}`;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>

      <Link
        href="/app/clientes"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a clientes
      </Link>

      <PageHeader
        eyebrow="CRM"
        title="Importar clientes desde CSV"
        description="Sube un archivo CSV con tus clientes existentes. Acepta separador coma o punto y coma."
        actions={
          <a
            href={plantillaDataUrl}
            download="plantilla-clientes.csv"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Download className="h-3.5 w-3.5" />
            Plantilla
          </a>
        }
      />

      <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
            <FileUp className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold">Cómo funciona</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              <li>Descarga la plantilla, ábrela en Excel/Google Sheets, rellena tus clientes y guarda como CSV.</li>
              <li>Las columnas obligatorias son <strong>nombre</strong> y <strong>telefono</strong> (más <strong>apellido1</strong> si no es empresa).</li>
              <li>El campo <code className="rounded bg-muted px-1">es_empresa</code> acepta <em>sí/no</em>, <em>true/false</em> o <em>1/0</em>.</li>
              <li>Las <code className="rounded bg-muted px-1">etiquetas</code> se separan por coma, punto y coma o barra (ej: <em>VIP;recomendado</em>).</li>
              <li>Si una fila falla por validación, se omite y verás el motivo. Las que pasen se importan igualmente.</li>
            </ul>
          </div>
        </div>

        <ImportarForm />
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-muted/20 p-5 text-xs text-muted-foreground">
        <p className="mb-2 font-semibold text-foreground">Columnas reconocidas (alias incluidos)</p>
        <p className="font-mono leading-relaxed">
          nombre · apellido1 · apellido2 · es_empresa · email · telefono · nif · contacto_persona · contacto_telefono · contacto_email · etiquetas · origen · notas · calle · numero · piso · cp · ciudad · provincia
        </p>
      </section>
    </div>
  );
}
