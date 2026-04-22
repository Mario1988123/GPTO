# MEMORIA — GPTO

Estado vivo del proyecto. Se actualiza al final de cada iteración.

---

## Iteración actual: Sub 0.1 — Setup inicial
**Fecha**: 2026-04-22
**Estado**: ✅ Cerrada (pendiente de Mario: cambiar production branch a `DESARROLLO-CLAUDE` en Vercel).

### Resultado
🌐 **URL pública**: https://gpto-psi.vercel.app
🔗 Inspector último deploy: https://vercel.com/vercomi/gpto/8XucoYiYJ3xR3sx7EatzVhRMyVAD
🔗 Repo: https://github.com/Mario1988123/GPTO
🔗 Proyecto Vercel: https://vercel.com/vercomi/gpto (scope: `vercomi`)

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
- Página raíz `/` con placeholder "GPTO — En construcción" (verificada vía curl: HTTP 200, contiene GPTO / En construcción / Próximamente).
- Gestor de paquetes: **pnpm 10.33.1**.
- Repo local: `C:\GPTO` (movido desde OneDrive).
- Rama local: `DESARROLLO-CLAUDE` (commits: `943dc1a` setup inicial).
- Rama remote: `DESARROLLO-CLAUDE` en GitHub.
- **Vercel CLI** instalado local (devDep, `vercel@52`). Proyecto linkeado (`vercomi/gpto`). Primer deploy a producción manual (`vercel --prod`) OK.
- Repo GitHub conectado al proyecto Vercel (detectado automáticamente por `vercel link`).

### Dependencias runtime
`next@16.2.4`, `react@19.2.4`, `react-dom@19.2.4`, `@base-ui/react`, `class-variance-authority`, `clsx`, `lucide-react`, `tailwind-merge`, `tw-animate-css`.

### Dependencias dev
`@tailwindcss/postcss@4`, `@types/node`, `@types/react`, `@types/react-dom`, `eslint@9`, `eslint-config-next@16.2.4`, `tailwindcss@4`, `typescript@5`, `vercel@52`.

### Decisiones técnicas tomadas en Sub 0.1
- `pnpm` instalado vía `npm i -g pnpm` (corepack no venía en el Node 25 de Mario).
- `shadcn init` con defaults: style `new-york`, base-color `zinc`, CSS variables `sí`.
- Identity git pre-existente de Mario: `Mario1988123` / `mario.ortigueira@me.com`. Los commits saldrán con `@me.com` (no `@gmail.com`).
- `gh` CLI no instalado → Mario creó el repo en github.com manualmente.
- `main` remote tiene un "Initial commit" con README auto-generado (no tocado). `DESARROLLO-CLAUDE` es la rama con todo el setup. El primer merge formal a `main` se hará en el futuro vía PR.
- Primer deploy vía `vercel --prod` desde local; repo conectado para deploys automáticos futuros.

### Pendiente de Mario (1 único paso manual)
- [ ] Cambiar **Production Branch** de `main` a `DESARROLLO-CLAUDE` en Vercel → [vercel.com/vercomi/gpto/settings/git](https://vercel.com/vercomi/gpto/settings/git). Si no se cambia, un push a `main` desplegará en producción el README genérico; con DESARROLLO-CLAUDE como production branch, cada push automático a esa rama desplegará correctamente.

---

## Siguiente iteración: Sub 0.2 — Supabase
- Mario: crear proyecto Supabase nuevo (NO el de TURIVAL) en dashboard.supabase.com.
- Mario: pasar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Claude: instalar `@supabase/ssr` y `@supabase/supabase-js`.
- Claude: helpers cliente (`createBrowserClient`) y servidor (`createServerClient`) en `src/lib/supabase/`.
- Claude: health check visible en `/` (o en una ruta `/health`).
- Claude: configurar variables de entorno en Vercel vía CLI (`vercel env add`).

---

## Histórico por iteraciones
_(se rellena a medida que cerramos iteraciones)_
