import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AppHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("nombre, rol, empresa_id")
    .eq("id", user!.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        Panel
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Has entrado como <strong>{usuario?.nombre ?? user!.email}</strong>
        {usuario?.rol ? (
          <>
            {" "}
            con rol <strong>{usuario.rol}</strong>
          </>
        ) : (
          <>
            {" "}
            <span className="text-amber-600">(perfil sin completar)</span>
          </>
        )}
        .
      </p>

      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/app/clientes"
          className="rounded-xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
        >
          <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Clientes →
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Gestión de clientes finales.
          </p>
        </Link>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Catálogo
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Capa 2 — pendiente.
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Configurador 3D
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Capa 4 — pendiente.
          </p>
        </div>
      </section>
    </div>
  );
}
