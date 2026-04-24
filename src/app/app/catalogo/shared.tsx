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

const INPUT_BASE =
  "flex h-10 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition placeholder:text-muted-foreground/60 focus:border-ring focus:ring-4 focus:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-50";

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
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={name} className="block text-xs font-semibold text-muted-foreground">
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
        className={INPUT_BASE}
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
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-xs font-semibold text-muted-foreground">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        defaultValue={defaultValue ?? ""}
        className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition placeholder:text-muted-foreground/60 focus:border-ring focus:ring-4 focus:ring-ring/15"
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
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-xs font-semibold text-muted-foreground">
        {label}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        className={INPUT_BASE}
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
      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-foreground px-5 text-sm font-semibold text-background shadow-sm transition hover:shadow-md disabled:opacity-50"
    >
      {label}
    </button>
  );
}

export function ActivoPill({ activo }: { activo: boolean }) {
  return activo ? (
    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
      Activo
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
      Inactivo
    </span>
  );
}

export function euros(n: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

export function CatalogoDetalleActions({
  activo,
  toggle,
  del,
}: {
  activo: boolean;
  toggle: () => Promise<void>;
  del: () => Promise<void>;
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-muted/30 p-4">
      <form action={toggle}>
        <button
          type="submit"
          className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium transition hover:bg-muted"
        >
          {activo ? "Desactivar" : "Reactivar"}
        </button>
      </form>
      <form action={del}>
        <button
          type="submit"
          className="inline-flex h-9 items-center rounded-md border border-destructive/30 bg-background px-3 text-sm font-medium text-destructive transition hover:bg-destructive/5"
        >
          Eliminar
        </button>
      </form>
    </div>
  );
}

export function CatalogoFormCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      {children}
    </div>
  );
}

export function VerSelect({ ver }: { ver: string }) {
  return (
    <form className="flex flex-wrap items-end gap-3">
      <div className="w-[180px] space-y-1.5">
        <label htmlFor="ver" className="text-xs font-medium text-muted-foreground">
          Ver
        </label>
        <select
          id="ver"
          name="ver"
          defaultValue={ver}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/15"
        >
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
          <option value="todos">Todos</option>
        </select>
      </div>
      <button
        type="submit"
        className="inline-flex h-9 items-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground transition hover:bg-muted"
      >
        Filtrar
      </button>
    </form>
  );
}
