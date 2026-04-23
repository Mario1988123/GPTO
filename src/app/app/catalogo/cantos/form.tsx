import type { Acabado, Canto, Proveedor } from "@/lib/tipos/catalogo";
import { NINGUNA } from "@/lib/tipos/catalogo";
import { Field, Select, SubmitButton, Textarea } from "../shared";

export function CantoForm({
  canto,
  acabados,
  proveedores,
  action,
  submitLabel,
}: {
  canto?: Canto | null;
  acabados: Pick<Acabado, "id" | "nombre">[];
  proveedores: Pick<Proveedor, "id" | "nombre">[];
  action: (fd: FormData) => void | Promise<void>;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre *" name="nombre" defaultValue={canto?.nombre} required />
        <Field label="Precio (€/ml) *" name="precio_ml" type="number" step="0.01" defaultValue={canto?.precio_ml} required />
        <Select
          label="Acabado"
          name="acabado_id"
          defaultValue={canto?.acabado_id ?? NINGUNA}
          options={[
            { value: NINGUNA, label: "— aplica a todos —" },
            ...acabados.map((a) => ({ value: a.id, label: a.nombre })),
          ]}
        />
        <Field label="Grosor (mm)" name="grosor_mm" type="number" step="1" defaultValue={canto?.grosor_mm ?? ""} placeholder="vacío = aplica a todos" />
        <Select
          label="Proveedor"
          name="proveedor_id"
          defaultValue={canto?.proveedor_id ?? NINGUNA}
          options={[
            { value: NINGUNA, label: "— sin proveedor —" },
            ...proveedores.map((p) => ({ value: p.id, label: p.nombre })),
          ]}
        />
        <Field label="Ref. proveedor" name="referencia_proveedor" defaultValue={canto?.referencia_proveedor} />
      </div>
      <Textarea label="Notas" name="notas" defaultValue={canto?.notas} />
      <SubmitButton label={submitLabel} />
    </form>
  );
}
