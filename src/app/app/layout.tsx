import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Users,
  BookOpen,
  Boxes,
  FolderKanban,
  Scissors,
  Receipt,
  PackageCheck,
  Hammer,
  BarChart3,
  Settings,
  LayoutDashboard,
  LogOut,
  Sparkles,
  Shield,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { logout } from "../login/actions";

export const dynamic = "force-dynamic";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const MENU_ITEMS: NavItem[] = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/clientes", label: "Clientes", icon: Users },
  { href: "/app/proyectos", label: "Proyectos", icon: FolderKanban },
  { href: "/app/presupuestos", label: "Presupuestos", icon: Receipt },
  { href: "/app/pedidos", label: "Pedidos", icon: PackageCheck },
  { href: "/app/produccion", label: "Producción", icon: Hammer },
  { href: "/app/recortes", label: "Recortes", icon: Scissors },
  { href: "/app/catalogo", label: "Catálogo", icon: BookOpen },
  { href: "/app/tipos-modulo", label: "Tipos de módulo", icon: Boxes },
  { href: "/app/informes", label: "Informes", icon: BarChart3 },
  { href: "/app/ajustes", label: "Ajustes", icon: Settings },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("nombre, rol, empresa_id, empresas(nombre)")
    .eq("id", user.id)
    .maybeSingle();

  // @ts-expect-error relacion
  const empresaNombre: string | null = usuario?.empresas?.nombre ?? null;
  const userNombre = usuario?.nombre ?? user.email ?? "";
  const userInicial = (userNombre || "?").charAt(0).toUpperCase();
  const rol = usuario?.rol ?? null;

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar oscuro estilo TURIVAL */}
      <aside className="hidden md:flex md:w-72 md:flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white shadow-2xl">
        {/* Logo */}
        <div className="px-6 py-8 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">GPTO</h1>
              <p className="text-xs text-slate-400 truncate max-w-[170px]">
                {empresaNombre ?? "Armarios a medida"}
              </p>
            </div>
          </div>
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1 scrollbar-thin">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all duration-200 group"
              >
                <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Usuario + Logout */}
        <div className="border-t border-white/10 p-4 space-y-3">
          <div className="px-4 py-3 bg-white/5 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/20">
                {userInicial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{userNombre}</p>
                {rol ? (
                  <p className="text-xs text-slate-400 capitalize">{rol}</p>
                ) : null}
              </div>
            </div>
          </div>
          {rol === "admin" ? (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/20">
              <Shield className="w-5 h-5" />
              <span className="font-medium text-sm">Acceso admin</span>
            </div>
          ) : null}
          <form action={logout}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium text-sm">Cerrar sesión</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Columna principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar móvil */}
        <header className="md:hidden flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm">
          <Link href="/app" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 shadow-md shadow-blue-500/25">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight text-slate-900">GPTO</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs shadow">
              {userInicial}
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </header>

        {/* Nav horizontal móvil */}
        <nav className="md:hidden flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2 scrollbar-hide">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
