import type { Proveedor } from "@/lib/tipos/catalogo";
import { Field, SubmitButton, Textarea } from "../shared";

export function ProveedorForm({
  proveedor,
  action,
  submitLabel,
}: {
  proveedor?: Proveedor | null;
  action: (fd: FormData) => void | Promise<void>;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre *" name="nombre" defaultValue={proveedor?.nombre} required />
        <Field label="Contacto" name="contacto" defaultValue={proveedor?.contacto} />
        <Field label="Email" name="email" type="email" defaultValue={proveedor?.email} />
        <Field label="Teléfono" name="telefono" defaultValue={proveedor?.telefono} />
      </div>
      <Textarea label="Notas" name="notas" defaultValue={proveedor?.notas} />
      <SubmitButton label={submitLabel} />
    </form>
  );
}
