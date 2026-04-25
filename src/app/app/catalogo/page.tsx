import Link from "next/link";
import { Truck, Layers, Palette, Package, Ruler, Wrench, ArrowRight, DoorOpen, Grid3x3, Blinds } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

const ITEMS: {
  href: string;
  titulo: string;
  descripcion: string;
  tabla: string;
  icon: LucideIcon;
}[] = [
  { href: "/app/catalogo/proveedores", titulo: "Proveedores", descripcion: "Egger, Finsa, etc.", tabla: "proveedores", icon: Truck },
  { href: "/app/catalogo/materiales", titulo: "Materiales", descripcion: "Tablero, melamina, DM...", tabla: "materiales", icon: Layers },
  { href: "/app/catalogo/acabados", titulo: "Acabados", descripcion: "Colores y texturas.", tabla: "acabados", icon: Palette },
  { href: "/app/catalogo/referencias-tablero", titulo: "Referencias tablero", descripcion: "SKUs reales (material + acabado + grosor).", tabla: "referencias_tablero", icon: Package },
  { href: "/app/catalogo/cantos", titulo: "Cantos", descripcion: "Precio por metro lineal.", tabla: "cantos", icon: Ruler },
  { href: "/app/catalogo/herrajes", titulo: "Herrajes", descripcion: "Bisagras, tiradores, guías.", tabla: "herrajes", icon: Wrench },
  { href: "/app/catalogo/puertas-paso", titulo: "Puertas de paso", descripcion: "Correderas, abatibles, invisibles... Con variantes, tapeta y proveedor.", tabla: "puertas_paso_catalogo", icon: DoorOpen },
  { href: "/app/catalogo/suelos", titulo: "Suelos", descripcion: "Parquet, laminado, vinílico. €/m².", tabla: "suelos_catalogo", icon: Grid3x3 },
  { href: "/app/catalogo/rodapies", titulo: "Rodapiés", descripcion: "PVC, madera, lacado. Con/sin LED. €/ml.", tabla: "rodapies_catalogo", icon: Blinds },
];

export default async function CatalogoPage() {
  const supabase = await createClient();
  const conteos: Record<string, number> = {};
  for (const it of ITEMS) {
    const { count } = await supabase
      .from(it.tabla)
      .select("*", { count: "exact", head: true })
      .eq("activo", true);
    conteos[it.tabla] = count ?? 0;
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <PageHeader
        eyebrow="Configuración"
        title="Catálogo"
        description="Materiales, acabados, referencias y herrajes que usa tu empresa."
      />

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map((it) => {
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-lg"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground transition group-hover:bg-foreground group-hover:text-background">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-bold tracking-tight">{it.titulo}</h2>
                    <span className="inline-flex min-w-[28px] items-center justify-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold tabular-nums">
                      {conteos[it.tabla]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{it.descripcion}</p>
                  <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition group-hover:text-foreground">
                    Abrir
                    <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
