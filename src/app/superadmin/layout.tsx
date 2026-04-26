import { redirect } from "next/navigation";
import Link from "next/link";
import { Shield, Building2, Users, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/login");

  const { data: usuario } = await s
    .from("usuarios")
    .select("es_superadmin, nombre, email")
    .eq("id", user.id)
    .maybeSingle<{ es_superadmin: boolean; nombre: string | null; email: string }>();

  if (!usuario?.es_superadmin) {
    redirect("/app");
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-red-500 shadow-lg">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold">GPTO Superadmin</p>
              <p className="text-[10px] text-zinc-400">{usuario.email}</p>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            <Link href="/superadmin/empresas" className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm hover:bg-zinc-800">
              <Building2 className="h-4 w-4" /> Empresas
            </Link>
            <Link href="/superadmin/usuarios" className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm hover:bg-zinc-800">
              <Users className="h-4 w-4" /> Usuarios
            </Link>
            <Link href="/app" className="ml-2 inline-flex items-center gap-1.5 rounded-md border border-zinc-700 px-3 py-1.5 text-xs hover:bg-zinc-800">
              <ArrowLeft className="h-3.5 w-3.5" /> Volver a la app
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
