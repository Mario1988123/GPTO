import type { Proyecto } from "@/lib/tipos/proyectos";
import { Field, Select, SubmitButton, Textarea } from "../catalogo/shared";

/**
 * Form de edición de un proyecto existente.
 * El selector de estado se quitó a propósito — el estado se maneja por workflow
 * (aceptar presupuesto, confirmar pedido, finalizar montaje, etc.).
 */
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
        <div className="sm:col-span-2">
          <Select
            label="Cliente *"
            name="cliente_id"
            required
            defaultValue={proyecto?.cliente_id ?? ""}
            options={[{ value: "", label: "— selecciona —" }, ...clientes.map((c) => ({ value: c.id, label: c.nombre }))]}
          />
        </div>
      </div>
      <Textarea label="Notas" name="notas" defaultValue={proyecto?.notas} />
      <SubmitButton label={submitLabel} />
    </form>
  );
}
