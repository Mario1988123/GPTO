import Link from "next/link";
import { Mail, Lock, ArrowRight, Sparkles, AlertCircle } from "lucide-react";
import { login } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen flex">
      {/* Lado izquierdo - hero decorativo */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-500 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/30">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">GPTO</h1>
              <p className="text-blue-300">Armarios a medida</p>
            </div>
          </div>

          <h2 className="text-3xl font-semibold mb-4 leading-tight">
            Del boceto 3D<br />
            al taller, sin hojas de cálculo.
          </h2>

          <p className="text-slate-300 text-lg max-w-md leading-relaxed">
            Configura armarios empotrados, calcula presupuestos, optimiza el nesting
            y controla la producción pieza a pieza con QR.
          </p>

          <div className="mt-12 grid grid-cols-2 gap-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-3xl font-bold text-blue-400">3D</div>
              <div className="text-sm text-slate-300">Configurador interactivo</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-3xl font-bold text-cyan-400">QR</div>
              <div className="text-sm text-slate-300">Por pieza física</div>
            </div>
          </div>
        </div>
      </div>

      {/* Lado derecho - formulario */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Logo móvil */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">GPTO</h1>
              <p className="text-xs text-slate-500">Armarios a medida</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900">Bienvenido</h2>
              <p className="mt-1.5 text-sm text-slate-500">
                Accede a tu cuenta para continuar
              </p>
            </div>

            <form action={login} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="tu@empresa.com"
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5"
                  />
                </div>
              </div>

              {error ? (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}

              <button
                type="submit"
                className="group inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-slate-900 to-slate-800 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:shadow-xl hover:shadow-slate-900/30"
              >
                Entrar
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-slate-500">
              ¿Problemas para acceder? Contacta con tu administrador.
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            <Link href="/" className="hover:text-slate-600">
              ← Volver al inicio
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
