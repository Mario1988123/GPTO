import Link from "next/link";
import { Sparkles, ArrowRight, AlertCircle } from "lucide-react";
import { login } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Panel izquierdo - formulario */}
      <div className="flex flex-col items-center justify-center bg-background px-6 py-12 lg:px-16">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 inline-flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-background shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">GPTO</span>
          </Link>

          <h1 className="text-3xl font-bold tracking-tight">Bienvenido</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Accede a tu cuenta para continuar con tus proyectos.
          </p>

          <form action={login} className="mt-8 space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="tu@empresa.com"
                className="h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm placeholder:text-muted-foreground/60 outline-none transition focus:border-foreground focus:ring-2 focus:ring-foreground/10"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium">Contraseña</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm placeholder:text-muted-foreground/60 outline-none transition focus:border-foreground focus:ring-2 focus:ring-foreground/10"
              />
            </div>

            {error ? (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <button
              type="submit"
              className="group inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-foreground text-sm font-semibold text-background shadow-lg shadow-foreground/10 transition hover:shadow-xl hover:shadow-foreground/20"
            >
              Entrar
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </button>
          </form>

          <p className="mt-10 text-xs text-muted-foreground">
            ¿Problemas para acceder? Contacta con tu administrador.
          </p>
        </div>
      </div>

      {/* Panel derecho - visual */}
      <aside className="relative hidden overflow-hidden lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-foreground via-foreground/95 to-sidebar-primary" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,_rgba(255,255,255,0.15)_0%,_transparent_50%)]" />

        {/* Decoración geométrica: módulos apilados */}
        <svg className="absolute inset-0 h-full w-full opacity-30" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 100 100">
          <defs>
            <pattern id="grid" width="4" height="4" patternUnits="userSpaceOnUse">
              <path d="M 4 0 L 0 0 0 4" fill="none" stroke="white" strokeWidth="0.1" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />
        </svg>

        <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2">
          <div className="flex gap-2">
            <div className="flex flex-col gap-1">
              <div className="h-16 w-16 rounded-lg bg-white/10 backdrop-blur-sm ring-1 ring-white/20" />
              <div className="h-24 w-16 rounded-lg bg-white/20 backdrop-blur-sm ring-1 ring-white/20" />
              <div className="h-12 w-16 rounded-lg bg-white/10 backdrop-blur-sm ring-1 ring-white/20" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="h-32 w-16 rounded-lg bg-white/15 backdrop-blur-sm ring-1 ring-white/20" />
              <div className="h-20 w-16 rounded-lg bg-white/10 backdrop-blur-sm ring-1 ring-white/20" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="h-20 w-16 rounded-lg bg-white/20 backdrop-blur-sm ring-1 ring-white/20" />
              <div className="h-32 w-16 rounded-lg bg-white/10 backdrop-blur-sm ring-1 ring-white/20" />
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-8 right-8 z-10 text-background">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-70">Desde el boceto</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">Hasta el taller. En la misma app.</p>
          <p className="mt-3 max-w-md text-sm opacity-80">
            Configura armarios en 3D, genera presupuestos profesionales y sigue la fabricación pieza a pieza.
          </p>
        </div>
      </aside>
    </main>
  );
}
