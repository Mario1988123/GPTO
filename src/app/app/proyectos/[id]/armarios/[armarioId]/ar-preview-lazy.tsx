"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ModuloPro } from "./armario-3d-pro";

// Carga el ARPreview (+ su Canvas R3F) solo cuando el usuario lo pide.
// Evita conflicto entre dos Canvas R3F simultáneos en la misma página.
const ARPreview = dynamic(() => import("./ar-preview").then((m) => m.ARPreview), {
  ssr: false,
  loading: () => (
    <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
      Cargando editor AR…
    </div>
  ),
});

type Props = {
  armario_ancho_mm: number;
  armario_alto_mm: number;
  armario_fondo_mm: number;
  tipo_instalacion: "empotrado" | "suelto";
  margen_tapeta_mm: number;
  modulos: ModuloPro[];
};

export function ARPreviewLazy(props: Props) {
  const [activo, setActivo] = useState(false);

  if (!activo) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-gradient-to-br from-blue-50/50 via-slate-50 to-cyan-50/50 px-6 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-500/25">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-slate-900">Previsualizar sobre foto</p>
          <p className="mt-1 max-w-md text-sm text-slate-600">
            Sube una foto de la pared y superpón el armario 3D con el acabado real. Al acabar puedes
            aplicar hiperrealismo con IA.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => setActivo(true)}
          className="bg-gradient-to-br from-blue-500 to-cyan-400 text-white"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Activar AR
        </Button>
        <p className="text-[10px] text-slate-400">
          (se carga bajo demanda para no ralentizar el editor 3D)
        </p>
      </div>
    );
  }

  return <ARPreview {...props} />;
}
