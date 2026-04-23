import type { Acabado } from "@/lib/tipos/catalogo";
import { Field, SubmitButton } from "../shared";

export function AcabadoForm({
  acabado,
  action,
  submitLabel,
}: {
  acabado?: Acabado | null;
  action: (fd: FormData) => void | Promise<void>;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre *" name="nombre" defaultValue={acabado?.nombre} required />
        <Field label="Código proveedor" name="codigo" defaultValue={acabado?.codigo} placeholder="ej: Egger U123" />
        <Field label="Color (hex)" name="color_hex" defaultValue={acabado?.color_hex} placeholder="#D4C5A8" />
        <Field label="Textura" name="textura" defaultValue={acabado?.textura} placeholder="ej: poro abierto" />
      </div>
      <SubmitButton label={submitLabel} />
    </form>
  );
}
