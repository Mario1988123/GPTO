# GPTO

SaaS multicliente de carpintería para armarios empotrados a medida.
Del configurador 3D a la producción, sin hojas de cálculo.

> Proyecto en construcción. Ver `CLAUDE.md` para el contexto completo y `MEMORIA.md` para el estado actual.

---

## Stack
Next.js 16 · React 19 · TypeScript · Tailwind 4 · shadcn/ui · Supabase · Three.js + R3F · pnpm

## Desarrollo local

```bash
pnpm install --no-frozen-lockfile
pnpm dev
```
Luego abre http://localhost:3000

## Scripts

- `pnpm dev` — servidor de desarrollo con Turbopack
- `pnpm build` — build de producción
- `pnpm start` — servir el build
- `pnpm lint` — linter

## Estructura

```
src/app              Rutas App Router
src/components/ui    Componentes shadcn/ui
src/lib              Helpers (utils, clientes Supabase, etc.)
public               Estáticos
supabase/migrations  Scripts SQL numerados (001_..., 002_...)
docs                 Documentación funcional del proyecto
```

## Ramas

- `main` — estable / production.
- `DESARROLLO-CLAUDE` — rama de trabajo activa durante el MVP.

## Documentación interna

- `CLAUDE.md` — reglas, decisiones cerradas, hoja de ruta por capas.
- `MEMORIA.md` — estado vivo, iteración actual, dependencias, lo pendiente.
- `NOTAS.md` — ideas fuera del alcance de la capa actual.

## Licencia

Propietaria. Todos los derechos reservados.
