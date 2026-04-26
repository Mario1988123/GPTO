import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Plus, KeyRound, Pause, Play, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { cambiarEstadoEmpresa, cambiarPlanEmpresa, invitarAdminEmpresa, resetPasswordUsuario } from "../../actions";
import { ESTADOS_EMPRESA, PLANES, type EstadoEmpresa, type PlanEmpresa } from "@/lib/tipos/auth";

export const dynamic = "force-dynamic";

const LBL_E = Object.fromEntries(ESTADOS_EMPRESA.map((e) => [e.value, e]));

type Empresa = {
  id: string; nombre: string; estado: EstadoEmpresa; plan: PlanEmpresa;
  fecha_alta: string; fecha_baja: string | null;
};

type Usuario = {
  id: string; email: string; nombre: string | null; activo: boolean;
  rol_empresa_id: string | null;
  roles_empresa: { nombre: string; es_admin: boolean } | null;
};

export default async function DetalleEmpresaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await createClient();

  const [{ data: emp }, { data: usuarios }, { data: stats }] = await Promise.all([
    s.from("empresas").select("id, nombre, estado, plan, fecha_alta, fecha_baja").eq("id", id).maybeSingle<Empresa>(),
    s.from("usuarios").select("id, email, nombre, activo, rol_empresa_id, roles_empresa(nombre, es_admin)").eq("empresa_id", id).order("created_at").returns<Usuario[]>(),
    s.from("proyectos").select("id, estado", { count: "exact" }).eq("empresa_id", id),
  ]);

  if (!emp) notFound();

  const numProyectos = stats?.length ?? 0;
  const meta = LBL_E[emp.estado];

  const invitar = async (fd: FormData) => { "use server"; await invitarAdminEmpresa(id, fd); };
  const suspender = async () => { "use server"; await cambiarEstadoEmpresa(id, "suspendida"); };
  const reactivar = async () => { "use server"; await cambiarEstadoEmpresa(id, "activa"); };
  const cancelar = async () => { "use server"; await cambiarEstadoEmpresa(id, "cancelada"); };
  const cambiarPlan = async (fd: FormData) => {
    "use server";
    await cambiarPlanEmpresa(id, String(fd.get("plan")) as "autonomo" | "taller" | "empresa");
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Link href="/superadmin/empresas" className="mb-4 inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200">
        <ArrowLeft className="h-3.5 w-3.5" /> Empresas
      </Link>

      <div className="mb-6 flex items-baseline justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-7 w-7 text-amber-400" />
          <div>
            <h1 className="text-2xl font-bold">{emp.nombre}</h1>
            <p className="text-xs text-zinc-400">Alta {new Date(emp.fecha_alta).toLocaleDateString("es-ES")}</p>
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${meta?.color ?? ""}`}>{meta?.label}</span>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Plan</p>
          <form action={cambiarPlan} className="mt-2">
            <select name="plan" defaultValue={emp.plan} className="flex h-9 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm">
              {PLANES.map((p) => <option key={p.value} value={p.value}>{p.label} · {p.precio}€/mes</option>)}
            </select>
            <button type="submit" className="mt-2 w-full rounded-md bg-zinc-800 py-1.5 text-xs hover:bg-zinc-700">Actualizar plan</button>
          </form>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Usuarios</p>
          <p className="mt-2 text-3xl font-bold">{usuarios?.length ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Proyectos</p>
          <p className="mt-2 text-3xl font-bold">{numProyectos}</p>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Acciones</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {emp.estado === "activa" && (
            <form action={suspender}>
              <button type="submit" className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold hover:bg-amber-500">
                <Pause className="h-3.5 w-3.5" /> Suspender
              </button>
            </form>
          )}
          {emp.estado !== "activa" && (
            <form action={reactivar}>
              <button type="submit" className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold hover:bg-emerald-500">
                <Play className="h-3.5 w-3.5" /> Reactivar
              </button>
            </form>
          )}
          {emp.estado !== "cancelada" && (
            <form action={cancelar}>
              <button type="submit" className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold hover:bg-red-500">
                <XCircle className="h-3.5 w-3.5" /> Cancelar suscripción
              </button>
            </form>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400">Invitar admin</p>
        <form action={invitar} className="grid gap-2 sm:grid-cols-3">
          <input name="email" required type="email" placeholder="email@empresa.com" className="flex h-9 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm" />
          <input name="nombre" placeholder="Nombre (opcional)" className="flex h-9 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm" />
          <button type="submit" className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-gradient-to-br from-amber-500 to-red-500 px-3 text-xs font-bold">
            <Plus className="h-3.5 w-3.5" /> Invitar (magic-link)
          </button>
        </form>
        <p className="mt-2 text-[10px] text-zinc-500">El usuario recibirá un email para establecer su contraseña.</p>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
        <div className="border-b border-zinc-800 px-5 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Usuarios de la empresa</p>
        </div>
        <ul className="divide-y divide-zinc-800">
          {(usuarios ?? []).length === 0 ? (
            <li className="p-5 text-sm text-zinc-500">Sin usuarios. Invita al admin arriba.</li>
          ) : (
            (usuarios ?? []).map((u) => {
              const reset = async () => { "use server"; await resetPasswordUsuario(u.id, `/superadmin/empresas/${id}`); };
              return (
                <li key={u.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{u.nombre ?? u.email}</p>
                    <p className="text-xs text-zinc-400">{u.email}</p>
                  </div>
                  {u.roles_empresa && (
                    <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${u.roles_empresa.es_admin ? "bg-amber-500/20 text-amber-300" : "bg-zinc-700 text-zinc-300"}`}>
                      {u.roles_empresa.nombre}
                    </span>
                  )}
                  <span className={`rounded px-2 py-0.5 text-[10px] ${u.activo ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>
                    {u.activo ? "activo" : "inactivo"}
                  </span>
                  <form action={reset}>
                    <button type="submit" title="Enviar magic-link reseteo" className="flex h-7 w-7 items-center justify-center rounded text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100">
                      <KeyRound className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </li>
              );
            })
          )}
        </ul>
      </section>
    </div>
  );
}
