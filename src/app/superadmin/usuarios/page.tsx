import Link from "next/link";
import { KeyRound, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { resetPasswordUsuario } from "../actions";

export const dynamic = "force-dynamic";

type Usuario = {
  id: string; email: string; nombre: string | null; activo: boolean;
  es_superadmin: boolean;
  empresa_id: string | null;
  empresas: { nombre: string } | null;
  roles_empresa: { nombre: string; es_admin: boolean } | null;
};

export default async function UsuariosPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const s = await createClient();

  let query = s
    .from("usuarios")
    .select("id, email, nombre, activo, es_superadmin, empresa_id, empresas(nombre), roles_empresa(nombre, es_admin)")
    .order("email")
    .limit(50);
  if (q) query = query.ilike("email", `%${q}%`);

  const { data } = await query.returns<Usuario[]>();

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-bold">Usuarios del sistema</h1>
      <p className="mt-1 text-sm text-zinc-400">Busca cualquier usuario y resetea su contraseña.</p>

      <form className="mt-6 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por email..."
            className="flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-900 pl-9 pr-3 text-sm"
          />
        </div>
        <button type="submit" className="rounded-md bg-zinc-800 px-4 text-sm font-semibold hover:bg-zinc-700">Buscar</button>
      </form>

      <ul className="mt-6 divide-y divide-zinc-800 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
        {(data ?? []).length === 0 ? (
          <li className="p-5 text-sm text-zinc-500">{q ? "Sin resultados" : "Escribe arriba para buscar"}</li>
        ) : (
          (data ?? []).map((u) => {
            const reset = async () => { "use server"; await resetPasswordUsuario(u.id, "/superadmin/usuarios" + (q ? `?q=${encodeURIComponent(q)}` : "")); };
            return (
              <li key={u.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{u.nombre ?? u.email}</p>
                    {u.es_superadmin && <span className="rounded bg-gradient-to-br from-amber-500 to-red-500 px-2 py-0.5 text-[10px] font-bold">SUPERADMIN</span>}
                  </div>
                  <p className="text-xs text-zinc-400">{u.email}</p>
                  {u.empresa_id && (
                    <Link href={`/superadmin/empresas/${u.empresa_id}`} className="text-xs text-amber-400 hover:underline">
                      {u.empresas?.nombre ?? "Empresa"} {u.roles_empresa ? `· ${u.roles_empresa.nombre}` : ""}
                    </Link>
                  )}
                </div>
                <span className={`rounded px-2 py-0.5 text-[10px] ${u.activo ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>
                  {u.activo ? "activo" : "inactivo"}
                </span>
                <form action={reset}>
                  <button type="submit" title="Magic-link reseteo" className="flex h-7 w-7 items-center justify-center rounded text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100">
                    <KeyRound className="h-3.5 w-3.5" />
                  </button>
                </form>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
