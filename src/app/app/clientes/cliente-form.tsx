"use client";

import { useState, useTransition } from "react";
import type { Cliente, Direccion } from "@/lib/tipos/cliente";

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
    <form
      action={(fd) => startTransition(() => action(fd))}
      className="space-y-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre *" name="nombre" value={local.nombre} required onChange={(v) => setLocal({ ...local, nombre: v })} />
        <Field label="NIF / DNI / CIF" name="nif" value={local.nif} onChange={(v) => setLocal({ ...local, nif: v })} />
        <Field label="Email" name="email" type="email" value={local.email} onChange={(v) => setLocal({ ...local, email: v })} />
        <Field label="Teléfono" name="telefono" value={local.telefono} onChange={(v) => setLocal({ ...local, telefono: v })} />
      </div>

      <fieldset className="space-y-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <legend className="px-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Dirección
        </legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Calle"
            name="direccion.calle"
            value={local.direccion.calle ?? ""}
            className="sm:col-span-2"
            onChange={(v) =>
              setLocal({ ...local, direccion: { ...local.direccion, calle: v } })
            }
          />
          <Field
            label="Número"
            name="direccion.numero"
            value={local.direccion.numero ?? ""}
            onChange={(v) =>
              setLocal({ ...local, direccion: { ...local.direccion, numero: v } })
            }
          />
          <Field
            label="Piso / puerta"
            name="direccion.piso"
            value={local.direccion.piso ?? ""}
            onChange={(v) =>
              setLocal({ ...local, direccion: { ...local.direccion, piso: v } })
            }
          />
          <Field
            label="CP"
            name="direccion.cp"
            value={local.direccion.cp ?? ""}
            onChange={(v) =>
              setLocal({ ...local, direccion: { ...local.direccion, cp: v } })
            }
          />
          <Field
            label="Ciudad"
            name="direccion.ciudad"
            value={local.direccion.ciudad ?? ""}
            onChange={(v) =>
              setLocal({ ...local, direccion: { ...local.direccion, ciudad: v } })
            }
          />
          <Field
            label="Provincia"
            name="direccion.provincia"
            value={local.direccion.provincia ?? ""}
            onChange={(v) =>
              setLocal({
                ...local,
                direccion: { ...local.direccion, provincia: v },
              })
            }
          />
          <Field
            label="País"
            name="direccion.pais"
            value={local.direccion.pais ?? ""}
            onChange={(v) =>
              setLocal({ ...local, direccion: { ...local.direccion, pais: v } })
            }
          />
        </div>
      </fieldset>

      <div className="space-y-2">
        <label
          htmlFor="notas"
          className="block text-sm font-medium text-zinc-900 dark:text-zinc-100"
        >
          Notas
        </label>
        <textarea
          id="notas"
          name="notas"
          rows={3}
          value={local.notas}
          onChange={(e) => setLocal({ ...local, notas: e.target.value })}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? "Guardando..." : submitLabel}
        </button>
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
    <div className={`space-y-1 ${className}`}>
      <label
        htmlFor={name}
        className="block text-sm font-medium text-zinc-900 dark:text-zinc-100"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
      />
    </div>
  );
}
