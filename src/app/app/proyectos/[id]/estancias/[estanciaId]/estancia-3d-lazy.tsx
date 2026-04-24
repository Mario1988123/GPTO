"use client";

import dynamic from "next/dynamic";

export const Estancia3DLazy = dynamic(
  () => import("./estancia-3d").then((m) => m.Estancia3D),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[600px] items-center justify-center rounded-2xl border border-border bg-muted/30 text-sm text-muted-foreground">
        Cargando estancia 3D…
      </div>
    ),
  },
);
