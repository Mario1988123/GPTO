# MEMORIA — GPTO

Estado vivo del proyecto. Se actualiza al final de cada iteración.

---

## Iteraciones más recientes

### Sub 0.4 — Auth (login + guards) · ✅ Cerrada
**Fecha**: 2026-04-23

**Resultado**
🌐 URL prod: https://gpto-psi.vercel.app
- `/` → placeholder público.
- `/login` → form de acceso.
- `/app` → dashboard protegido (requiere auth; muestra nombre / rol / empresa).
- `/app/*` protegido por `src/proxy.ts` (Next 16 ya no usa `middleware.ts`, ahora `proxy.ts`).

🔐 **Admin inicial verificado con login real end-to-end**:
- email: `mario.ortigueira@me.com`
- password: `Mario.:123` (débil — cambiar en cuanto el proyecto tenga más usuarios; anotado en NOTAS.md).
- auth.users UUID: `6de37a26-f774-4324-a3c0-068bf557c732`.
- Fila en `public.usuarios` con rol `admin`, empresa `Carpintería MAZOR`.

**Archivos creados**
- `src/proxy.ts` — proxy (antes middleware) con matcher global.
- `src/lib/supabase/middleware.ts` — `updateSession` con cookies SSR + guards `/app` y `/login`.
- `src/lib/supabase/admin.ts` — cliente service_role para scripts admin.
- `src/app/login/page.tsx` — form.
- `src/app/login/actions.ts` — server actions `login`, `logout`.
- `src/app/app/layout.tsx` — header con nombre/rol/empresa + botón Salir + guard redirect.
- `src/app/app/page.tsx` — dashboard placeholder con tarjetas de capas próximas.
- `scripts/setup-admin.mjs` — idempotente: crea user en auth + upsert en `usuarios`.

**Archivos eliminados**
- `src/app/health/page.tsx` — ya no hace falta (login + /app cumplen su función).

**Decisiones técnicas**
- **`middleware.ts` → `proxy.ts`**: Next.js 16 renombró la convención. Misma funcionalidad, nuevo nombre. Exportamos `proxy()` en lugar de `middleware()`.
- **Service_role usada server-side** en `scripts/setup-admin.mjs` (evita RLS para crear user + fila usuarios en una sola ejecución).
- **Password débil MVP** (`Mario.:123`): aceptable porque el sistema todavía no tiene producción real ni datos sensibles; en NOTAS.md queda anotado el recordatorio de cambiarla.
- **signInWithPassword** con server action + `redirect('/app')`. Error → `/login?error=...`.

---

### Sub 0.3 — Schema BD multitenant · ✅ Cerrada
**Fecha**: 2026-04-23

**Resultado**
- `public.empresas` (RLS on) + `public.usuarios` (RLS on).
- 3 funciones helper: `current_empresa_id()`, `current_rol()`, `es_admin()` (SQL puro + SECURITY DEFINER).
- 6 policies: 2 en empresas, 4 en usuarios.
- Seed: 1 fila en empresas — "Carpintería MAZOR" / slug "mazor" / id `00000000-0000-0000-0000-000000000001`.

**Migraciones aplicadas (5)**
```
supabase/migrations/001_extensiones.sql   pgcrypto
supabase/migrations/002_empresas.sql      tabla + config_empresa JSONB + trigger updated_at
supabase/migrations/003_usuarios.sql      tabla con FK auth.users y empresa_id
supabase/migrations/004_rls.sql           funciones + policies
supabase/migrations/005_seed.sql          empresa MAZOR
```

**Scripts añadidos**
- `pnpm migrate` — aplica todos los `.sql` con `pg` direct.
- `pnpm setup-admin` — crea admin en Auth + fila en usuarios.
- `pnpm exec supabase db query -f <file> --linked` — ruta alternativa via Management API (no necesita conexión directa → esquiva problema IPv6).

**Decisiones técnicas**
- IPv6 direct connection de Supabase no funciona en la red de Mario → se usó Supabase CLI + Management API (no la conexión Postgres directa).
- Supabase CLI 2.93.1 instalado como devDep. Necesita `pnpm onlyBuiltDependencies: ["supabase"]` para que se descargue el binario en install.
- En Git Bash (Windows), comandos supabase CLI con paths funcionan sin `MSYS_NO_PATHCONV` (sí lo necesita `vercel api` pero no `supabase db query`).
- Connection string Postgres en `.env.local` (`DATABASE_URL`) — usable con pooler cuando toque (Capa 2-3).

---

## Siguiente iteración: Capa 1 — Clientes (propuesta aparcada)

Esperando aprobación tuya del bloque `CAMBIO DE BD` en `NOTAS.md` (tabla `clientes` con RLS).

Cuando lo apruebes, iteración Capa 1:
1. Aplicar migraciones `006_clientes.sql` y `007_clientes_rls.sql`.
2. UI `/app/clientes`: listado con búsqueda + paginación.
3. UI `/app/clientes/nuevo`: form create.
4. UI `/app/clientes/[id]`: detalle + editar.
5. Toasts verde/rojo 3s en save/delete.

---

## Sub 0.2 — Supabase conectividad · cerrada 2026-04-22
- `@supabase/supabase-js@2.104.0` + `@supabase/ssr@0.10.2`.
- Helpers `src/lib/supabase/client.ts` + `server.ts`.
- Ruta `/health` validada (5 checks en verde) — **eliminada en Sub 0.4** (ya no necesaria).
- Env vars en Vercel (Prod + Preview/main + Development).

## Sub 0.1 — Setup inicial · cerrada 2026-04-22
- Next.js 16.2.4 + React 19.2.4 + TS + Tailwind 4 + shadcn/ui v4 (zinc).
- Repo local `C:\GPTO`. Rama `DESARROLLO-CLAUDE`.
- GitHub: Mario1988123/GPTO. Vercel: vercomi/gpto → `gpto-psi.vercel.app`.

---

## URLs y recursos clave

| Recurso | Link |
|---|---|
| Producción | https://gpto-psi.vercel.app |
| Login | https://gpto-psi.vercel.app/login |
| Dashboard (tras login) | https://gpto-psi.vercel.app/app |
| Repo | https://github.com/Mario1988123/GPTO |
| Vercel project | https://vercel.com/vercomi/gpto |
| Supabase project | https://supabase.com/dashboard/project/xvjgtaevlhwfxafteuvi |

---

## Histórico por iteraciones
- **Sub 0.1** (2026-04-22): setup técnico base + deploy Vercel.
- **Sub 0.2** (2026-04-22): integración Supabase + health check.
- **Sub 0.3** (2026-04-23): schema BD multitenant (empresas + usuarios + RLS).
- **Sub 0.4** (2026-04-23): auth (login + proxy + layout protegido).
- **Capa 0** ✅ **CERRADA** — base multitenant + auth funcional.
- **Capa 1** (propuesta en NOTAS.md, esperando OK).
