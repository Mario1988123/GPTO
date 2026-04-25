"use client";

import { useState } from "react";
import type { Acabado, Canto, Proveedor } from "@/lib/tipos/catalogo";
import { Field, SubmitButton, Textarea } from "../shared";
import { PickerTrigger } from "@/components/picker-modal";
import { Label } from "@/components/ui/label";

type AcaLite = Pick<Acabado, "id" | "nombre"> & { foto_url?: string | null; color_hex?: string | null };

export function CantoForm({
  canto,
  acabados,
  proveedores,
  action,
  submitLabel,
}: {
  canto?: Canto | null;
  acabados: AcaLite[];
  proveedores: Pick<Proveedor, "id" | "nombre">[];
  action: (fd: FormData) => void | Promise<void>;
  submitLabel: string;
}) {
  const [acabadoId, setAcabadoId] = useState(canto?.acabado_id ?? "");
  const [proveedorId, setProveedorId] = useState(canto?.proveedor_id ?? "");

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre *" name="nombre" defaultValue={canto?.nombre} required />
        <Field label="Precio (€/ml) *" name="precio_ml" type="number" step="0.01" defaultValue={canto?.precio_ml} required />
        <div className="space-y-1.5">
          <Label>Acabado</Label>
          <PickerTrigger
            name="acabado_id"
            value={acabadoId}
            onChange={setAcabadoId}
            placeholder="— aplica a todos —"
            title="Elegir acabado"
            items={acabados.map((a) => ({
              id: a.id,
              nombre: a.nombre,
              foto_url: a.foto_url ?? null,
              color: a.color_hex ?? null,
            }))}
          />
        </div>
        <Field label="Grosor (mm)" name="grosor_mm" type="number" step="1" defaultValue={canto?.grosor_mm ?? ""} placeholder="vacío = aplica a todos" />
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
        <Field label="Ref. proveedor" name="referencia_proveedor" defaultValue={canto?.referencia_proveedor} />
      </div>
      <Textarea label="Notas" name="notas" defaultValue={canto?.notas} />
      <SubmitButton label={submitLabel} />
    </form>
  );
}
