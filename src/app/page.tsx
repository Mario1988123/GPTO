import Link from "next/link";
import {
  Sparkles, Ruler, Boxes, FileText, Hammer, BarChart3,
  ArrowRight, Check, Users, FolderKanban, Receipt,
  Warehouse, Truck, ClipboardCheck, MessageCircle, Palette,
  TrendingUp, ShieldCheck, Zap, Layers, DoorOpen, Grid3x3, Wrench,
  HardHat, Quote, Star,
} from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-500/25">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-base font-bold tracking-tight">GPTO</span>
              <span className="text-[10px] font-medium text-slate-500">ERP para carpintería e interiorismo</span>
            </div>
          </Link>
          <nav className="hidden gap-6 text-sm font-medium text-slate-600 md:flex">
            <a href="#modulos" className="transition hover:text-slate-900">Módulos</a>
            <a href="#flujo" className="transition hover:text-slate-900">Flujo</a>
            <a href="#precios" className="transition hover:text-slate-900">Precios</a>
            <a href="#faq" className="transition hover:text-slate-900">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
            >
              Entrar
            </Link>
            <a
              href="#precios"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-slate-900 to-slate-800 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:shadow-xl"
            >
              Probar 14 días
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute top-20 left-20 h-72 w-72 rounded-full bg-blue-500 blur-3xl" />
          <div className="absolute bottom-20 right-20 h-96 w-96 rounded-full bg-cyan-500 blur-3xl" />
          <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Carpintería · Interiorismo · Reformas integrales
          </div>

          <h1 className="mt-6 max-w-4xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            El ERP completo
            <br />
            <span className="bg-gradient-to-br from-blue-300 via-cyan-300 to-white bg-clip-text text-transparent">
              para tu taller a medida.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
            CRM con WhatsApp · Configurador 3D · Presupuestos · Facturación legal española ·
            Nesting · Almacén con trazabilidad por QR · Plano de montaje · Pedidos a proveedores
            de corte · Rentabilidad por proyecto.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <a
              href="#precios"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-blue-500/30 transition hover:shadow-2xl hover:shadow-blue-500/40"
            >
              Empezar prueba gratis 14 días
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#modulos"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10"
            >
              Ver módulos
            </a>
          </div>

          <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <HeroStat value="14 módulos" label="ERP completo" color="text-blue-400" />
            <HeroStat value="100%" label="Facturación legal ES" color="text-cyan-400" />
            <HeroStat value="3D + QR" label="Por pieza" color="text-purple-400" />
            <HeroStat value="-25%" label="Tiempo presupuesto" color="text-emerald-400" />
          </div>
        </div>
      </section>

      {/* Para quién */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-blue-600">Diseñado para</p>
          <h2 className="mx-auto max-w-3xl text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Tres negocios. Un mismo ERP.
          </h2>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            <PerfilCard icon={HardHat} title="Carpinterías" desc="Armarios empotrados, vestidores, cocinas. Del 3D al QR de cada pieza con plano de montaje." />
            <PerfilCard icon={Palette} title="Interioristas" desc="Presupuesta proyectos completos: muebles + suelos + puertas + rodapiés. Con portal cliente." />
            <PerfilCard icon={Wrench} title="Empresas de reformas" desc="Subcontratas tu carpintería pero llevas el proyecto: gastos, márgenes, fechas y facturación legal." />
          </div>
        </div>
      </section>

      {/* Módulos detallados */}
      <section id="modulos" className="mx-auto max-w-7xl px-6 py-24">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-blue-600">Catálogo completo</p>
        <h2 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
          14 módulos que cubren todo el ciclo del proyecto.
        </h2>
        <p className="mt-3 max-w-2xl text-base text-slate-600">
          Desde que el cliente te llama hasta que le entregas la factura. Sin Excel, sin papeles
          perdidos, sin perder dinero por no saber cuánto te costó cada armario.
        </p>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <Modulo
            icon={Users}
            color="from-blue-500 to-cyan-400"
            title="CRM profesional"
            desc="Particulares y empresas, con persona de contacto, etiquetas, próximo seguimiento, timeline de interacciones (llamadas, WhatsApp, emails, visitas)."
            features={["WhatsApp con plantillas", "Importar/exportar CSV", "Historial proyectos por cliente", "Avatar y filtros por etiqueta"]}
          />
          <Modulo
            icon={FolderKanban}
            color="from-violet-500 to-fuchsia-400"
            title="Proyectos por estancias"
            desc="Cada proyecto tiene N estancias (vestidor, cocina, dormitorio…). Cada estancia tiene plano 2D + 3D y N armarios."
            features={["Plano 2D con drag & drop", "Aberturas (puertas, ventanas)", "3D con paredes y huecos reales", "Estado: borrador → entregado"]}
          />
          <Modulo
            icon={Boxes}
            color="from-amber-500 to-orange-400"
            title="Configurador 3D"
            desc="Diseña armarios con módulos apilables: cajoneras, colgadores, baldas, zapateros, LED rebaje. Tableros reales con grosor visible y puertas translúcidas toggleables."
            features={["Three.js + React Three Fiber", "Subelementos (cajón, balda, barra…)", "Auto-diseño por categoría", "Materiales con foto"]}
          />
          <Modulo
            icon={Ruler}
            color="from-emerald-500 to-teal-400"
            title="Nesting (corte óptimo)"
            desc="Algoritmo MaxRects que coloca todas las piezas del proyecto agrupando por material. Respeta veta. Almacén de recortes reutilizables."
            features={["MaxRects + best-short-side-fit", "Múltiples formatos por referencia", "Aviso si la pieza no cabe", "Recortes con reuso automático"]}
          />
          <Modulo
            icon={Receipt}
            color="from-pink-500 to-rose-400"
            title="Presupuestos"
            desc="Generación automática desde el proyecto, snapshot al emitir, descuentos por línea, IVA configurable. PDF profesional con tu marca."
            features={["Numeración automática", "Modos detallado o precio cerrado", "Aceptar → crea pedido + factura", "Validez configurable"]}
          />
          <Modulo
            icon={FileText}
            color="from-blue-600 to-indigo-500"
            title="Facturación legal ES"
            desc="Conforme RD 1619/2012. Series con numeración correlativa atómica, inmutabilidad tras emisión, rectificativas con motivo, libro IVA exportable."
            features={["Completas, simplificadas, rectificativas", "IVA 0/4/10/21 + IRPF + recargo eq.", "Snapshot fiscal congelado", "Libro IVA CSV para gestor"]}
          />
          <Modulo
            icon={DoorOpen}
            color="from-amber-600 to-yellow-500"
            title="Catálogos profesionales"
            desc="Materiales, acabados, referencias de tablero, cantos, herrajes, puertas de paso (corredera, abatible, invisible…), suelos AC4/AC5, rodapiés con LED."
            features={["Foto en cada producto", "Proveedores con precios m²/ml/min", "PickerModal con búsqueda", "Variantes: grosor muro, tapeta…"]}
          />
          <Modulo
            icon={Warehouse}
            color="from-orange-600 to-red-500"
            title="Almacenes y stock"
            desc="Almacenes principal y secundarios. Cada pieza con QR sabe en qué almacén o furgoneta está, en obra, o ya consumida."
            features={["Trazabilidad por pieza individual", "Bitácora de movimientos", "Tableros físicos enteros", "Recortes de obras anteriores"]}
          />
          <Modulo
            icon={Truck}
            color="from-cyan-500 to-blue-500"
            title="Furgonetas"
            desc="Cada furgoneta es una ubicación de stock. Sabes qué piezas viajan, con qué conductor y en qué viaje."
            features={["Asigna conductor", "Stock en tránsito real", "Movimientos con motivo", "Matrícula y mantenimiento"]}
          />
          <Modulo
            icon={ClipboardCheck}
            color="from-emerald-600 to-green-500"
            title="Pedidos de corte + recepción"
            desc="Pides al proveedor las piezas cortadas. Confirmas entregas parciales. Marcas incidencias por pieza con foto. Reclamación al proveedor con respaldo."
            features={["Albaranes parciales", "8 tipos de incidencia", "Foto adjunta", "Coste real al proyecto"]}
          />
          <Modulo
            icon={Hammer}
            color="from-zinc-700 to-zinc-500"
            title="Producción + plano montaje"
            desc="Kanban de piezas con QR individual. Plano de montaje con puntos de taladro pre-generados (sistema 32mm, baldas, barras, bisagras). PDF imprimible para taller."
            features={["QR por pieza", "Puntos de taladro automáticos", "PDF a tamaño real", "Estados de pieza"]}
          />
          <Modulo
            icon={TrendingUp}
            color="from-emerald-500 to-cyan-500"
            title="Rentabilidad por proyecto"
            desc="Registra cada gasto (madera, herrajes, corte, transporte, mano de obra…). Compara contra el presupuesto cobrado. Sabes qué proyectos te dan dinero y cuáles no."
            features={["11 categorías de gasto", "Margen % en tiempo real", "Por proyecto o por cliente", "Alertas si margen negativo"]}
          />
          <Modulo
            icon={MessageCircle}
            color="from-emerald-500 to-green-400"
            title="Portal cliente + WhatsApp"
            desc="Cada cliente recibe un enlace privado con el progreso de su proyecto. Tú le mandas WhatsApp con plantillas profesionales sin escribir nada."
            features={["URL privada con token", "Timeline de fabricación", "7 plantillas predefinidas", "1 click llamada/WhatsApp/email"]}
          />
          <Modulo
            icon={BarChart3}
            color="from-violet-600 to-purple-500"
            title="Informes y dashboard"
            desc="Facturación mensual, top clientes, conversión de presupuestos, merma media, stock bajo. Gantt de montadores con Capa 17."
            features={["Filtros por mes/año", "Top clientes y proyectos", "Conversión presupuesto→pedido", "Avisos de stock bajo"]}
          />
        </div>
      </section>

      {/* Flujo */}
      <section id="flujo" className="border-y border-slate-200 bg-slate-50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-blue-600">Flujo completo</p>
          <h2 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
            Del primer email del cliente al cobro de la factura.
          </h2>

          <ol className="mt-12 grid gap-4 lg:grid-cols-2">
            {[
              { n: "1", t: "Captas un cliente", d: "Lo das de alta o lo importas por CSV. Le mandas un WhatsApp con plantilla. Quedas a verle." },
              { n: "2", t: "Visita y mediciones", d: "Creas el proyecto con la dirección. Defines las estancias con sus dimensiones reales y aberturas (puertas, ventanas)." },
              { n: "3", t: "Diseño 3D", d: "Dentro de cada estancia colocas armarios en el plano. Configuras los módulos (cajones, baldas, puertas, LEDs) en 3D real." },
              { n: "4", t: "Presupuesto", d: "Click en \"Calcular presupuesto\" y se genera con todas las líneas: tableros, cantos, herrajes, mano de obra. Lo envías al cliente con su PDF." },
              { n: "5", t: "Cliente acepta", d: "El presupuesto pasa a aceptado. Se crea automáticamente el pedido y la factura asociada." },
              { n: "6", t: "Pides corte", d: "Con un click pides al proveedor de corte el nesting óptimo de las piezas. Defines fecha de entrega y modo recogida o envío." },
              { n: "7", t: "Recibes piezas", d: "Confirmas la recepción pieza a pieza con QR. Si alguna viene mal, registras la incidencia con foto. Reclamas con respaldo." },
              { n: "8", t: "Almacenas o llevas a obra", d: "Cada pieza queda asignada a un almacén o a una furgoneta. Trazabilidad total con movimientos cronológicos." },
              { n: "9", t: "Montaje", d: "Imprimes el plano de montaje con puntos de taladro de cada pieza. El operario monta siguiendo el PDF tamaño real." },
              { n: "10", t: "Entregas y facturas", d: "El proyecto pasa a entregado. La factura está emitida con número correlativo legal. Tu gestor descarga el libro IVA en CSV." },
            ].map((s) => (
              <li key={s.n} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 font-bold text-white shadow-md">
                  {s.n}
                </span>
                <div>
                  <h4 className="font-bold">{s.t}</h4>
                  <p className="mt-0.5 text-sm text-slate-600">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Precios */}
      <section id="precios" className="mx-auto max-w-7xl px-6 py-24">
        <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-blue-600">Suscripción mensual</p>
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
          Sin contratos. Cancela cuando quieras.
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-base text-slate-600">
          14 días gratis sin tarjeta. Después eliges el plan que te encaje. Todos los planes
          incluyen actualizaciones automáticas.
        </p>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          <Plan
            nombre="Autónomo"
            precio="49"
            desc="Para carpinteros que trabajan solos."
            features={[
              "1 usuario", "Proyectos ilimitados", "CRM completo", "Facturación legal ES",
              "Configurador 3D", "Nesting", "1 almacén", "Soporte por email",
            ]}
          />
          <Plan
            nombre="Taller"
            precio="99"
            destacado
            desc="Para talleres pequeños y medianos."
            features={[
              "Hasta 5 usuarios", "Todo lo del plan Autónomo",
              "Almacenes y furgonetas ilimitados", "Plano de montaje con puntos de taladro",
              "Pedidos de corte + incidencias", "WhatsApp con plantillas",
              "Rentabilidad por proyecto", "Soporte chat",
            ]}
          />
          <Plan
            nombre="Empresa"
            precio="199"
            desc="Para reformas integrales e interioristas."
            features={[
              "Usuarios ilimitados", "Todo lo del plan Taller",
              "Roles por especialidad", "Catálogos de suelos, puertas y rodapiés",
              "Subida de fotos al cloud", "Importar/exportar CSV",
              "API para integraciones", "Onboarding 1-a-1",
            ]}
          />
        </div>

        <p className="mx-auto mt-8 max-w-3xl text-center text-xs text-slate-500">
          Precios sin IVA. Verifactu / TicketBAI disponible bajo demanda en plan Empresa.
          Datos hospedados en Supabase (UE) con RLS multitenancy.
        </p>
      </section>

      {/* Testimonios */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Lo que dicen los talleres que ya lo usan.
          </h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            <Testimonio nombre="Mario O." cargo="Carpintería de armarios" texto="Se acabó hacer presupuestos en Excel hasta las tantas. Ahora un proyecto completo con 4 armarios me lleva 30 min en lugar de toda la tarde." />
            <Testimonio nombre="Laura V." cargo="Estudio de interiorismo" texto="Lo de presupuestar suelos, rodapiés y armarios desde la misma pantalla cambia el juego. El cliente ve el PDF y entiende todo a la primera." />
            <Testimonio nombre="Javier P." cargo="Reformas integrales" texto="La rentabilidad por proyecto me ha hecho descubrir que llevaba años perdiendo dinero en cocinas. Ahora ajusto márgenes con datos reales." />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-4xl px-6 py-24">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">Preguntas frecuentes</h2>
        <div className="mt-10 space-y-3">
          <Faq q="¿Necesito instalar nada?" a="No. GPTO funciona en el navegador. Cualquier ordenador, móvil o tablet con conexión sirve." />
          <Faq q="¿Mis datos están seguros?" a="Sí. Hospedados en Supabase (UE) con cifrado en reposo y en tránsito. Cada empresa solo ve sus propios datos (RLS desde el día 1)." />
          <Faq q="¿La facturación cumple Hacienda?" a="Sí. Conforme RD 1619/2012: numeración correlativa por serie, inmutabilidad tras emisión, rectificativas con motivo. Verifactu/TicketBAI disponible bajo demanda cuando lo necesites." />
          <Faq q="¿Puedo importar mis clientes y materiales?" a="Sí. CSV con plantilla descargable, validación por fila, alias de cabeceras en español/inglés. En 5 minutos tienes tu cartera dentro." />
          <Faq q="¿Y si quiero cancelar?" a="Cancelas con un click desde tu cuenta. Te llevas tu CSV completo de clientes, proyectos y facturas en formato exportable." />
          <Faq q="¿Cuánto tarda en estar operativo?" a="14 días de prueba gratis. La mayoría de talleres están emitiendo presupuestos en menos de 1 hora desde el alta." />
        </div>
      </section>

      {/* CTA Final */}
      <section className="bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 py-24 text-white">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h3 className="text-4xl font-bold sm:text-5xl">
            ¿Empezamos?
          </h3>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-300">
            14 días gratis. Sin tarjeta. Sin compromiso. Si no te encaja, no nos debes nada.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 px-8 py-4 text-base font-semibold text-white shadow-xl shadow-blue-500/30 transition hover:shadow-2xl hover:shadow-blue-500/40"
            >
              Empezar prueba gratis
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="mailto:hola@gpto.app"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/10"
            >
              Hablar con ventas
            </a>
          </div>
          <ul className="mx-auto mt-12 grid max-w-2xl gap-3 text-left sm:grid-cols-2">
            {[
              { i: ShieldCheck, t: "Datos en UE (Supabase)" },
              { i: Zap, t: "Sin instalación, en el navegador" },
              { i: Check, t: "Sin contratos ni permanencias" },
              { i: Layers, t: "Actualizaciones automáticas" },
            ].map(({ i: Icon, t }) => (
              <li key={t} className="flex items-center gap-2.5 text-sm text-slate-300">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="font-bold text-white">GPTO</span>
            </div>
            <p className="mt-3 text-xs leading-relaxed">
              ERP integral para carpintería, interiorismo y reformas. Hecho en España.
            </p>
          </div>
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-white">Producto</p>
            <ul className="space-y-1.5 text-xs">
              <li><a href="#modulos" className="hover:text-white">Módulos</a></li>
              <li><a href="#flujo" className="hover:text-white">Flujo</a></li>
              <li><a href="#precios" className="hover:text-white">Precios</a></li>
              <li><a href="#faq" className="hover:text-white">FAQ</a></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-white">Empresa</p>
            <ul className="space-y-1.5 text-xs">
              <li><a href="mailto:hola@gpto.app" className="hover:text-white">Contacto</a></li>
              <li><a href="mailto:soporte@gpto.app" className="hover:text-white">Soporte</a></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-white">Legal</p>
            <ul className="space-y-1.5 text-xs">
              <li><a href="#" className="hover:text-white">Términos</a></li>
              <li><a href="#" className="hover:text-white">Privacidad</a></li>
              <li><a href="#" className="hover:text-white">Cookies</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800 px-6 py-6 text-center text-xs">
          © {new Date().getFullYear()} GPTO. Todos los derechos reservados.
        </div>
      </footer>
    </main>
  );
}

function HeroStat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
      <div className={`text-2xl font-bold sm:text-3xl ${color}`}>{value}</div>
      <div className="mt-1 text-xs text-slate-300">{label}</div>
    </div>
  );
}

function PerfilCard({
  icon: Icon, title, desc,
}: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-blue-500/20">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{desc}</p>
    </div>
  );
}

function Modulo({
  icon: Icon, color, title, desc, features,
}: {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  title: string;
  desc: string;
  features: string[];
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg">
      <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white shadow-lg`}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-base font-bold tracking-tight">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{desc}</p>
      <ul className="mt-4 space-y-1.5 border-t border-slate-100 pt-4">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs text-slate-700">
            <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Plan({
  nombre, precio, desc, features, destacado,
}: {
  nombre: string;
  precio: string;
  desc: string;
  features: string[];
  destacado?: boolean;
}) {
  return (
    <div className={`relative rounded-2xl border p-6 shadow-sm ${destacado ? "border-blue-500 bg-gradient-to-br from-blue-50 to-cyan-50 ring-2 ring-blue-500/30" : "border-slate-200 bg-white"}`}>
      {destacado && (
        <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
          <Star className="h-3 w-3 fill-current" />
          Más popular
        </span>
      )}
      <h3 className="text-xl font-bold">{nombre}</h3>
      <p className="mt-1 text-sm text-slate-600">{desc}</p>
      <p className="mt-5">
        <span className="text-5xl font-bold">{precio}</span>
        <span className="ml-1 text-base font-medium text-slate-600">€/mes</span>
      </p>
      <ul className="mt-5 space-y-2 border-t border-slate-100 pt-5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <a
        href="mailto:hola@gpto.app?subject=Quiero%20probar%20GPTO"
        className={`mt-6 block rounded-lg px-4 py-3 text-center text-sm font-bold transition ${destacado ? "bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg hover:shadow-xl" : "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50"}`}
      >
        Empezar prueba gratis
      </a>
    </div>
  );
}

function Testimonio({ nombre, cargo, texto }: { nombre: string; cargo: string; texto: string }) {
  return (
    <figure className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <Quote className="h-6 w-6 text-slate-300" />
      <blockquote className="mt-3 text-sm italic leading-relaxed text-slate-700">«{texto}»</blockquote>
      <figcaption className="mt-4 text-xs">
        <span className="font-bold">{nombre}</span>
        <span className="text-slate-500"> · {cargo}</span>
      </figcaption>
    </figure>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <summary className="flex cursor-pointer items-center justify-between font-bold">
        {q}
        <span className="text-slate-400 transition group-open:rotate-45">+</span>
      </summary>
      <p className="mt-3 text-sm text-slate-600">{a}</p>
    </details>
  );
}
