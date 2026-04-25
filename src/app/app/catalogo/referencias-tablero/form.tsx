"use client";

import { useState } from "react";
import type {
  Acabado,
  Material,
  Proveedor,
  ReferenciaTablero,
} from "@/lib/tipos/catalogo";
import { Field, SubmitButton, Textarea } from "../shared";
import { PickerTrigger } from "@/components/picker-modal";
import { Label } from "@/components/ui/label";
import { FotoUploader } from "@/components/foto-uploader";

type MatLite = Pick<Material, "id" | "nombre" | "categoria"> & { foto_url?: string | null };
type AcaLite = Pick<Acabado, "id" | "nombre"> & { foto_url?: string | null; color_hex?: string | null };
type ProvLite = Pick<Proveedor, "id" | "nombre">;

export function ReferenciaTableroForm({
  referencia,
  materiales,
  acabados,
  proveedores,
  action,
  submitLabel,
}: {
  referencia?: ReferenciaTablero | null;
  materiales: MatLite[];
  acabados: AcaLite[];
  proveedores: ProvLite[];
  action: (fd: FormData) => void | Promise<void>;
  submitLabel: string;
}) {
  const [materialId, setMaterialId] = useState(referencia?.material_id ?? "");
  const [acabadoId, setAcabadoId] = useState(referencia?.acabado_id ?? "");
  const [proveedorId, setProveedorId] = useState(referencia?.proveedor_id ?? "");

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Material *</Label>
          <PickerTrigger
            name="material_id"
            required
            value={materialId}
            onChange={setMaterialId}
            placeholder="— selecciona material —"
            title="Elegir material"
            items={materiales.map((m) => ({
              id: m.id,
              nombre: m.nombre,
              descripcion: m.categoria,
              foto_url: m.foto_url ?? null,
            }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Acabado *</Label>
          <PickerTrigger
            name="acabado_id"
            required
            value={acabadoId}
            onChange={setAcabadoId}
            placeholder="— selecciona acabado —"
            title="Elegir acabado"
            items={acabados.map((a) => ({
              id: a.id,
              nombre: a.nombre,
              foto_url: a.foto_url ?? null,
              color: a.color_hex ?? null,
            }))}
          />
        </div>
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
        <Field
          label="Ref. proveedor"
          name="referencia_proveedor"
          defaultValue={referencia?.referencia_proveedor}
          placeholder="Código catálogo"
        />
        <div className="sm:col-span-2">
          <FotoUploader
            name="foto_url"
            defaultUrl={(referencia as { foto_url?: string | null } | null)?.foto_url ?? null}
            carpeta="referencias-tablero"
            label="Fotografía de la referencia"
          />
        </div>
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
