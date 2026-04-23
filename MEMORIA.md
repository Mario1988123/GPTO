# MEMORIA — GPTO

Estado vivo del proyecto. Se actualiza al final de cada iteración.

---

## Iteraciones más recientes

### Capa 6.1 — Nesting automático + Almacén de recortes · ✅ Cerrada
**Fecha**: 2026-04-23

**Resultado**
- 🌐 `/app/proyectos/[id]/nesting` — botón "Ejecutar nesting" → calcula plano de corte y dibuja cada tablero en SVG a escala con las piezas coloreadas y sus dimensiones.
- 🌐 `/app/recortes` — almacén de retales reutilizables filtrable por estado.
- Link "Nesting →" en la cabecera de cada proyecto + tarjeta "Recortes" en el dashboard.

**Migraciones aplicadas**
- `017_nesting.sql` — 3 tablas: `tableros_corte` + `piezas_en_tablero` + `recortes`. Triggers autofill_empresa y updated_at.
- `018_nesting_rls.sql` — RLS. Empresa directa en tableros_corte y recortes; heredado vía EXISTS en piezas_en_tablero.

**Algoritmo** (`src/lib/nesting/max-rects.ts`)
- MaxRects Best Short Side Fit en TypeScript puro.
- Rotación 90° permitida cuando `pieza.respeta_veta=false`.
- Kerf aplicado sumando `kerf_mm` a cada lado al medir espacio.
- Split guillotine horizontal+vertical al colocar.
- Filtro de recortes: descarta rects < 50mm en cualquier lado.
- Multi-tablero: abre tableros nuevos automáticamente si una pieza no cabe.

**Flujo automático**
1. Toma todas las `piezas_modulo` del proyecto (requiere haber explosionado en Capa 5).
2. Agrupa por `referencia_tablero_id`.
3. Para cada grupo: expande `cantidad` → ocurrencias, empaca.
4. Persiste tableros + piezas colocadas + recortes residuales (estado inicial `pendiente`).

**Decisiones tomadas**
- Nesting **automático** en esta sub-capa. Manual (drag&drop) queda para Capa 6.2 sin BD nueva.
- Recortes con estado `pendiente` inicial → operario debe validar **Conservar** o **Descartar**.
- Kerf, dimensiones tablero útil, merma → todo desde `empresas.config_empresa` JSONB.
- Drag&drop real pospuesto (requiere canvas interactivo; el valor/esfuerzo con auto+edit manual posterior es aceptable).

**Limitación conocida del demo**
El armario demo tiene alto 2500mm pero tablero útil 2400mm → los laterales (2500×600) no caben en ninguna orientación. El algoritmo los reporta como `noColocadas`. Es un caso real: Mario usará tableros "altura cocina" (2750+mm) o ajustará el alto. Esta limitación NO bloquea al sistema — simplemente informa.

---

### Capa 5 — Explosión de piezas + Trazabilidad QR · ✅ Cerrada
**Fecha**: 2026-04-23

**Resultado**
- Botón "Explosionar piezas" en cada armario → calcula las piezas físicas aplicando las fórmulas de los tipos_modulo a las medidas reales.
- 20 piezas demo ya generadas en el armario principal (4 módulos × 5 piezas).
- 🌐 **Ruta pública `/t/[qr]`**: cualquier QR enlaza a una página pública con info trazable de la pieza (sin datos sensibles).

**Migraciones aplicadas**
- `015_piezas.sql` — tabla `piezas_modulo` + función `regenerar_piezas_modulo(UUID)` en SQL puro (CTEs encadenados, SECURITY DEFINER).
- `016_piezas_rls.sql` — policies SELECT authenticated (misma empresa vía EXISTS módulo→armario→proyecto), UPDATE estado admin+operario, DELETE admin, SELECT anon para `/t/[qr]`.

**Decisiones tomadas**
- Regeneración **manual** con botón explícito.
- **`qr_code` UUID** (no adivinable).
- **`/t/[qr]` abierta** sin token (la tabla no expone precios ni datos personales).

**Fórmula verificada en BD** (módulo 600mm con grosor 16mm):
- Lateral: `fuente=alto` → 2500 × 600 ✓
- Suelo: `ancho + (-2)·grosor` → 568 × 600 ✓
- Trasera: `ancho-2g × alto-2g` → 568 × 2468 ✓

---

### Capa 4.1 — Proyectos + Armarios + Configurador 2D · ✅ Cerrada
**Fecha**: 2026-04-23

🌐 UI: https://gpto-psi.vercel.app/app/proyectos
- 1 proyecto demo "Dormitorio principal — Calle Mayor 10".
- 1 armario 2400×2500×600 mm con 4 módulos base de 600mm (llenado exacto).

**Migraciones**: 013 (proyectos+armarios+modulos_armario) + 014 (RLS).

**Configurador**: vista frontal esquematizada a escala, barra verde/rojo, editar dimensiones, subir/bajar módulos, añadir con autocompletar.

---

### Capa 3 — Tipos de módulo · ✅ Cerrada
**Fecha**: 2026-04-23

🌐 UI: https://gpto-psi.vercel.app/app/tipos-modulo
- 2 tipos demo: Módulo base 60×70×40 (5 piezas + 4 bisagras) y Colgador alto.

**Migraciones**: 011 (tipos_modulo + piezas + herrajes) + 012 (RLS).

Fórmulas estructuradas (no eval), 7 presets de pieza, preview en vivo.

Helper `calcularDimension()` en `src/lib/tipos/tipos_modulo.ts`. La misma lógica está replicada en la función SQL `regenerar_piezas_modulo` de Capa 5.

---

### Capa 2 — Catálogo · ✅ Cerrada
**Fecha**: 2026-04-23

🌐 UI: https://gpto-psi.vercel.app/app/catalogo — 6 CRUDs con datos demo.

**Migraciones**: 008 (6 tablas) + 009 (RLS) + 010 (trigger autofill empresa_id — **fix crítico** aplicado también a usuarios y clientes).

Entidades: proveedores · materiales (con categoría) · acabados · referencias_tablero (núcleo) · cantos · herrajes.

---

### Capa 1 — Clientes · ✅ Cerrada
**Fecha**: 2026-04-23

🌐 UI: https://gpto-psi.vercel.app/app/clientes — CRUD + soft delete + toasts.

**Migraciones**: 006 (tabla) + 007 (RLS). JSONB dirección, UNIQUE parcial por NIF.

---

### Sub 0.4 — Auth (login + guards) · ✅ Cerrada
**Fecha**: 2026-04-23

🔐 Admin: `mario.ortigueira@me.com` / `Mario.:123` (débil MVP; cambiar).

`src/proxy.ts` (Next 16 renombra `middleware.ts`→`proxy.ts`). Layout `/app` protegido.

---

### Sub 0.3 — Schema BD multitenant · ✅ Cerrada
**Fecha**: 2026-04-23

**Migraciones (5)**: 001 (extensiones) · 002 (empresas) · 003 (usuarios) · 004 (RLS+funciones) · 005 (seed Carpintería MAZOR).

Funciones helper: `current_empresa_id()`, `current_rol()`, `es_admin()` (SQL puro, SECURITY DEFINER).

Scripts: `pnpm migrate`, `pnpm setup-admin`, `pnpm exec supabase db query --linked`.

---

### Sub 0.2 — Supabase conectividad · cerrada 2026-04-22
`@supabase/supabase-js` + `@supabase/ssr`. Env vars en Vercel (Prod + Preview/main + Dev).

### Sub 0.1 — Setup inicial · cerrada 2026-04-22
Next.js 16.2.4 + React 19.2.4 + TS + Tailwind 4 + shadcn/ui v4. Repo `C:\GPTO`. Rama `DESARROLLO-CLAUDE`.

---

## Siguientes iteraciones

**Capa 6.2 — Nesting manual (drag&drop)** (opcional):
- Client component con canvas o SVG interactivo sobre los tableros generados por 6.1.
- Drag piezas entre tableros / reposicionar / rotar con botón o tecla.
- Persiste `piezas_en_tablero.{x_mm, y_mm, rotada, tablero_corte_id}` al soltar.
- Detección de colisiones y de sobrepasar bordes.
- Sin BD nueva.

**Capa 7 — Presupuestos**:
- Tabla `presupuestos` con FK al proyecto.
- Cálculo: Σ piezas × precio_m² + cantos × ml + herrajes + mano de obra + IVA 21%.
- `modo_presentacion`: detallado_modulo | precio_cerrado.
- PDF con `@react-pdf/renderer`.

**Capa 4.2 — 3D con R3F** (paralelo opcional):
- `@react-three/fiber` + `@react-three/drei`. Toggle 2D/3D en armario.

**Mini 5.1 — PDF etiquetas QR**:
- `/api/piezas/[armarioId]/etiquetas.pdf` con `qrcode` + `@react-pdf/renderer`.

---

## URLs y recursos clave

| Recurso | Link |
|---|---|
| Producción | https://gpto-psi.vercel.app |
| Login | https://gpto-psi.vercel.app/login |
| Dashboard | https://gpto-psi.vercel.app/app |
| Proyectos | https://gpto-psi.vercel.app/app/proyectos |
| Tipos módulo | https://gpto-psi.vercel.app/app/tipos-modulo |
| Catálogo | https://gpto-psi.vercel.app/app/catalogo |
| Clientes | https://gpto-psi.vercel.app/app/clientes |
| Nesting por proyecto | https://gpto-psi.vercel.app/app/proyectos/[id]/nesting |
| Almacén recortes | https://gpto-psi.vercel.app/app/recortes |
| Trazabilidad pública | https://gpto-psi.vercel.app/t/[qr] |
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
- **Capa 1** (2026-04-23): clientes CRUD con RLS + soft delete + toasts. ✅
- **Capa 2** (2026-04-23): catálogo (6 entidades CRUD) + trigger autofill empresa_id. ✅
- **Capa 3** (2026-04-23): tipos_modulo con fórmulas estructuradas. ✅
- **Capa 4.1** (2026-04-23): proyectos + armarios + configurador 2D. ✅
- **Capa 5** (2026-04-23): explosión de piezas + función regenerar + /t/[qr] pública. ✅
- **Capa 6.1** (2026-04-23): nesting automático MaxRects + almacén de recortes con validación. ✅
- **Capa 6.2** (opcional) — drag&drop manual sobre el plano de corte.
- **Capa 7** (siguiente) — presupuestos con IVA + PDF.
- **Capa 4.2** (paralelo opcional) — render 3D con Three.js + R3F.
- **Mini 5.1** (opcional) — PDF etiquetas QR.
