"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Check, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type PickerItem = {
  id: string;
  nombre: string;
  descripcion?: string | null;
  foto_url?: string | null;
  // Etiquetas adicionales para mostrar bajo el nombre (precio, categoría, etc.).
  meta?: string | null;
  // Color hex como fallback visual cuando no hay foto (acabados, etc.).
  color?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  items: PickerItem[];
  onSelect: (item: PickerItem) => void;
  selectedId?: string | null;
  title?: string;
  placeholder?: string;
  emptyMessage?: string;
  /**
   * Mensaje extra mostrado bajo la búsqueda (ej: "Crea uno en /app/catalogo/...").
   */
  emptyHint?: React.ReactNode;
};

/**
 * Modal genérico para escoger un elemento de un catálogo:
 * - Filtro por búsqueda (nombre + descripción + meta).
 * - Miniatura de fotografía si hay foto_url, círculo de color como fallback,
 *   o un placeholder ImageIcon.
 * - Cierra con ESC o click fuera.
 */
export function PickerModal({
  open,
  onClose,
  items,
  onSelect,
  selectedId,
  title = "Selecciona un elemento",
  placeholder = "Buscar…",
  emptyMessage = "Sin resultados",
  emptyHint,
}: Props) {
  const [busqueda, setBusqueda] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setBusqueda("");
      // foco diferido para que el modal aparezca antes
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      return (
        it.nombre.toLowerCase().includes(q) ||
        (it.descripcion ?? "").toLowerCase().includes(q) ||
        (it.meta ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, busqueda]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[10vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-base font-bold tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-border p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={placeholder}
              className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/15"
            />
          </div>
        </div>

        <div className="max-h-[55vh] overflow-y-auto">
          {filtrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-5 py-10 text-center text-sm text-muted-foreground">
              <p>{emptyMessage}</p>
              {emptyHint && <div className="text-xs">{emptyHint}</div>}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtrados.map((it) => {
                const isSelected = selectedId === it.id;
                return (
                  <li key={it.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(it);
                        onClose();
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-muted/50",
                        isSelected && "bg-blue-500/10",
                      )}
                    >
                      <Miniatura foto_url={it.foto_url} color={it.color} nombre={it.nombre} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{it.nombre}</p>
                        {it.descripcion && (
                          <p className="truncate text-xs text-muted-foreground">{it.descripcion}</p>
                        )}
                        {it.meta && (
                          <p className="truncate font-mono text-[10px] text-muted-foreground">{it.meta}</p>
                        )}
                      </div>
                      {isSelected && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Miniatura({
  foto_url,
  color,
  nombre,
}: {
  foto_url?: string | null;
  color?: string | null;
  nombre: string;
}) {
  if (foto_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={foto_url}
        alt={nombre}
        className="h-12 w-12 shrink-0 rounded-md object-cover ring-1 ring-border"
      />
    );
  }
  if (color) {
    return (
      <div
        className="h-12 w-12 shrink-0 rounded-md ring-1 ring-border"
        style={{ background: color }}
        aria-label={nombre}
      />
    );
  }
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-muted ring-1 ring-border">
      <ImageIcon className="h-5 w-5 text-muted-foreground" />
    </div>
  );
}

function MiniaturaInline({
  foto_url,
  color,
  nombre,
}: {
  foto_url?: string | null;
  color?: string | null;
  nombre: string;
}) {
  if (foto_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={foto_url}
        alt={nombre}
        className="h-7 w-7 shrink-0 rounded object-cover ring-1 ring-border"
      />
    );
  }
  if (color) {
    return (
      <div className="h-7 w-7 shrink-0 rounded ring-1 ring-border" style={{ background: color }} aria-label={nombre} />
    );
  }
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-muted ring-1 ring-border">
      <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
    </div>
  );
}

/**
 * Botón "trigger" que muestra el item seleccionado y abre el modal al click.
 * Pensado para usar dentro de formularios — escribe el id en un hidden input.
 */
export function PickerTrigger({
  name,
  value,
  items,
  onChange,
  placeholder = "— elegir —",
  required = false,
  title,
}: {
  name: string;
  value: string;
  items: PickerItem[];
  onChange: (id: string) => void;
  placeholder?: string;
  required?: boolean;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const seleccionado = items.find((it) => it.id === value) ?? null;

  return (
    <>
      <input type="hidden" name={name} value={value} required={required} />
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-2 py-1 text-left text-sm shadow-xs outline-none transition",
          "focus:border-ring focus:ring-2 focus:ring-ring/15",
          !seleccionado && "text-muted-foreground",
        )}
      >
        {seleccionado ? (
          <>
            <MiniaturaInline foto_url={seleccionado.foto_url} color={seleccionado.color} nombre={seleccionado.nombre} />
            <span className="flex-1 truncate font-medium text-foreground">{seleccionado.nombre}</span>
            {seleccionado.meta && (
              <span className="font-mono text-[10px] text-muted-foreground">{seleccionado.meta}</span>
            )}
          </>
        ) : (
          <span className="flex-1 truncate">{placeholder}</span>
        )}
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      <PickerModal
        open={open}
        onClose={() => setOpen(false)}
        items={items}
        selectedId={value || null}
        onSelect={(it) => onChange(it.id)}
        title={title ?? "Selecciona"}
      />
    </>
  );
}
