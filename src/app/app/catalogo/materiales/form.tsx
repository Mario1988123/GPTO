import type { Material } from "@/lib/tipos/catalogo";
import { CATEGORIAS_MATERIAL } from "@/lib/tipos/catalogo";
import { Field, Select, SubmitButton, Textarea } from "../shared";

export function MaterialForm({
  material,
  action,
  submitLabel,
}: {
  material?: Material | null;
  action: (fd: FormData) => void | Promise<void>;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre *" name="nombre" defaultValue={material?.nombre} required />
        <Select
          label="Categoría *"
          name="categoria"
          required
          defaultValue={material?.categoria ?? "tablero"}
          options={CATEGORIAS_MATERIAL}
        />
      </div>
      <Textarea label="Descripción" name="descripcion" defaultValue={material?.descripcion} />
      <SubmitButton label={submitLabel} />
    </form>
  );
}
