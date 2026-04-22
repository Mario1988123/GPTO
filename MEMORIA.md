# MEMORIA — GPTO

Estado vivo del proyecto. Se actualiza al final de cada iteración.

---

## Iteración actual: Sub 0.1 — Setup inicial
**Fecha**: 2026-04-22
**Estado**: en progreso (pendiente cerrar con deploy Vercel)

### Completado
- Proyecto Next.js **16.2.4** + React **19.2.4** + TypeScript + Tailwind **4** (App Router, `src/`).
- **shadcn/ui v4** inicializado (base-color: zinc, CSS variables). Componente `button` instalado como ejemplo.
- Estructura creada:
  - `/src/app`
  - `/src/components/ui`
  - `/src/lib`
  - `/supabase/migrations`
  - `/docs`
  - `/public`
- Documentos raíz: `README.md`, `CLAUDE.md`, `MEMORIA.md`, `NOTAS.md`, `AGENTS.md` (auto).
- `.gitignore` correcto (node_modules, .next, .env*, .vercel, next-env.d.ts, *.tsbuildinfo).
- Página raíz `/` con placeholder "GPTO — En construcción".
- Gestor de paquetes: **pnpm 10.33.1**.
- Repo local: `C:\GPTO` (movido desde OneDrive).
- Rama local: `DESARROLLO-CLAUDE` (primer commit).

### Dependencias runtime
`next@16.2.4`, `react@19.2.4`, `react-dom@19.2.4`, `@base-ui/react`, `class-variance-authority`, `clsx`, `lucide-react`, `tailwind-merge`, `tw-animate-css`.

### Dependencias dev
`@tailwindcss/postcss@4`, `@types/node`, `@types/react`, `@types/react-dom`, `eslint@9`, `eslint-config-next@16.2.4`, `tailwindcss@4`, `typescript@5`.

### Decisiones técnicas tomadas en Sub 0.1
- `pnpm` instalado vía `npm i -g pnpm` (corepack no venía en el Node 25 de Mario).
- `shadcn init` con defaults: style `new-york`, base-color `zinc`, CSS variables `sí`.
- Identity git pre-existente de Mario: `Mario1988123` / `mario.ortigueira@me.com`. Los commits saldrán con `@me.com` (no `@gmail.com`).
- `gh` CLI no instalado → Mario crea el repo en github.com manualmente.

### Pendiente para cerrar Sub 0.1
- [ ] **Mario**: crear repo `GPTO` en github.com/Mario1988123 (public, vacío: sin README, sin .gitignore, sin license).
- [ ] **Claude**: hacer `git remote add origin` y `git push -u origin DESARROLLO-CLAUDE`.
- [ ] **Mario**: conectar el repo a Vercel en vercel.com (New Project → Import git repo → configurar production branch a `DESARROLLO-CLAUDE` temporalmente).
- [ ] **Mario**: confirmar URL pública funcionando.

---

## Siguiente iteración: Sub 0.2 — Supabase
- Crear proyecto Supabase nuevo (NO el de TURIVAL).
- Configurar `.env.local` con `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Instalar `@supabase/ssr` y `@supabase/supabase-js`.
- Helpers cliente (`createBrowserClient`) y servidor (`createServerClient`).
- Probar conexión básica desde la página raíz (health check).
- Configurar variables de entorno en Vercel.

---

## Histórico por iteraciones
_(se rellena a medida que cerramos iteraciones)_
