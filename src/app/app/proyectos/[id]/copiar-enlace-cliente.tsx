"use client";

import { useState } from "react";
import { Link2, Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopiarEnlaceCliente({ token }: { token: string }) {
  const [copiado, setCopiado] = useState(false);

  // En cliente: construye la URL absoluta con window.location.origin.
  const href = `/c/${token}`;

  async function copiar() {
    try {
      const abs = typeof window !== "undefined" ? `${window.location.origin}${href}` : href;
      await navigator.clipboard.writeText(abs);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // fallback silencioso
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-200/60 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
        <Link2 className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">Portal del cliente</p>
        <p className="mt-0.5 text-xs text-emerald-700/80 dark:text-emerald-400/80">
          Enlace privado que puedes enviar al cliente para que siga el proyecto en tiempo real.
        </p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={copiar}>
        {copiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copiado ? "Copiado" : "Copiar enlace"}
      </Button>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 transition hover:underline dark:text-emerald-400"
      >
        Abrir
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
