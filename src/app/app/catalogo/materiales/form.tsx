import type { Material } from "@/lib/tipos/catalogo";
import { CATEGORIAS_MATERIAL } from "@/lib/tipos/catalogo";
import { Field, Select, SubmitButton, Textarea } from "../shared";
import { FotoUploader } from "@/components/foto-uploader";

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
        <div className="sm:col-span-2">
          <FotoUploader
            name="foto_url"
            defaultUrl={(material as { foto_url?: string | null } | null)?.foto_url ?? null}
            carpeta="materiales"
            label="Fotografía del material"
          />
        </div>
      </div>
      <Textarea label="Descripción" name="descripcion" defaultValue={material?.descripcion} />
      <SubmitButton label={submitLabel} />
    </form>
  );
}
