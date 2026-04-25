"use client";

import { useState, useTransition } from "react";
import { User, Building2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PickerModal } from "@/components/picker-modal";

type ClienteLite = {
  id: string;
  nombre: string;
  apellido1: string | null;
  apellido2: string | null;
  es_empresa: boolean;
};

function nombreCompleto(c: ClienteLite) {
  if (c.es_empresa) return c.nombre;
  return [c.nombre, c.apellido1, c.apellido2].filter(Boolean).join(" ").trim() || c.nombre;
}

export function ProyectoFormCrear({
  clientes,
  clienteIdPrefill,
  action,
}: {
  clientes: ClienteLite[];
  clienteIdPrefill: string | null;
  action: (fd: FormData) => void | Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [clienteId, setClienteId] = useState<string>(clienteIdPrefill ?? "");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [notas, setNotas] = useState("");

  const clienteSeleccionado = clientes.find((c) => c.id === clienteId) ?? null;

  function submit(fd: FormData) {
    if (!clienteId) return;
    fd.set("cliente_id", clienteId);
    fd.set("nombre", nombre);
    fd.set("notas", notas);
    startTransition(() => action(fd));
  }

  return (
    <>
      <form action={submit} className="space-y-6">
        <section className="space-y-3">
          <Label className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Cliente *
          </Label>

          {clienteSeleccionado ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border-2 border-blue-500/50 bg-blue-500/5 p-3">
              <div className="flex items-center gap-3">
                {clienteSeleccionado.es_empresa ? (
                  <Building2 className="h-5 w-5 text-blue-600" />
                ) : (
                  <User className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-semibold">{nombreCompleto(clienteSeleccionado)}</p>
                  <p className="text-xs text-muted-foreground">
                    {clienteSeleccionado.es_empresa ? "Empresa" : "Particular"}
                  </p>
                </div>
              </div>
              {!clienteIdPrefill && (
                <Button type="button" variant="outline" size="sm" onClick={() => { setClienteId(""); setPickerOpen(true); }}>
                  Cambiar
                </Button>
              )}
              {!clienteIdPrefill && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setClienteId("")} title="Quitar selección">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ) : (
            <Button type="button" variant="outline" onClick={() => setPickerOpen(true)} className="h-auto justify-start py-3">
              <User className="h-4 w-4" />
              <span className="ml-2">Seleccionar cliente…</span>
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            ¿No está en la lista?{" "}
            <a href="/app/clientes/nuevo" className="underline">
              Crea un cliente nuevo
            </a>{" "}
            y vuelve aquí.
          </p>
        </section>

        <section className="space-y-2">
          <Label htmlFor="nombre" className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Nombre del proyecto *
          </Label>
          <Input
            id="nombre"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Vestidor calle Mayor · Armario dormitorio principal…"
          />
        </section>

        <section className="space-y-2">
          <Label htmlFor="notas" className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Notas (opcional)
          </Label>
          <Textarea
            id="notas"
            rows={3}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Detalles del encargo, referencias, condiciones especiales…"
          />
        </section>

        <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
          <Button type="submit" disabled={!clienteId || !nombre.trim() || pending}>
            {pending ? "Creando..." : "Crear proyecto"}
          </Button>
        </div>
      </form>

      <PickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Elegir cliente"
        placeholder="Buscar por nombre, apellidos, razón social..."
        items={clientes.map((c) => ({
          id: c.id,
          nombre: nombreCompleto(c),
          descripcion: c.es_empresa ? "Empresa" : "Particular",
        }))}
        selectedId={clienteId || null}
        onSelect={(it) => setClienteId(it.id)}
        emptyMessage="Sin clientes que coincidan"
        emptyHint={
          <a href="/app/clientes/nuevo" className="underline">
            Crear nuevo cliente
          </a>
        }
      />
    </>
  );
}
