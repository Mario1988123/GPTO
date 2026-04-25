"use client";

import { useState, useTransition } from "react";
import { Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { importarClientesCSV } from "./actions";
import { Button } from "@/components/ui/button";

type Resultado = {
  total: number;
  importados: number;
  errores: { fila: number; motivo: string; datos: string }[];
};

export function ImportarForm() {
  const [pending, start] = useTransition();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!archivo) {
      toast.error("Elige un archivo CSV");
      return;
    }
    const fd = new FormData();
    fd.set("archivo", archivo);
    start(async () => {
      try {
        const res = await importarClientesCSV(fd);
        if (res) {
          setResultado(res);
          if (res.importados > 0) toast.success(`${res.importados} cliente(s) importados`);
          if (res.errores.length > 0) toast.warning(`${res.errores.length} fila(s) con incidencias`);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error importando");
      }
    });
  }

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 transition hover:border-foreground/30 hover:bg-muted/40">
          <Upload className="h-6 w-6 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            {archivo ? archivo.name : "Pulsa para elegir un archivo CSV"}
          </span>
          {archivo && (
            <span className="text-xs text-muted-foreground">{(archivo.size / 1024).toFixed(1)} KB</span>
          )}
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setArchivo(f);
              setResultado(null);
            }}
          />
        </label>
        <div className="flex justify-end">
          <Button type="submit" disabled={!archivo || pending}>
            <Upload className="h-4 w-4" />
            {pending ? "Importando..." : "Importar CSV"}
          </Button>
        </div>
      </form>

      {resultado && (
        <div className="mt-6 rounded-xl border border-border bg-background p-4">
          <div className="mb-3 flex items-center gap-3">
            {resultado.importados > 0 ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-600" />
            )}
            <p className="text-sm font-semibold">
              {resultado.importados} de {resultado.total} clientes importados
            </p>
          </div>

          {resultado.errores.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
                ⚠ {resultado.errores.length} fila(s) con incidencias (click para ver)
              </summary>
              <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-md border border-border bg-muted/30 p-3 font-mono">
                {resultado.errores.map((e, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="shrink-0 font-bold">
                      {e.fila > 0 ? `Fila ${e.fila}` : "Lote"}:
                    </span>
                    <span className="text-amber-700 dark:text-amber-400">{e.motivo}</span>
                    <span className="truncate text-muted-foreground">— {e.datos}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          {resultado.importados > 0 && (
            <a
              href="/app/clientes"
              className="mt-3 inline-block text-xs font-medium text-blue-600 hover:underline"
            >
              Ver clientes →
            </a>
          )}
        </div>
      )}
    </>
  );
}
