"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, User, Building2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
  const [busqueda, setBusqueda] = useState("");
  const [nombre, setNombre] = useState("");
  const [notas, setNotas] = useState("");

  const clienteSeleccionado = useMemo(() => clientes.find((c) => c.id === clienteId) ?? null, [clientes, clienteId]);

  const filtrados = useMemo(() => {
    if (!busqueda.trim()) return clientes.slice(0, 50);
    const q = busqueda.toLowerCase();
    return clientes
      .filter((c) => nombreCompleto(c).toLowerCase().includes(q))
      .slice(0, 50);
  }, [clientes, busqueda]);

  function submit(fd: FormData) {
    if (!clienteId) return;
    fd.set("cliente_id", clienteId);
    fd.set("nombre", nombre);
    fd.set("notas", notas);
    startTransition(() => action(fd));
  }

  return (
    <form action={submit} className="space-y-6">
      {/* Cliente */}
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
              <Button type="button" variant="outline" size="sm" onClick={() => setClienteId("")}>
                Cambiar
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar cliente por nombre, apellidos, razón social…"
                className="pl-9"
              />
            </div>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
              {filtrados.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  Sin resultados. <a href="/app/clientes/nuevo" className="underline">Crea un cliente nuevo</a>.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {filtrados.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setClienteId(c.id)}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-muted/50"
                      >
                        {c.es_empresa ? (
                          <Building2 className="h-4 w-4 text-blue-600" />
                        ) : (
                          <User className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="flex-1 truncate text-sm font-medium">{nombreCompleto(c)}</span>
                        {clienteId === c.id && <Check className="h-4 w-4 text-emerald-600" />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </section>

      {/* Nombre del proyecto */}
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

      {/* Notas */}
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
  );
}
