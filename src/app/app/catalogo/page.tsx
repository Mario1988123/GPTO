import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ITEMS: {
  href: string;
  titulo: string;
  descripcion: string;
  tabla: string;
}[] = [
  { href: "/app/catalogo/proveedores", titulo: "Proveedores", descripcion: "Egger, Finsa, etc.", tabla: "proveedores" },
  { href: "/app/catalogo/materiales", titulo: "Materiales", descripcion: "Tablero, melamina, DM...", tabla: "materiales" },
  { href: "/app/catalogo/acabados", titulo: "Acabados", descripcion: "Colores y texturas.", tabla: "acabados" },
  { href: "/app/catalogo/referencias-tablero", titulo: "Referencias tablero", descripcion: "SKUs reales (material + acabado + grosor).", tabla: "referencias_tablero" },
  { href: "/app/catalogo/cantos", titulo: "Cantos", descripcion: "Precio por metro lineal.", tabla: "cantos" },
  { href: "/app/catalogo/herrajes", titulo: "Herrajes", descripcion: "Bisagras, tiradores, guías.", tabla: "herrajes" },
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
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        Catálogo
      </h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Materiales, acabados, referencias y herrajes que usa tu empresa.
      </p>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className="group rounded-xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
          >
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-medium text-zinc-900 group-hover:underline dark:text-zinc-100">
                {it.titulo} →
              </h2>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {conteos[it.tabla]}
              </span>
            </div>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              {it.descripcion}
            </p>
          </Link>
        ))}
      </section>
    </div>
  );
}
