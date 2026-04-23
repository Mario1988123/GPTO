import type { ReferenciaTablero } from "@/lib/tipos/catalogo";
import { NINGUNA } from "@/lib/tipos/catalogo";
import type { TipoModulo } from "@/lib/tipos/tipos_modulo";
import { Field, Select, SubmitButton, Textarea } from "../catalogo/shared";

type RefOption = Pick<ReferenciaTablero, "id" | "grosor_mm"> & {
  materiales: { nombre: string } | null;
  acabados: { nombre: string } | null;
};

export function TipoModuloForm({
  tipo,
  referencias,
  action,
  submitLabel,
}: {
  tipo?: TipoModulo | null;
  referencias: RefOption[];
  action: (fd: FormData) => void | Promise<void>;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre *" name="nombre" defaultValue={tipo?.nombre} required className="sm:col-span-2" />
        <Field label="Ancho default (mm) *" name="ancho_default_mm" type="number" step="1" defaultValue={tipo?.ancho_default_mm ?? 600} required />
        <Field label="Alto default (mm) *" name="alto_default_mm" type="number" step="1" defaultValue={tipo?.alto_default_mm ?? 700} required />
        <Field label="Fondo default (mm) *" name="fondo_default_mm" type="number" step="1" defaultValue={tipo?.fondo_default_mm ?? 400} required />
        <Field
          label="Horas fabricación (default)"
          name="horas_fabricacion_default"
          type="number"
          step="0.25"
          defaultValue={tipo?.horas_fabricacion_default ?? 1}
        />
        <Select
          label="Referencia tablero default"
          name="referencia_tablero_default_id"
          defaultValue={tipo?.referencia_tablero_default_id ?? NINGUNA}
          options={[
            { value: NINGUNA, label: "— sin default (elegir al configurar) —" },
            ...referencias.map((r) => ({
              value: r.id,
              label: `${r.materiales?.nombre ?? "?"} · ${r.acabados?.nombre ?? "?"} · ${r.grosor_mm} mm`,
            })),
          ]}
        />
      </div>
      <Textarea label="Descripción" name="descripcion" defaultValue={tipo?.descripcion} />
      <SubmitButton label={submitLabel} />
    </form>
  );
}
