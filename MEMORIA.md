# MEMORIA — GPTO

Estado vivo del proyecto. Se actualiza al final de cada iteración.

---

## Iteración actual: Sub 0.2 — Supabase (conectividad)
**Fecha**: 2026-04-22
**Estado**: ✅ Cerrada.

### Resultado
🌐 **URL pública**: https://gpto-psi.vercel.app — placeholder OK.
🩺 **Health check**: https://gpto-psi.vercel.app/health — 5/5 checks en verde.
🔗 **Proyecto Supabase**: `https://xvjgtaevlhwfxafteuvi.supabase.co` (ref: `xvjgtaevlhwfxafteuvi`).
🔗 Deploy Sub 0.2: `dpl_Ei21j6qYxpczy7mxiS6td746hfRs` (prod).

### Completado
- Instalados `@supabase/supabase-js@2.104.0` y `@supabase/ssr@0.10.2`.
- Helpers creados:
  - `src/lib/supabase/client.ts` — `createClient()` browser.
  - `src/lib/supabase/server.ts` — `createClient()` server con cookies (try/catch para Server Components).
- `.env.example` con las 3 variables.
- `.env.local` con las keys reales (gitignored). Excepción en `.gitignore`: `!.env.example`.
- Ruta `src/app/health/page.tsx` — Server Component dinámico (`force-dynamic`) con 5 checks:
  1. `NEXT_PUBLIC_SUPABASE_URL` definida.
  2. `NEXT_PUBLIC_SUPABASE_ANON_KEY` definida.
  3. `SUPABASE_SERVICE_ROLE_KEY` definida.
  4. Auth health (`GET /auth/v1/health`) — devuelve GoTrue v2.188.1.
  5. Cliente SSR (`auth.getSession()`) — respuesta sin sesión OK.
- Env vars configuradas en Vercel:
  - **Production**: 3/3 (URL, ANON, SERVICE).
  - **Development**: 3/3.
  - **Preview** (branch `main` explícita): 3/3.
- Redeploy a producción OK con las nuevas env vars. 5/5 checks en verde en `gpto-psi.vercel.app/health`.

### Decisiones técnicas tomadas en Sub 0.2
- Health check usa `fetch` directo a `/auth/v1/health` (endpoint oficial público) + `supabase.auth.getSession()`. Evita `auth.getUser()` que tira `Auth session missing!` en versiones recientes de `@supabase/ssr`.
- Supabase presenta **dos formatos de keys**: nuevo `sb_publishable_...` / `sb_secret_...` y legacy JWT `eyJ...`. Usamos las JWT (funcionalmente equivalentes y estándar con `@supabase/ssr`).
- CLI de Vercel v52: para `env add preview` se requiere pasar git-branch explícita (`preview main`) con `--value --yes`. Omitir la branch falla aunque los ejemplos sugieran que debería funcionar.
- `SUPABASE_SERVICE_ROLE_KEY` autorizada expresamente por Mario para subir a Vercel (credencial de alto impacto, pide confirmación específica).
- Connection string Postgres guardada en NOTAS.md para usar en Capa 2-3 (migrations con Supabase CLI).

### Pendiente
_(nada para cerrar Sub 0.2)_

---

## Siguiente iteración: Sub 0.3 — Schema empresa/usuario
Objetivo: primeras tablas del modelo multitenant.

- Tablas mínimas de Capa 0:
  - `empresas` (id, nombre, slug, config_empresa JSONB, created_at)
  - `usuarios` (id → auth.users, empresa_id → empresas, rol: admin/operario/cliente_final, nombre, activo, created_at)
- RLS activada en ambas desde día 1.
- Funciones helper para RLS: `current_empresa_id()` basada en JWT del usuario.
- Trigger: al crear usuario en `auth.users`, insertar fila correspondiente en `usuarios` (necesita decisión: ¿invitación manual o trigger automático?).
- SQL numerado: `001_extensiones.sql`, `002_empresas.sql`, `003_usuarios.sql`, `004_rls.sql`.
- Al final de 0.3: Mario existirá como primera empresa y primer admin en la BD.

---

## Siguiente-siguiente: Sub 0.4 — Login + guards
- Login con Supabase Auth (email/password).
- Middleware Next.js 16 para refrescar sesión en todas las rutas.
- Route guards: `/app/*` requiere auth. `/` público (placeholder).
- Layout `/app` con user dropdown y logout.
- Página `/health` pasará a requerir admin (o se eliminará).

---

## Sub 0.1 — Setup inicial (cerrada 2026-04-22)
- Next.js 16.2.4 + React 19.2.4 + TS + Tailwind 4 + shadcn/ui v4 (zinc).
- pnpm 10.33.1. Repo local `C:\GPTO`. Rama `DESARROLLO-CLAUDE`.
- Estructura: `src/app`, `src/components/ui`, `src/lib`, `supabase/migrations`, `docs`, `public`.
- Docs raíz: README, CLAUDE, MEMORIA, NOTAS, AGENTS.
- Placeholder `/` "GPTO — En construcción".
- GitHub: `Mario1988123/GPTO`. Vercel: `vercomi/gpto` → `https://gpto-psi.vercel.app`.
- Commits: `943dc1a` setup, `b327edf` cierre con Vercel.

---

## Histórico por iteraciones
- **Sub 0.1** (2026-04-22): setup técnico base + deploy Vercel.
- **Sub 0.2** (2026-04-22): integración Supabase + health check.
