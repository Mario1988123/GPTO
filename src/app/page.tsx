import Link from "next/link";
import { Sparkles, Ruler, Boxes, FileText, Hammer, BarChart3, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-base font-bold tracking-tight">GPTO</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-1.5 text-xs font-semibold transition hover:bg-muted">
              Entrar
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[600px] w-[1200px] -translate-x-1/2 rounded-full bg-gradient-to-br from-sidebar-primary/20 via-transparent to-transparent blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,_var(--muted)_0%,_transparent_50%)] opacity-50" />
        </div>

        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium shadow-sm backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            SaaS para carpintería · En producción
          </div>

          <h1 className="mt-6 max-w-3xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Gestión integral<br />
            <span className="bg-gradient-to-br from-foreground via-foreground/80 to-muted-foreground bg-clip-text text-transparent">
              de armarios a medida.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Del primer boceto 3D con el cliente hasta la pieza etiquetada con QR entrando al taller.
            Sin hojas de cálculo. Sin pérdida de merma. Con trazabilidad total.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background shadow-lg shadow-foreground/20 transition hover:shadow-xl hover:shadow-foreground/30"
            >
              Acceder a tu cuenta
              <ArrowRight className="h-4 w-4" />
            </Link>
            <span className="text-xs text-muted-foreground">
              Registro manual · Contacta con tu administrador
            </span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Todo en una herramienta
        </p>
        <h2 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
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

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            GPTO — SaaS multicliente para carpintería a medida.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/login" className="hover:text-foreground">Entrar</Link>
            <span>·</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </main>
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
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-lg">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
        <Icon className="h-5 w-5 text-foreground" />
      </div>
      <h3 className="text-base font-bold tracking-tight">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}
