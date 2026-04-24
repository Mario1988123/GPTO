import Link from "next/link";
import {
  Sparkles,
  Ruler,
  Boxes,
  FileText,
  Hammer,
  BarChart3,
  ArrowRight,
  Check,
} from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-500/25">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-base font-bold tracking-tight">GPTO</span>
              <span className="text-[10px] font-medium text-slate-500">Armarios a medida</span>
            </div>
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-slate-900 to-slate-800 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:shadow-xl"
          >
            Entrar
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero con gradiente oscuro estilo TURIVAL */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-500 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500 rounded-full blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            SaaS para carpintería · En producción
          </div>

          <h1 className="mt-6 max-w-3xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Gestión integral
            <br />
            <span className="bg-gradient-to-br from-blue-300 via-cyan-300 to-white bg-clip-text text-transparent">
              de armarios a medida.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
            Del primer boceto 3D con el cliente hasta la pieza etiquetada con QR entrando al taller.
            Sin hojas de cálculo. Sin pérdida de merma. Con trazabilidad total.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-blue-500/30 transition hover:shadow-2xl hover:shadow-blue-500/40"
            >
              Acceder a tu cuenta
              <ArrowRight className="h-4 w-4" />
            </Link>
            <span className="text-xs text-slate-400">
              Registro manual · Contacta con tu administrador
            </span>
          </div>

          <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <HeroStat value="100%" label="Trazabilidad" color="text-blue-400" />
            <HeroStat value="QR" label="Por pieza" color="text-cyan-400" />
            <HeroStat value="3D" label="Configurador" color="text-purple-400" />
            <HeroStat value="PDF" label="Presupuestos" color="text-emerald-400" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-blue-600">
          Todo en una herramienta
        </p>
        <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Flujo completo: configuración, corte, producción y entrega.
        </h2>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Feature
            icon={Boxes}
            title="Configurador 3D + 2D"
            desc="Diseña armarios empotrados o sueltos con módulos apilables. Visualización 3D real con Three.js y plano 2D en planta de la estancia."
          />
          <Feature
            icon={Ruler}
            title="Nesting inteligente"
            desc="MaxRects con respeto de veta y kerf. Sugerencias automáticas para optimizar merma. Almacén de recortes reutilizables."
          />
          <Feature
            icon={FileText}
            title="Presupuestos con PDF"
            desc="Numeración automática, snapshot al emitir, IVA configurable, descuentos por línea, PDF profesional descargable."
          />
          <Feature
            icon={Hammer}
            title="Producción kanban"
            desc="Pedidos generados al aceptar el presupuesto. Kanban de piezas con QR individual. Trazabilidad pública."
          />
          <Feature
            icon={BarChart3}
            title="Informes en vivo"
            desc="Facturación mensual, top clientes, conversión de presupuestos, merma real, stock bajo de herrajes."
          />
          <Feature
            icon={Sparkles}
            title="Portal cliente"
            desc="Cada cliente recibe un enlace privado con el progreso de su proyecto en tiempo real: presupuesto, pedido, piezas fabricadas."
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-y border-slate-200 bg-white py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h3 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            Listo para tu taller.
          </h3>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            Diseñado con y para carpinterías de armarios empotrados a medida. Cada detalle pensado
            para el flujo real del taller.
          </p>
          <ul className="mx-auto mt-8 grid max-w-2xl gap-3 text-left sm:grid-cols-2">
            {[
              "17 tipos de subelemento en módulos",
              "LED rebaje con color configurable",
              "Plano de estancia con puertas y ventanas",
              "Multitenancy con RLS desde día 1",
              "IVA 21% y descuentos por línea",
              "Etiquetas QR PDF por armario",
            ].map((t) => (
              <li key={t} className="flex items-center gap-2 text-sm text-slate-700">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-sm shadow-blue-500/25">
                  <Check className="h-3 w-3" />
                </div>
                {t}
              </li>
            ))}
          </ul>
          <Link
            href="/login"
            className="mt-10 inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-slate-900 to-slate-800 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:shadow-xl"
          >
            Entrar
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 sm:flex-row">
          <p className="text-xs text-slate-500">
            GPTO — SaaS multicliente para carpintería a medida.
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <Link href="/login" className="hover:text-slate-900">
              Entrar
            </Link>
            <span>·</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

function HeroStat({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color: string;
}) {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
      <div className={`text-2xl font-bold sm:text-3xl ${color}`}>{value}</div>
      <div className="mt-1 text-xs text-slate-300">{label}</div>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-blue-500/20">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-base font-bold tracking-tight text-slate-900">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{desc}</p>
    </div>
  );
}
