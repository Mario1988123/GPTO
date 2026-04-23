import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ToastFromSearchParams } from "../catalogo/shared";
import { actualizarAjustesEmpresa } from "./actions";

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
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">Ajustes de la empresa</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Estos datos aparecen en el PDF del presupuesto, el portal del cliente y la trazabilidad pública.
      </p>

      <form action={save} className="mt-6 space-y-6">
        {/* Identidad */}
        <Section title="Identidad y marca" desc="Cómo te presentas al cliente.">
          <Field name="nombre" label="Nombre de la empresa *" required defaultValue={empresa.nombre} />
          <Field name="logo_url" label="URL del logo" defaultValue={cfg.logo_url as string | undefined} placeholder="https://..." />
          <Field name="empresa_nif" label="NIF / CIF" defaultValue={cfg.empresa_nif as string | undefined} />
          <Field name="empresa_direccion" label="Dirección" defaultValue={cfg.empresa_direccion as string | undefined} className="sm:col-span-2" />
          <Field name="empresa_telefono" label="Teléfono" defaultValue={cfg.empresa_telefono as string | undefined} />
          <Field name="empresa_email" label="Email" type="email" defaultValue={cfg.empresa_email as string | undefined} />
        </Section>

        {/* Facturación */}
        <Section title="Facturación" desc="Valores por defecto para presupuestos.">
          <Field name="precio_hora_mano_obra_eur" label="Precio hora mano de obra (€)" type="number" step="0.01" defaultValue={cfg.precio_hora_mano_obra_eur as number | undefined} placeholder="25" />
          <Field name="iva_porcentaje" label="IVA (%)" type="number" step="0.01" defaultValue={cfg.iva_porcentaje as number | undefined} placeholder="21" />
        </Section>

        {/* Tablero y corte */}
        <Section title="Tablero y corte" desc="Dimensiones del tablero estándar y parámetros de corte. Afectan al nesting y a las particiones automáticas.">
          <Field name="tablero_ancho_cm" label="Tablero ancho total (cm)" type="number" defaultValue={cfg.tablero_ancho_cm as number | undefined} placeholder="244" />
          <Field name="tablero_alto_cm" label="Tablero alto total (cm)" type="number" defaultValue={cfg.tablero_alto_cm as number | undefined} placeholder="122" />
          <Field name="tablero_util_ancho_cm" label="Tablero útil ancho (cm)" type="number" defaultValue={cfg.tablero_util_ancho_cm as number | undefined} placeholder="240" />
          <Field name="tablero_util_alto_cm" label="Tablero útil alto (cm)" type="number" defaultValue={cfg.tablero_util_alto_cm as number | undefined} placeholder="120" />
          <Field name="kerf_mm" label="Kerf / corte (mm)" type="number" defaultValue={cfg.kerf_mm as number | undefined} placeholder="3" />
          <Field name="trasera_grosor_mm" label="Grosor trasera por defecto (mm)" type="number" defaultValue={cfg.trasera_grosor_mm as number | undefined} placeholder="10" />
          <Field name="fondo_armario_cm" label="Fondo armario por defecto (cm)" type="number" defaultValue={cfg.fondo_armario_cm as number | undefined} placeholder="61" />
        </Section>

        {/* Módulos apilados */}
        <Section title="Módulos apilados" desc="Herraje que se añade automáticamente al presupuesto cuando un módulo se fabrica en varias partes apiladas (ej. por exceder el tablero útil).">
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

        <div className="flex items-center gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <button type="submit" className="rounded-md bg-zinc-900 px-5 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
            Guardar ajustes
          </button>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Los cambios se aplican al instante en PDF, portal y cálculos.</p>
        </div>
      </form>
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{desc}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

function Field({
  name, label, type = "text", defaultValue, placeholder, step, required, className = "",
}: {
  name: string; label: string; type?: string; defaultValue?: string | number | undefined;
  placeholder?: string; step?: string; required?: boolean; className?: string;
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label htmlFor={name} className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
      <input
        id={name} name={name} type={type} step={step} required={required}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
      />
    </div>
  );
}
