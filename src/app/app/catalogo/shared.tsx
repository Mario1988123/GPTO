"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const MSG: Record<string, string> = {
  creado: "Creado correctamente",
  actualizado: "Actualizado",
  desactivado: "Desactivado",
  reactivado: "Reactivado",
  eliminado: "Eliminado",
};

export function ToastFromSearchParams() {
  const router = useRouter();
  const params = useSearchParams();
  const ok = params.get("ok");
  const error = params.get("error");

  useEffect(() => {
    if (ok) toast.success(MSG[ok] ?? "Operación completada");
    else if (error) toast.error(error);

    if (ok || error) {
      const p = new URLSearchParams(params.toString());
      p.delete("ok");
      p.delete("error");
      const qs = p.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok, error]);

  return null;
}

export function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required = false,
  step,
  className = "",
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number | null;
  required?: boolean;
  step?: string;
  className?: string;
  placeholder?: string;
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
        step={step}
        required={required}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
      />
    </div>
  );
}

export function Textarea({
  label,
  name,
  defaultValue,
  rows = 3,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  rows?: number;
}) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={name}
        className="block text-sm font-medium text-zinc-900 dark:text-zinc-100"
      >
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        defaultValue={defaultValue ?? ""}
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
      />
    </div>
  );
}

export function Select({
  label,
  name,
  defaultValue,
  required = false,
  options,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={name}
        className="block text-sm font-medium text-zinc-900 dark:text-zinc-100"
      >
        {label}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SubmitButton({ label }: { label: string }) {
  return (
    <button
      type="submit"
      className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
    >
      {label}
    </button>
  );
}

export function ActivoPill({ activo }: { activo: boolean }) {
  return activo ? (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
      activo
    </span>
  ) : (
    <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
      inactivo
    </span>
  );
}

export function euros(n: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}
