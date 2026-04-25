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
    es_empresa: cliente?.es_empresa ?? false,
    nombre: cliente?.nombre ?? "",
    apellido1: cliente?.apellido1 ?? "",
    apellido2: cliente?.apellido2 ?? "",
    email: cliente?.email ?? "",
    telefono: cliente?.telefono ?? "",
    nif: cliente?.nif ?? "",
    contacto_persona: cliente?.contacto_persona ?? "",
    contacto_telefono: cliente?.contacto_telefono ?? "",
    contacto_email: cliente?.contacto_email ?? "",
    contacto2_persona: cliente?.contacto2_persona ?? "",
    contacto2_telefono: cliente?.contacto2_telefono ?? "",
    contacto2_email: cliente?.contacto2_email ?? "",
    etiquetas: (cliente?.etiquetas ?? []).join(", "),
    origen: cliente?.origen ?? "",
    foto_url: cliente?.foto_url ?? "",
    proximo_seguimiento: cliente?.proximo_seguimiento ?? "",
    notas: cliente?.notas ?? "",
    direccion: (cliente?.direccion ?? {}) as Direccion,
  }));

  return (
    <form action={(fd) => startTransition(() => action(fd))} className="space-y-8">
      {/* Tipo de cliente */}
      <section className="space-y-3">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Tipo
        </h3>
        <input type="hidden" name="es_empresa" value={String(local.es_empresa)} />
        <div className="inline-flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setLocal({ ...local, es_empresa: false })}
            className={`rounded-md px-4 py-1.5 text-xs font-semibold transition ${
              !local.es_empresa ? "bg-background shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Particular
          </button>
          <button
            type="button"
            onClick={() => setLocal({ ...local, es_empresa: true })}
            className={`rounded-md px-4 py-1.5 text-xs font-semibold transition ${
              local.es_empresa ? "bg-background shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Empresa
          </button>
        </div>
      </section>

      {/* Datos principales */}
      <section className="space-y-4">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {local.es_empresa ? "Datos de la empresa" : "Datos del particular"}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={local.es_empresa ? "Razón social *" : "Nombre *"}
            name="nombre"
            value={local.nombre}
            required
            onChange={(v) => setLocal({ ...local, nombre: v })}
          />
          <Field label={local.es_empresa ? "CIF / NIF" : "DNI / NIF"} name="nif" value={local.nif} onChange={(v) => setLocal({ ...local, nif: v })} />
          {!local.es_empresa && (
            <>
              <Field
                label="Primer apellido *"
                name="apellido1"
                value={local.apellido1}
                required
                onChange={(v) => setLocal({ ...local, apellido1: v })}
              />
              <Field
                label="Segundo apellido"
                name="apellido2"
                value={local.apellido2}
                onChange={(v) => setLocal({ ...local, apellido2: v })}
              />
            </>
          )}
          <Field label="Email" name="email" type="email" value={local.email} onChange={(v) => setLocal({ ...local, email: v })} />
          <Field label="Teléfono *" name="telefono" value={local.telefono} required onChange={(v) => setLocal({ ...local, telefono: v })} />
        </div>
      </section>

      {/* Persona de contacto (obligatoria en empresa; segundo en particular) */}
      <section className="space-y-4">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {local.es_empresa ? "Persona de contacto *" : "Segunda persona de contacto (opcional)"}
        </h3>
        <p className="text-xs text-muted-foreground">
          {local.es_empresa
            ? "Persona física responsable del proyecto en la empresa."
            : "Normalmente la pareja o familiar con quien también se puede contactar."}
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label={local.es_empresa ? "Nombre y apellidos *" : "Nombre y apellidos"}
            name="contacto_persona"
            value={local.contacto_persona}
            required={local.es_empresa}
            onChange={(v) => setLocal({ ...local, contacto_persona: v })}
          />
          <Field
            label="Teléfono"
            name="contacto_telefono"
            value={local.contacto_telefono}
            onChange={(v) => setLocal({ ...local, contacto_telefono: v })}
          />
          <Field
            label="Email"
            name="contacto_email"
            type="email"
            value={local.contacto_email}
            onChange={(v) => setLocal({ ...local, contacto_email: v })}
          />
        </div>
        {local.es_empresa && (
          <div className="mt-4 space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Contacto secundario (opcional)
            </h4>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Nombre y apellidos" name="contacto2_persona" value={local.contacto2_persona} onChange={(v) => setLocal({ ...local, contacto2_persona: v })} />
              <Field label="Teléfono" name="contacto2_telefono" value={local.contacto2_telefono} onChange={(v) => setLocal({ ...local, contacto2_telefono: v })} />
              <Field label="Email" name="contacto2_email" type="email" value={local.contacto2_email} onChange={(v) => setLocal({ ...local, contacto2_email: v })} />
            </div>
          </div>
        )}
        {!local.es_empresa && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Teléfono 2º contacto" name="contacto2_telefono" value={local.contacto2_telefono} onChange={(v) => setLocal({ ...local, contacto2_telefono: v })} />
            <Field label="Email 2º contacto" name="contacto2_email" type="email" value={local.contacto2_email} onChange={(v) => setLocal({ ...local, contacto2_email: v })} />
          </div>
        )}
      </section>

      {/* Dirección */}
      <section className="space-y-4">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Dirección
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Calle" name="direccion.calle" value={local.direccion.calle ?? ""} className="sm:col-span-2" onChange={(v) => setLocal({ ...local, direccion: { ...local.direccion, calle: v } })} />
          <Field label="Número" name="direccion.numero" value={local.direccion.numero ?? ""} onChange={(v) => setLocal({ ...local, direccion: { ...local.direccion, numero: v } })} />
          <Field label="Piso / puerta" name="direccion.piso" value={local.direccion.piso ?? ""} onChange={(v) => setLocal({ ...local, direccion: { ...local.direccion, piso: v } })} />
          <Field label="CP" name="direccion.cp" value={local.direccion.cp ?? ""} onChange={(v) => setLocal({ ...local, direccion: { ...local.direccion, cp: v } })} />
          <Field label="Ciudad" name="direccion.ciudad" value={local.direccion.ciudad ?? ""} onChange={(v) => setLocal({ ...local, direccion: { ...local.direccion, ciudad: v } })} />
          <Field label="Provincia" name="direccion.provincia" value={local.direccion.provincia ?? ""} onChange={(v) => setLocal({ ...local, direccion: { ...local.direccion, provincia: v } })} />
          <Field label="País" name="direccion.pais" value={local.direccion.pais ?? ""} onChange={(v) => setLocal({ ...local, direccion: { ...local.direccion, pais: v } })} />
        </div>
      </section>

      {/* CRM */}
      <section className="space-y-4">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          CRM
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Etiquetas (separadas por comas)"
            name="etiquetas"
            value={local.etiquetas}
            onChange={(v) => setLocal({ ...local, etiquetas: v })}
          />
          <Field
            label="Origen / cómo nos conoció"
            name="origen"
            value={local.origen}
            onChange={(v) => setLocal({ ...local, origen: v })}
          />
          <Field
            label="URL avatar / logo"
            name="foto_url"
            value={local.foto_url}
            onChange={(v) => setLocal({ ...local, foto_url: v })}
          />
          <div className="space-y-1.5">
            <Label htmlFor="proximo_seguimiento">Próximo seguimiento</Label>
            <Input
              id="proximo_seguimiento"
              name="proximo_seguimiento"
              type="date"
              value={local.proximo_seguimiento}
              onChange={(e) => setLocal({ ...local, proximo_seguimiento: e.target.value })}
            />
          </div>
        </div>
      </section>

      {/* Notas */}
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
