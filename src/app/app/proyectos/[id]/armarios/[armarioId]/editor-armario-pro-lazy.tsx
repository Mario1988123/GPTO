"use client";

import dynamic from "next/dynamic";

// Wrapper lazy con ssr:false para evitar hidratación del Canvas R3F (React error #418)
export const EditorArmarioProLazy = dynamic(
  () => import("./editor-armario-pro").then((m) => m.EditorArmarioPro),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[620px] items-center justify-center rounded-2xl border border-border bg-muted/30 text-sm text-muted-foreground">
        Cargando editor 3D…
      </div>
    ),
  },
);
