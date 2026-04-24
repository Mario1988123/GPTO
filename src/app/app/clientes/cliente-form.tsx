"use client";

import { useState, useTransition } from "react";
import type { Cliente, Direccion } from "@/lib/tipos/cliente";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type Props = {
  cliente?: Cliente | null;
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
};

export function ClienteForm({ cliente, action, submitLabel }: Props) {
  const [pending, startTransition] = useTransition();
  const [local, setLocal] = useState(() => ({
    nombre: cliente?.nombre ?? "",
    email: cliente?.email ?? "",
    telefono: cliente?.telefono ?? "",
    nif: cliente?.nif ?? "",
    notas: cliente?.notas ?? "",
    direccion: (cliente?.direccion ?? {}) as Direccion,
  }));

  return (
    <form action={(fd) => startTransition(() => action(fd))} className="space-y-8">
      <section className="space-y-4">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Datos de contacto
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre *" name="nombre" value={local.nombre} required onChange={(v) => setLocal({ ...local, nombre: v })} />
          <Field label="NIF / DNI / CIF" name="nif" value={local.nif} onChange={(v) => setLocal({ ...local, nif: v })} />
          <Field label="Email" name="email" type="email" value={local.email} onChange={(v) => setLocal({ ...local, email: v })} />
          <Field label="Teléfono" name="telefono" value={local.telefono} onChange={(v) => setLocal({ ...local, telefono: v })} />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Dirección
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Calle"
            name="direccion.calle"
            value={local.direccion.calle ?? ""}
            className="sm:col-span-2"
            onChange={(v) => setLocal({ ...local, direccion: { ...local.direccion, calle: v } })}
          />
          <Field
            label="Número"
            name="direccion.numero"
            value={local.direccion.numero ?? ""}
            onChange={(v) => setLocal({ ...local, direccion: { ...local.direccion, numero: v } })}
          />
          <Field
            label="Piso / puerta"
            name="direccion.piso"
            value={local.direccion.piso ?? ""}
            onChange={(v) => setLocal({ ...local, direccion: { ...local.direccion, piso: v } })}
          />
          <Field
            label="CP"
            name="direccion.cp"
            value={local.direccion.cp ?? ""}
            onChange={(v) => setLocal({ ...local, direccion: { ...local.direccion, cp: v } })}
          />
          <Field
            label="Ciudad"
            name="direccion.ciudad"
            value={local.direccion.ciudad ?? ""}
            onChange={(v) => setLocal({ ...local, direccion: { ...local.direccion, ciudad: v } })}
          />
          <Field
            label="Provincia"
            name="direccion.provincia"
            value={local.direccion.provincia ?? ""}
            onChange={(v) => setLocal({ ...local, direccion: { ...local.direccion, provincia: v } })}
          />
          <Field
            label="País"
            name="direccion.pais"
            value={local.direccion.pais ?? ""}
            onChange={(v) => setLocal({ ...local, direccion: { ...local.direccion, pais: v } })}
          />
        </div>
      </section>

      <section className="space-y-2">
        <Label htmlFor="notas" className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Notas
        </Label>
        <Textarea
          id="notas"
          name="notas"
          rows={4}
          value={local.notas}
          onChange={(e) => setLocal({ ...local, notas: e.target.value })}
          placeholder="Observaciones sobre este cliente, contacto preferido, historial..."
        />
      </section>

      <div className="flex items-center gap-3 border-t border-border pt-5">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  value,
  type = "text",
  required = false,
  className = "",
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  type?: string;
  required?: boolean;
  className?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
