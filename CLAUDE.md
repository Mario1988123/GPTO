# CLAUDE.md — GPTO

Contexto permanente para futuras sesiones de Claude Code en este repositorio.
**Léeme entero antes de hacer nada.**

---

## Usuario
**Mario Ortigueira** — comercial, no programador. Alta alfabetización con herramientas.
- Idioma: español. TODA UI, commits, comentarios y conversación en español.
- Entorno: Windows 11 + Git Bash. Ruta local del repo: `C:\GPTO`.
- Claude ejecuta `git add` / `commit` / `push` directamente. Mario no toca terminal salvo tareas externas (Vercel, Supabase, GitHub web).
- GitHub: `Mario1988123`. Email commits: `mario.ortigueira@me.com`.

---

## Proyecto
**GPTO**: SaaS multicliente de carpintería para armarios empotrados a medida.
- Repo: https://github.com/Mario1988123/GPTO
- Rama de trabajo SIEMPRE: `DESARROLLO-CLAUDE` (nunca `main`).
- Hosting: Vercel (`gpto.vercel.app` free).
- BD: Supabase — proyecto NUEVO, NO reutilizar el de TURIVAL.

---

## Stack obligatorio
- **Framework**: Next.js 16 + React 19 + TypeScript (App Router, `src/`).
- **UI**: Tailwind 4 + shadcn/ui (base-color: zinc, CSS variables).
- **Backend**: Supabase (auth + Postgres + RLS).
- **3D**: Three.js + `@react-three/fiber`.
- **Etiquetado**: `qrcode` + `jsbarcode`.
- **PDF**: `@react-pdf/renderer`.
- **Nesting 2D**: librería por decidir en Capa 6.
- **Gestor**: `pnpm`, siempre con `pnpm install --no-frozen-lockfile`.

⚠️ **Next.js 16 tiene breaking changes** respecto a versiones previas. Consulta `node_modules/next/dist/docs/` antes de tocar APIs de Next. (Ver `AGENTS.md` raíz).

---

## Multitenancy (decisión cerrada)
- **Opción A**: monocliente técnico con `empresa_id` + RLS en TODAS las tablas desde día 1.
- Mario es la única empresa durante MVP. Activación SaaS futura sin migrar datos.
- Identificación de empresa por login Supabase (sin subdominio ni subdirectorio).
- Registro: Mario crea cuentas manualmente (no hay auto-registro).
- Roles MVP: `admin`, `operario`, `cliente_final` (vista pública sin login).

---

## Reglas de trabajo (innegociables, heredadas de TURIVAL)
1. **Una cosa por iteración.** No abrir tres frentes a la vez.
2. **Desarrollo por capas en el orden fijo.** NUNCA saltar capas. Si una capa no está cerrada, no se pasa a la siguiente.
3. **BD = zona sensible.** Ningún renombrado / borrado / cambio de tipo sin bloque formal `CAMBIO DE BD` aprobado:
   ```
   CAMBIO DE BD
   - Qué cambia:
   - Por qué:
   - Tablas afectadas:
   - Migración (SQL):
   - Rollback (SQL):
   - Riesgo:
   ```
4. **Nomenclatura fija**: entidad aprobada no cambia de nombre sin pedírselo.
5. **Cambios mínimos**: no rehacer lo que funciona. No optimizar sin que lo pida.
6. **Commits en español**: `feat: Sub 0.1 setup inicial Next.js + Tailwind + shadcn`.
7. **SQL numerado** en `/supabase/migrations/`: `001_nombre.sql`, `002_nombre.sql`.
8. **PL/pgSQL sin `DECLARE`**: usar `LANGUAGE sql` puro siempre que se pueda.
9. **Supabase Select con value vacío** → usar `__ninguna__`, nunca `""`.
10. **Toasts verde/rojo 3s** en TODAS las acciones UI (guardar, borrar, confirmar).
11. **Justificar borrados**: explicar por qué es seguro y qué lo sustituye.
12. **Prohibido v0.app.**
13. **Fuera de alcance de capa actual** → anotar en `NOTAS.md` como "siguiente paso", no implementar.
14. **Si no recuerdas un detalle, pregunta. No inventes.**

---

## Hoja de ruta por capas (orden inmutable)
- **Capa 0** — Multitenancy + Auth + RLS (sub 0.1 setup, 0.2 Supabase, 0.3 schema empresa/usuario, 0.4 login + guards)
- **Capa 1** — Clientes
- **Capa 2** — Catálogo (materiales, acabados, referencias_tablero, cantos, herrajes, config_empresa)
- **Capa 3** — Biblioteca `tipos_modulo`
- **Capa 4** — Configurador 2D+3D (Three.js + R3F)
- **Capa 5** — Explosión de piezas + QR
- **Capa 6** — Nesting automático + manual (respeta veta, kerf, merma, recortes)
- **Capa 7** — Presupuestos (modo detallado / precio cerrado)
- **Capa 8** — Pedidos
- **Capa 9** — Producción kanban + operarios
- **Capa 10** — Trazabilidad pública `/t/[qr]`
- **Capa 11** — Informes
- **Capa 12** — Portal cliente final

---

## Decisiones clave de BD (cerradas)
- `empresa_id` + RLS en TODA tabla de negocio desde día 1.
- `referencias_tablero` = **núcleo del catálogo**: `material_id` + `acabado_id` + `grosor_mm` + `precio_m2` + `respeta_veta`. Entradas reales, NO combinatoria libre.
- `cantos`: precio/metro lineal. Filtrables por `acabado_id` y/o `grosor_mm` (ambos pueden ser NULL → aplica a todos).
- Tablero estándar 244×122 cm, útil 240×120 cm (en `config_empresa`).
- Trasera por defecto 10 mm, configurable por proyecto.
- Fondo de armario por defecto 61 cm libre. Ancho / alto / fondo libres por módulo.
- Kerf por defecto 3 mm, configurable.
- Nesting respeta veta si `referencia_tablero.respeta_veta = true`.
- Almacén de recortes con tamaño real, reutilizables.
- Presupuesto `modo_presentacion`: `'detallado_modulo' | 'precio_cerrado'`.
- Mano de obra MVP: horas × precio_hora manual por módulo. Futuro: tarifas fijas por `tipo_modulo`.
- IVA 21%. Validez 15/30/60/90 días. Descuento por línea.
- Numeración secuencial: función `get_next_sequence(tipo)` → `PRES/PED/ALB/PIE/LOT-2026-0001`.

---

## Formato de respuesta (obligatorio por iteración)
Cada iteración responde con estos 7 bloques:

🎯 **Objetivo de esta iteración** — una frase.
📋 **Propuesta** — qué y por qué.
⚠️ **Impactos** — BD / Backend / Frontend / Otros módulos (sí/no y qué).
📦 **Ejecución** — archivos creados, comandos, commit+push a `DESARROLLO-CLAUDE`.
✅ **Qué hace Mario ahora** — pasos manuales externos concretos.
➡️ **Siguiente paso sugerido** — qué toca la próxima iteración.
🧠 **Bloque de memoria** — actualizar `MEMORIA.md` al final de cada iteración.

---

## Comandos frecuentes
```bash
pnpm install --no-frozen-lockfile
pnpm dev            # http://localhost:3000
pnpm build
pnpm lint
pnpm dlx shadcn@latest add <componente>   # añadir componente shadcn
```

---

## Estructura
```
/src/app             # rutas App Router
/src/components/ui   # shadcn/ui
/src/lib             # helpers (utils.ts, clientes Supabase, etc.)
/public              # estáticos
/supabase/migrations # SQL numerado
/docs                # documentación funcional
```

---

## Estado vivo
Ver `MEMORIA.md` para el estado actual del proyecto, iteración en curso, lo completado y lo pendiente. Se actualiza al final de cada iteración.
Ver `NOTAS.md` para ideas fuera del alcance de la capa actual.
