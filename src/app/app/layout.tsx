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
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { logout } from "../login/actions";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/app",                 label: "Panel",          icon: LayoutDashboard },
  { href: "/app/clientes",        label: "Clientes",       icon: Users },
  { href: "/app/catalogo",        label: "Catálogo",       icon: BookOpen },
  { href: "/app/tipos-modulo",    label: "Tipos módulo",   icon: Boxes },
  { href: "/app/proyectos",       label: "Proyectos",      icon: FolderKanban },
  { href: "/app/recortes",        label: "Recortes",       icon: Scissors },
  { href: "/app/presupuestos",    label: "Presupuestos",   icon: Receipt },
  { href: "/app/pedidos",         label: "Pedidos",        icon: PackageCheck },
  { href: "/app/produccion",      label: "Producción",     icon: Hammer },
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

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Sidebar */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-zinc-200 lg:bg-white lg:dark:border-zinc-800 lg:dark:bg-zinc-900">
        <div className="flex h-16 items-center gap-2 px-5 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-900 text-sm font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
            G
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">GPTO</span>
            {empresaNombre ? (
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate max-w-[150px]">
                {empresaNombre}
              </span>
            ) : null}
          </div>
        </div>
        <nav className="flex flex-col gap-0.5 p-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
              >
                <Icon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-zinc-200 p-3 dark:border-zinc-800">
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {userInicial}
            </div>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="truncate text-xs font-medium text-zinc-950 dark:text-zinc-50">{userNombre}</span>
              {usuario?.rol ? (
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {usuario.rol}
                </span>
              ) : null}
            </div>
          </div>
          <form action={logout} className="mt-2">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <LogOut className="h-3 w-3" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar mobile */}
        <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 lg:hidden dark:border-zinc-800 dark:bg-zinc-900">
          <Link href="/app" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
              G
            </div>
            <span className="text-sm font-semibold">GPTO</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{userNombre}</span>
            <form action={logout}>
              <button type="submit" className="rounded-md border border-zinc-200 p-1.5 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </header>

        {/* Nav horizontal para móvil */}
        <nav className="flex gap-1 overflow-x-auto border-b border-zinc-200 bg-white px-4 py-2 lg:hidden dark:border-zinc-800 dark:bg-zinc-900">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
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
