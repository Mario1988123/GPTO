import type { Herraje, Proveedor } from "@/lib/tipos/catalogo";
import { NINGUNA, TIPOS_HERRAJE } from "@/lib/tipos/catalogo";
import { Field, Select, SubmitButton, Textarea } from "../shared";

export function HerrajeForm({
  herraje,
  proveedores,
  action,
  submitLabel,
}: {
  herraje?: Herraje | null;
  proveedores: Pick<Proveedor, "id" | "nombre">[];
  action: (fd: FormData) => void | Promise<void>;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre *" name="nombre" defaultValue={herraje?.nombre} required />
        <Select
          label="Tipo *"
          name="tipo"
          required
          defaultValue={herraje?.tipo ?? "bisagra"}
          options={TIPOS_HERRAJE}
        />
        <Field label="Precio (€/unidad) *" name="precio_unidad" type="number" step="0.01" defaultValue={herraje?.precio_unidad} required />
        <Field label="Stock disponible" name="stock_disponible" type="number" step="1" defaultValue={herraje?.stock_disponible ?? 0} />
        <Select
          label="Proveedor"
          name="proveedor_id"
          defaultValue={herraje?.proveedor_id ?? NINGUNA}
          options={[
            { value: NINGUNA, label: "— sin proveedor —" },
            ...proveedores.map((p) => ({ value: p.id, label: p.nombre })),
          ]}
        />
        <Field label="Ref. proveedor" name="referencia_proveedor" defaultValue={herraje?.referencia_proveedor} />
      </div>
      <Textarea label="Notas" name="notas" defaultValue={herraje?.notas} />
      <SubmitButton label={submitLabel} />
    </form>
  );
}
