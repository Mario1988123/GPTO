import type {
  Acabado,
  Material,
  Proveedor,
  ReferenciaTablero,
} from "@/lib/tipos/catalogo";
import { NINGUNA } from "@/lib/tipos/catalogo";
import { Field, Select, SubmitButton, Textarea } from "../shared";

export function ReferenciaTableroForm({
  referencia,
  materiales,
  acabados,
  proveedores,
  action,
  submitLabel,
}: {
  referencia?: ReferenciaTablero | null;
  materiales: Pick<Material, "id" | "nombre" | "categoria">[];
  acabados: Pick<Acabado, "id" | "nombre">[];
  proveedores: Pick<Proveedor, "id" | "nombre">[];
  action: (fd: FormData) => void | Promise<void>;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Material *"
          name="material_id"
          required
          defaultValue={referencia?.material_id ?? ""}
          options={[
            { value: "", label: "— selecciona —" },
            ...materiales.map((m) => ({
              value: m.id,
              label: `${m.nombre} (${m.categoria})`,
            })),
          ]}
        />
        <Select
          label="Acabado *"
          name="acabado_id"
          required
          defaultValue={referencia?.acabado_id ?? ""}
          options={[
            { value: "", label: "— selecciona —" },
            ...acabados.map((a) => ({ value: a.id, label: a.nombre })),
          ]}
        />
        <Field
          label="Grosor (mm) *"
          name="grosor_mm"
          type="number"
          step="1"
          defaultValue={referencia?.grosor_mm}
          required
        />
        <Field
          label="Precio (€/m²) *"
          name="precio_m2"
          type="number"
          step="0.01"
          defaultValue={referencia?.precio_m2}
          required
        />
        <Select
          label="Proveedor"
          name="proveedor_id"
          defaultValue={referencia?.proveedor_id ?? NINGUNA}
          options={[
            { value: NINGUNA, label: "— sin proveedor —" },
            ...proveedores.map((p) => ({ value: p.id, label: p.nombre })),
          ]}
        />
        <Field
          label="Ref. proveedor"
          name="referencia_proveedor"
          defaultValue={referencia?.referencia_proveedor}
          placeholder="Código catálogo"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="respeta_veta"
          defaultChecked={referencia?.respeta_veta ?? false}
        />
        <span>Respeta veta (el nesting orientará las piezas)</span>
      </label>
      <Textarea label="Notas" name="notas" defaultValue={referencia?.notas} />
      <SubmitButton label={submitLabel} />
    </form>
  );
}
