"use client";

import { useState } from "react";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AsistenteIA({ proyectoId }: { proyectoId: string }) {
  const [texto, setTexto] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState<{ input: number; output: number } | null>(null);

  async function consultar() {
    setCargando(true);
    setError(null);
    try {
      const resp = await fetch(`/api/asistente/proyecto/${proyectoId}`, {
        method: "POST",
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error ?? "Error desconocido");
      } else {
        setTexto(data.texto);
        if (data.usage) setTokens({ input: data.usage.input_tokens, output: data.usage.output_tokens });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setCargando(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-500/25">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-700">
              Asistente IA · Claude
            </p>
            <h2 className="mt-0.5 text-lg font-bold tracking-tight text-slate-900">
              Consejos de optimización
            </h2>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={consultar}
          disabled={cargando}
          className="bg-gradient-to-br from-blue-500 to-cyan-400 text-white hover:shadow-lg hover:shadow-blue-500/30"
        >
          {cargando ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Analizando...
            </>
          ) : texto ? (
            <>
              <RefreshCw className="h-3.5 w-3.5" />
              Volver a analizar
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Analizar proyecto
            </>
          )}
        </Button>
      </div>

      {!texto && !cargando && !error ? (
        <p className="mt-4 text-sm text-slate-600">
          Claude analiza las piezas, tableros y recortes del proyecto y te sugiere optimizaciones
          cuantificadas: reducciones dimensionales, reaprovechamiento de merma para generar baldas extra
          y cómo ahorrar tableros.
        </p>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p className="font-semibold">Error</p>
          <p className="mt-0.5">{error}</p>
          {error.includes("ANTHROPIC_API_KEY") ? (
            <p className="mt-2 text-xs">
              Para activar el asistente, sube la variable <code className="rounded bg-white px-1">ANTHROPIC_API_KEY</code>{" "}
              en Vercel · Settings · Environment Variables.
            </p>
          ) : null}
        </div>
      ) : null}

      {texto ? (
        <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div
            className="prose prose-sm prose-slate max-w-none"
            dangerouslySetInnerHTML={{ __html: markdownSimple(texto) }}
          />
          {tokens ? (
            <p className="mt-3 border-t border-slate-200 pt-3 text-[10px] text-slate-400">
              {tokens.input + tokens.output} tokens usados · modelo claude-sonnet-4-6
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

/** Markdown muy simple: títulos, bullets, negritas. Sin dependencias. */
function markdownSimple(md: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = escape(md).split("\n");
  const out: string[] = [];
  let inList = false;
  for (const line of lines) {
    if (/^##\s+(.*)/.test(line)) {
      if (inList) { out.push("</ul>"); inList = false; }
      const m = line.match(/^##\s+(.*)/);
      out.push(`<h3 class="text-base font-bold text-slate-900 mt-4 mb-2">${m![1]}</h3>`);
    } else if (/^\s*[-*]\s+(.*)/.test(line)) {
      if (!inList) { out.push("<ul class=\"space-y-1 text-sm\">"); inList = true; }
      const m = line.match(/^\s*[-*]\s+(.*)/);
      out.push(`<li class="text-slate-700">${formatInline(m![1])}</li>`);
    } else if (line.trim() === "") {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push("");
    } else {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push(`<p class="text-sm text-slate-700 mt-2">${formatInline(line)}</p>`);
    }
  }
  if (inList) out.push("</ul>");
  return out.join("\n");
}

function formatInline(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="rounded bg-slate-100 px-1 py-0.5 text-xs font-mono">$1</code>')
    .replace(/→/g, '<span class="text-blue-600 font-bold">→</span>');
}
