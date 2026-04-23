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
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { logout } from "../login/actions";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const NAV_MAIN: NavItem[] = [
  { href: "/app", label: "Panel", icon: LayoutDashboard },
];

const NAV_NEGOCIO: NavItem[] = [
  { href: "/app/clientes", label: "Clientes", icon: Users },
  { href: "/app/proyectos", label: "Proyectos", icon: FolderKanban },
  { href: "/app/presupuestos", label: "Presupuestos", icon: Receipt },
  { href: "/app/pedidos", label: "Pedidos", icon: PackageCheck },
];

const NAV_PRODUCCION: NavItem[] = [
  { href: "/app/produccion", label: "Producción", icon: Hammer },
  { href: "/app/recortes", label: "Recortes", icon: Scissors },
];

const NAV_CONFIG: NavItem[] = [
  { href: "/app/catalogo", label: "Catálogo", icon: BookOpen },
  { href: "/app/tipos-modulo", label: "Tipos de módulo", icon: Boxes },
];

const NAV_ANALISIS: NavItem[] = [
  { href: "/app/informes", label: "Informes", icon: BarChart3 },
];

const NAV_SISTEMA: NavItem[] = [
  { href: "/app/ajustes", label: "Ajustes", icon: Settings },
];

const ALL_NAV = [
  ...NAV_MAIN,
  ...NAV_NEGOCIO,
  ...NAV_PRODUCCION,
  ...NAV_CONFIG,
  ...NAV_ANALISIS,
  ...NAV_SISTEMA,
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
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-sidebar-border lg:bg-sidebar">
        <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="text-sm font-bold tracking-tight">GPTO</span>
            {empresaNombre ? (
              <span className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
                {empresaNombre}
              </span>
            ) : null}
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-6 overflow-y-auto p-3">
          <NavGroup items={NAV_MAIN} />
          <NavGroup title="Negocio" items={NAV_NEGOCIO} />
          <NavGroup title="Producción" items={NAV_PRODUCCION} />
          <NavGroup title="Configuración" items={NAV_CONFIG} />
          <NavGroup title="Análisis" items={NAV_ANALISIS} />
          <NavGroup title="Sistema" items={NAV_SISTEMA} />
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-foreground text-background text-xs font-semibold">
                {userInicial}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-xs font-semibold">{userNombre}</span>
              {rol ? (
                <Badge variant="secondary" className="mt-0.5 w-fit rounded px-1.5 py-0 text-[9px] uppercase tracking-wider">
                  {rol}
                </Badge>
              ) : null}
            </div>
          </div>
          <Separator className="my-2" />
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-background py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar mobile */}
        <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4 lg:hidden">
          <Link href="/app" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground text-background">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-bold tracking-tight">GPTO</span>
          </Link>
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-foreground text-background text-[10px] font-semibold">
                {userInicial}
              </AvatarFallback>
            </Avatar>
            <form action={logout}>
              <button type="submit" className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-muted">
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </header>

        {/* Nav horizontal móvil */}
        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-background px-4 py-2 lg:hidden">
          {ALL_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
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

function NavGroup({ title, items }: { title?: string; items: NavItem[] }) {
  return (
    <div className="flex flex-col gap-0.5">
      {title ? (
        <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70">
          {title}
        </p>
      ) : null}
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
