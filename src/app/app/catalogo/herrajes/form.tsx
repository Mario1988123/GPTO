"use client";

import { useState } from "react";
import type { Herraje, Proveedor } from "@/lib/tipos/catalogo";
import { TIPOS_HERRAJE } from "@/lib/tipos/catalogo";
import { Field, Select, SubmitButton, Textarea } from "../shared";
import { PickerTrigger } from "@/components/picker-modal";
import { Label } from "@/components/ui/label";
import { FotoUploader } from "@/components/foto-uploader";

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
  const [proveedorId, setProveedorId] = useState(herraje?.proveedor_id ?? "");

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
        <div className="space-y-1.5">
          <Label>Proveedor</Label>
          <PickerTrigger
            name="proveedor_id"
            value={proveedorId}
            onChange={setProveedorId}
            placeholder="— sin proveedor —"
            title="Elegir proveedor"
            items={proveedores.map((p) => ({ id: p.id, nombre: p.nombre }))}
          />
        </div>
        <Field label="Ref. proveedor" name="referencia_proveedor" defaultValue={herraje?.referencia_proveedor} />
        <div className="sm:col-span-2">
          <FotoUploader
            name="foto_url"
            defaultUrl={(herraje as { foto_url?: string | null } | null)?.foto_url ?? null}
            carpeta="herrajes"
            label="Fotografía del herraje"
          />
        </div>
      </div>
      <Textarea label="Notas" name="notas" defaultValue={herraje?.notas} />
      <SubmitButton label={submitLabel} />
    </form>
  );
}
