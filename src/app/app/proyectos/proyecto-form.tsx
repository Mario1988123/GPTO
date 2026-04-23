import type { Proyecto } from "@/lib/tipos/proyectos";
import { ESTADOS_PROYECTO } from "@/lib/tipos/proyectos";
import { Field, Select, SubmitButton, Textarea } from "../catalogo/shared";

export function ProyectoForm({
  proyecto,
  clientes,
  action,
  submitLabel,
}: {
  proyecto?: Proyecto | null;
  clientes: { id: string; nombre: string }[];
  action: (fd: FormData) => void | Promise<void>;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre *" name="nombre" defaultValue={proyecto?.nombre} required className="sm:col-span-2" />
        <Select
          label="Cliente *"
          name="cliente_id"
          required
          defaultValue={proyecto?.cliente_id ?? ""}
          options={[{ value: "", label: "— selecciona —" }, ...clientes.map((c) => ({ value: c.id, label: c.nombre }))]}
        />
        <Select
          label="Estado"
          name="estado"
          defaultValue={proyecto?.estado ?? "borrador"}
          options={ESTADOS_PROYECTO.map((e) => ({ value: e.value, label: e.label }))}
        />
      </div>
      <Textarea label="Notas" name="notas" defaultValue={proyecto?.notas} />
      <SubmitButton label={submitLabel} />
    </form>
  );
}
