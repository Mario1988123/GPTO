"use client";

import { useState, useTransition } from "react";
import { Phone, MessageCircle, Mail, Users, Home, FileText, MoreHorizontal, Plus, Trash2, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { crearInteraccion, eliminarInteraccion } from "./interacciones-actions";
import { Button } from "@/components/ui/button";

type Interaccion = {
  id: string;
  tipo: string;
  titulo: string;
  descripcion: string | null;
  fecha: string;
};

const TIPO_META: Record<string, { l: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  nota:        { l: "Nota",        icon: StickyNote,   color: "text-zinc-600 bg-zinc-500/10" },
  llamada:     { l: "Llamada",     icon: Phone,        color: "text-blue-600 bg-blue-500/10" },
  whatsapp:    { l: "WhatsApp",    icon: MessageCircle,color: "text-emerald-600 bg-emerald-500/10" },
  email:       { l: "Email",       icon: Mail,         color: "text-amber-600 bg-amber-500/10" },
  reunion:     { l: "Reunión",     icon: Users,        color: "text-violet-600 bg-violet-500/10" },
  visita:      { l: "Visita",      icon: Home,         color: "text-pink-600 bg-pink-500/10" },
  presupuesto: { l: "Presupuesto", icon: FileText,     color: "text-sky-600 bg-sky-500/10" },
  otro:        { l: "Otro",        icon: MoreHorizontal,color: "text-muted-foreground bg-muted" },
};

export function Timeline({ clienteId, interacciones }: { clienteId: string; interacciones: Interaccion[] }) {
  const [pending, start] = useTransition();
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState("nota");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");

  function submit() {
    if (!titulo.trim()) { toast.error("El título es obligatorio"); return; }
    const fd = new FormData();
    fd.set("tipo", tipo);
    fd.set("titulo", titulo);
    fd.set("descripcion", descripcion);
    start(async () => {
      try {
        await crearInteraccion(clienteId, fd);
        setTitulo(""); setDescripcion(""); setAbierto(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  }

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Timeline</p>
          <h2 className="mt-0.5 text-lg font-bold tracking-tight">
            Interacciones · {interacciones.length}
          </h2>
        </div>
        <Button type="button" size="sm" onClick={() => setAbierto((v) => !v)}>
          <Plus className="h-3.5 w-3.5" />
          {abierto ? "Cancelar" : "Añadir"}
        </Button>
      </div>

      {abierto && (
        <div className="mb-5 grid gap-3 rounded-xl border border-dashed border-border bg-muted/20 p-4 sm:grid-cols-3">
          <div className="space-y-1 sm:col-span-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {Object.entries(TIPO_META).map(([v, m]) => (
                <option key={v} value={v}>{m.l}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Título *</label>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Resumen de un click..."
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="space-y-1 sm:col-span-3">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              placeholder="Notas con más detalle..."
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-3 flex justify-end gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setAbierto(false)}>Cancelar</Button>
            <Button type="button" size="sm" onClick={submit} disabled={pending}>{pending ? "Guardando..." : "Registrar"}</Button>
          </div>
        </div>
      )}

      {interacciones.length === 0 ? (
        <p className="rounded-md bg-muted/40 p-4 text-sm text-muted-foreground">
          Sin interacciones registradas. Usa los botones de llamada / WhatsApp / email para registrar
          automáticamente, o añade una nota manual con el botón "Añadir".
        </p>
      ) : (
        <ul className="relative space-y-3 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-border">
          {interacciones.map((i) => {
            const meta = TIPO_META[i.tipo] ?? TIPO_META.otro;
            const Icon = meta.icon;
            const fecha = new Date(i.fecha);
            const borrar = () => {
              if (!confirm(`¿Eliminar "${i.titulo}"?`)) return;
              start(async () => {
                try {
                  const fd = new FormData();
                  void fd;
                  await eliminarInteraccion(clienteId, i.id);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Error");
                }
              });
            };
            return (
              <li key={i.id} className="relative flex gap-3 pl-1">
                <span className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-2 ring-background ${meta.color}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="flex-1 rounded-lg border border-border bg-background p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-semibold">{i.titulo}</p>
                    <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {meta.l} · {fecha.toLocaleDateString("es-ES")} {fecha.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {i.descripcion && (
                    <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{i.descripcion}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={borrar}
                  title="Eliminar"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
