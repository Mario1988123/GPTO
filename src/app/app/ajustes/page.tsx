import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Building2, Receipt, Ruler, Layers, FileText } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ToastFromSearchParams } from "../catalogo/shared";
import { actualizarAjustesEmpresa } from "./actions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AjustesPage() {
  const s = await createClient();
  const { data: empresa } = await s.from("empresas").select("id, nombre, config_empresa").limit(1).maybeSingle<{ id: string; nombre: string; config_empresa: Record<string, string | number | undefined> }>();
  if (!empresa) notFound();

  const cfg = empresa.config_empresa ?? {};

  const save = async (fd: FormData) => { "use server"; await actualizarAjustesEmpresa(empresa.id, fd); };

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <Suspense><ToastFromSearchParams /></Suspense>
      <PageHeader
        eyebrow="Configuración"
        title="Ajustes de la empresa"
        description="Estos datos aparecen en el PDF del presupuesto, el portal del cliente y la trazabilidad pública."
      />

      <form action={save} className="mt-8 space-y-6">
        <Section icon={Building2} title="Identidad y marca" desc="Cómo te presentas al cliente.">
          <Field name="nombre" label="Nombre de la empresa *" required defaultValue={empresa.nombre} />
          <Field name="logo_url" label="URL del logo" defaultValue={cfg.logo_url as string | undefined} placeholder="https://..." />
          <Field name="empresa_nif" label="NIF / CIF" defaultValue={cfg.empresa_nif as string | undefined} />
          <Field name="empresa_direccion" label="Dirección" defaultValue={cfg.empresa_direccion as string | undefined} className="sm:col-span-2" />
          <Field name="empresa_telefono" label="Teléfono" defaultValue={cfg.empresa_telefono as string | undefined} />
          <Field name="empresa_email" label="Email" type="email" defaultValue={cfg.empresa_email as string | undefined} />
        </Section>

        <Section icon={Receipt} title="Facturación" desc="Valores por defecto para presupuestos.">
          <Field name="precio_hora_mano_obra_eur" label="Precio hora mano de obra (€)" type="number" step="0.01" defaultValue={cfg.precio_hora_mano_obra_eur as number | undefined} placeholder="25" />
          <Field name="iva_porcentaje" label="IVA (%)" type="number" step="0.01" defaultValue={cfg.iva_porcentaje as number | undefined} placeholder="21" />
        </Section>

        <Section icon={FileText} title="Datos fiscales (RD 1619/2012)" desc="Aparecen en todas las facturas. Obligatorios para emitir.">
          <Field name="datos_fiscales_razon_social" label="Razón social *" defaultValue={(cfg.datos_fiscales as Record<string, string> | undefined)?.razon_social} placeholder="Carpintería ACME SL" />
          <Field name="datos_fiscales_nif" label="NIF / CIF *" defaultValue={(cfg.datos_fiscales as Record<string, string> | undefined)?.nif} placeholder="B12345678" />
          <Field name="datos_fiscales_domicilio" label="Domicilio fiscal *" defaultValue={(cfg.datos_fiscales as Record<string, string> | undefined)?.domicilio_fiscal} placeholder="Av. Industrial 5, 15011 A Coruña" className="sm:col-span-2" />
          <Field name="datos_fiscales_iban" label="IBAN" defaultValue={(cfg.datos_fiscales as Record<string, string> | undefined)?.iban} placeholder="ES00 ..." className="sm:col-span-2" />
        </Section>

        <Section icon={Ruler} title="Tablero y corte" desc="Dimensiones del tablero estándar y parámetros de corte. Afectan al nesting y a las particiones automáticas.">
          <Field name="tablero_ancho_cm" label="Tablero ancho total (cm)" type="number" defaultValue={cfg.tablero_ancho_cm as number | undefined} placeholder="244" />
          <Field name="tablero_alto_cm" label="Tablero alto total (cm)" type="number" defaultValue={cfg.tablero_alto_cm as number | undefined} placeholder="122" />
          <Field name="tablero_util_ancho_cm" label="Tablero útil ancho (cm)" type="number" defaultValue={cfg.tablero_util_ancho_cm as number | undefined} placeholder="240" />
          <Field name="tablero_util_alto_cm" label="Tablero útil alto (cm)" type="number" defaultValue={cfg.tablero_util_alto_cm as number | undefined} placeholder="120" />
          <Field name="kerf_mm" label="Kerf / corte (mm)" type="number" defaultValue={cfg.kerf_mm as number | undefined} placeholder="3" />
          <Field name="trasera_grosor_mm" label="Grosor trasera por defecto (mm)" type="number" defaultValue={cfg.trasera_grosor_mm as number | undefined} placeholder="10" />
          <Field name="fondo_armario_cm" label="Fondo armario por defecto (cm)" type="number" defaultValue={cfg.fondo_armario_cm as number | undefined} placeholder="61" />
        </Section>

        <Section icon={Layers} title="Módulos apilados" desc="Herraje que se añade automáticamente al presupuesto cuando un módulo se fabrica en varias partes apiladas.">
          <Field
            name="herraje_union_default_id"
            label="ID herraje de unión"
            defaultValue={cfg.herraje_union_default_id as string | undefined}
            placeholder="UUID del herraje (ver Catálogo → Herrajes)"
            className="sm:col-span-2"
          />
          <Field
            name="herrajes_por_union"
            label="Unidades por junta"
            type="number"
            step="1"
            defaultValue={cfg.herrajes_por_union as number | undefined}
            placeholder="4"
          />
        </Section>

        <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 p-4">
          <Button type="submit" size="lg">Guardar ajustes</Button>
          <p className="text-xs text-muted-foreground">Los cambios se aplican al instante en PDF, portal y cálculos.</p>
        </div>
      </form>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  desc,
  children,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
          <Icon className="h-5 w-5 text-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
        </div>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  name,
  label,
  type = "text",
  defaultValue,
  placeholder,
  step,
  required,
  className = "",
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string | number | undefined;
  placeholder?: string;
  step?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={name} className="block text-xs font-semibold text-muted-foreground">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        step={step}
        required={required}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition placeholder:text-muted-foreground/60 focus:border-ring focus:ring-4 focus:ring-ring/15"
      />
    </div>
  );
}
