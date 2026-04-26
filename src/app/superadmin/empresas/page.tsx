import Link from "next/link";
import { Building2, Plus, Users, FolderKanban } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { crearEmpresa } from "../actions";
import { ESTADOS_EMPRESA, PLANES, type EstadoEmpresa, type PlanEmpresa } from "@/lib/tipos/auth";

export const dynamic = "force-dynamic";

const LBL_ESTADO = Object.fromEntries(ESTADOS_EMPRESA.map((e) => [e.value, e]));
const LBL_PLAN = Object.fromEntries(PLANES.map((p) => [p.value, p]));

type Empresa = {
  id: string;
  nombre: string;
  estado: EstadoEmpresa;
  plan: PlanEmpresa;
  fecha_alta: string;
  fecha_baja: string | null;
  usuarios: { count: number }[];
  proyectos: { count: number }[];
};

export default async function EmpresasPage() {
  const s = await createClient();
  const { data } = await s
    .from("empresas")
    .select("id, nombre, estado, plan, fecha_alta, fecha_baja, usuarios(count), proyectos(count)")
    .order("created_at", { ascending: false })
    .returns<Empresa[]>();

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold">Empresas</h1>
          <p className="text-sm text-zinc-400">{data?.length ?? 0} empresas en el sistema</p>
        </div>
      </div>

      <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400">Crear empresa</p>
        <form action={crearEmpresa} className="grid gap-3 sm:grid-cols-4">
          <input
            name="nombre"
            required
            placeholder="Nombre de la empresa *"
            className="flex h-9 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm sm:col-span-2"
          />
          <select name="plan" defaultValue="autonomo" className="flex h-9 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm">
            {PLANES.map((p) => <option key={p.value} value={p.value}>{p.label} · {p.precio}€/mes</option>)}
          </select>
          <button type="submit" className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-gradient-to-br from-amber-500 to-red-500 px-4 text-sm font-bold">
            <Plus className="h-4 w-4" /> Crear
          </button>
        </form>
      </section>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((e) => {
          const ee = LBL_ESTADO[e.estado];
          const pp = LBL_PLAN[e.plan];
          return (
            <li key={e.id}>
              <Link href={`/superadmin/empresas/${e.id}`} className="block rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-zinc-600 hover:bg-zinc-800">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-amber-400" />
                    <p className="text-base font-bold">{e.nombre}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${ee?.color ?? ""}`}>{ee?.label}</span>
                </div>
                <p className="text-xs text-zinc-400">Plan: <strong>{pp?.label} · {pp?.precio}€/mes</strong></p>
                <p className="text-xs text-zinc-400">Alta: {new Date(e.fecha_alta).toLocaleDateString("es-ES")}</p>
                {e.fecha_baja && <p className="text-xs text-red-400">Baja: {new Date(e.fecha_baja).toLocaleDateString("es-ES")}</p>}
                <div className="mt-3 flex gap-3 text-xs text-zinc-300">
                  <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {e.usuarios?.[0]?.count ?? 0} usuarios</span>
                  <span className="inline-flex items-center gap-1"><FolderKanban className="h-3 w-3" /> {e.proyectos?.[0]?.count ?? 0} proyectos</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
