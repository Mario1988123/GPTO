# MEMORIA — GPTO

Estado vivo del proyecto. Se actualiza al final de cada iteración.

---

## Iteraciones más recientes

### Capa 4.1 — Proyectos + Armarios + Configurador 2D · ✅ Cerrada
**Fecha**: 2026-04-23

**Resultado**
🌐 UI en prod: https://gpto-psi.vercel.app/app/proyectos

**Demo cargada**
- 1 proyecto "Dormitorio principal — Calle Mayor 10" (cliente de prueba).
- 1 armario "Armario empotrado principal" (2400×2500×600 mm).
- 4 módulos "Módulo base" de 600 mm cada uno → llenan exactamente el ancho.
- Al abrir el configurador se ve la vista frontal esquematizada con 4 bloques coloreados, barra de ocupación verde al 100%.

**Migraciones aplicadas**
- `013_proyectos.sql` — `proyectos` (FK clientes, estado CHECK) + `armarios` (CASCADE) + `modulos_armario` (CASCADE + tipos_modulo RESTRICT).
- `014_proyectos_rls.sql` — RLS. `proyectos` con `empresa_id` directo; `armarios` y `modulos_armario` heredan vía `EXISTS` por la FK padre.

**Decisiones tomadas (defaults autorizados por Mario)**
- **Jerarquía**: Cliente → Proyecto → Armarios → Módulos.
- **Posición módulos**: columnas horizontales con `orden INTEGER`. Cada módulo ocupa alto total del armario.
- **Estados**: borrador / presupuestado / confirmado / en_fabricacion / entregado / cancelado.
- **2D primero**: el 3D Three.js + R3F queda para Capa 4.2 en sub-iteración posterior.
- **Persistencia al guardar**: forms envían al servidor, server actions hacen redirect + revalidatePath.

**UI**
- `/app/proyectos` — listado con filtro por estado, badges coloreados.
- `/app/proyectos/nuevo` — form con select cliente + estado inicial.
- `/app/proyectos/[id]` — datos + tabla armarios + form inline crear armario.
- `/app/proyectos/[id]/armarios/[armarioId]` — **configurador**:
  - Vista frontal esquematizada a escala (aspect ratio del hueco real, módulos como columnas coloreadas con su nombre y ancho).
  - Barra de progreso verde/rojo: verde si cabe, rojo con texto "Exceso: N mm" si la suma supera el hueco.
  - Form editar dimensiones del hueco.
  - Tabla módulos con botones ↑/↓/Quitar.
  - Form añadir módulo: client component que autocompleta ancho desde `tipo_modulo.ancho_default_mm` y alto/fondo desde el armario padre al seleccionar el tipo.

**Pendiente para siguientes capas**
- **Capa 4.2 (3D)**: renderizar el mismo configurador con Three.js + R3F.
- **Capa 5 (explosión)**: generar lista de piezas físicas de cada módulo aplicando `calcularDimension()` del tipo_modulo.
- **Capa 7 (presupuestos)**: calcular coste = Σ piezas × precio_m² + Σ herrajes + mano de obra (estado `presupuestado`).
- **Capa 9 (producción)**: estado `en_fabricacion`, kanban por armario o módulo.

---

### Capa 3 — Tipos de módulo · ✅ Cerrada
**Fecha**: 2026-04-23

**Resultado**
🌐 UI en prod: https://gpto-psi.vercel.app/app/tipos-modulo — plantillas paramétricas con fórmulas estructuradas, preview de dimensiones calculadas, herrajes asociados.

**Demo cargada**
- 2 tipos: "Módulo base 60×70×40" (5 piezas: 2 laterales, suelo, techo, trasera, frontal; 4 bisagras) y "Colgador alto 100×200×55".
- Preview en vivo calcula cada pieza: ej. frontal del módulo base con grosor 16mm → `600 + (-2)×16 = 568 mm` de largo.

**Migraciones aplicadas**
- `011_tipos_modulo.sql` — `tipos_modulo` + `tipo_modulo_piezas` + `tipo_modulo_herrajes`. Constraints de coherencia (`fuente='fijo' ⇔ valor_fijo_mm NOT NULL`). Trigger autofill_empresa en tipos_modulo.
- `012_tipos_modulo_rls.sql` — RLS. Las tablas hijas (piezas, herrajes) usan policies `EXISTS` sobre `tipos_modulo` padre (heredan empresa_id a través de la FK).

**Decisiones tuyas aplicadas**
- **1a fórmulas**: 4 campos estructurados por dimensión (`fuente`, `ajuste_mm`, `ajuste_grosores`, `valor_fijo_mm`). Sin eval de strings. Tu ejemplo (frontal = ancho − 2×grosor) es exactamente: `fuente='ancho'`, `ajuste_grosores=-2`.
- **2a default**: `tipos_modulo.referencia_tablero_default_id UUID` (FK opcional).
- **3a horas fijas**: `horas_fabricacion_default NUMERIC(5,2)`. Capa 9 (producción) registrará reales para comparar con estimaciones.

**UI destacable**
- **7 presets de pieza** que autocompletan las fórmulas: Frontal / Puerta, Lateral, Balda, Suelo-techo (dos variantes), Trasera, Personalizado. Botones client-side en `pieza-form.tsx`.
- **Preview en vivo**: cada pieza muestra fórmula legible (ej: `ancho − 2·grosor`) y el resultado numérico con los defaults del tipo.
- Fuente="fijo" desbloquea el campo `valor_fijo_mm`; constraint BD rechaza el valor si no hay coherencia.
- Sección herrajes: asociación N:M con cálculo de coste unitario × cantidad.

**Helper reutilizable**
`calcularDimension()` en `src/lib/tipos/tipos_modulo.ts` — la función que Capa 4 (configurador) llamará con medidas reales del usuario para generar la lista de piezas físicas.

---

### Capa 2 — Catálogo · ✅ Cerrada
**Fecha**: 2026-04-23

**Resultado**
🌐 UI en prod: https://gpto-psi.vercel.app/app/catalogo — 6 CRUDs completos con datos demo ya cargados (2 proveedores, 3 materiales, 3 acabados, 3 referencias de tablero, 2 cantos, 3 herrajes).

**Migraciones aplicadas**
- `008_catalogo.sql` — 6 tablas (proveedores, materiales, acabados, referencias_tablero, cantos, herrajes) con constraints, índices, triggers updated_at.
- `009_catalogo_rls.sql` — RLS ON en las 6 tablas, 24 policies (4 por tabla, patrón idéntico).
- `010_autofill_empresa.sql` — trigger BEFORE INSERT autocompleta `empresa_id` desde la sesión. **Fix crítico**: sin este trigger, las INSERTs desde server actions fallaban con "new row violates row-level security policy". Aplicado también a `usuarios` y `clientes` retroactivamente.

**UI (`src/app/app/catalogo/`)**
- `page.tsx` — índice con tarjetas + contadores activos por entidad.
- `shared.tsx` — helpers (Field, Select, Textarea, SubmitButton, ActivoPill, euros, ToastFromSearchParams).
- 6 carpetas por entidad con patrón `actions.ts + page.tsx + form.tsx + nuevo/page.tsx + [id]/page.tsx`.
- `proveedores`, `materiales`, `acabados`: CRUDs simples.
- `referencias-tablero`: CRUD con FK selects a material+acabado (obligatorios) y proveedor (opcional).
- `cantos`: FK selects opcionales a acabado, grosor, proveedor. Regla `__ninguna__` para valores vacíos.
- `herrajes`: categoría (bisagra/tirador/guía/...) + precio_unidad + stock.
- Toasts verde/rojo 3s con sonner en todas las acciones.

**Decisiones de Mario (1a 2b 3b 4a 5a)**
- `config_empresa` sigue como JSONB en empresas.
- `materiales` con categoría (tablero / madera_maciza / dm / melamina / contrachapado / otro).
- `proveedores` en tabla separada con FK opcional en referencias/cantos/herrajes.
- `herrajes` completo: tipo + precio_unidad + stock_disponible.
- Soft delete `activo` en las 6 tablas.

**Unidades fijas**
- Grosor: mm (INTEGER).
- Precios: EUR `NUMERIC(10,2)` — `precio_m2`, `precio_ml`, `precio_unidad`.

---

### Capa 1 — Clientes · ✅ Cerrada
**Fecha**: 2026-04-23

**Resultado**
🌐 UI en prod: https://gpto-psi.vercel.app/app/clientes — listado, búsqueda, filtro activos/inactivos/todos, crear, editar, desactivar/reactivar, eliminar.
🧪 Verificación: insert/select contra BD remota con sesión de Mario → OK (RLS filtra por empresa).

**Migraciones aplicadas**
- `006_clientes.sql` — tabla con `direccion JSONB`, `UNIQUE (empresa_id, nif) WHERE nif IS NOT NULL`, trigger updated_at, índices por empresa y por nombre.
- `007_clientes_rls.sql` — RLS on. SELECT misma empresa · INSERT/UPDATE admin+operario · DELETE solo admin.

**Código frontend (`src/app/app/clientes/`)**
- `page.tsx` — listado con búsqueda y filtros.
- `nuevo/page.tsx` + `[id]/page.tsx` — crear y editar (form compartido).
- `cliente-form.tsx` — client component con campos completos y dirección anidada.
- `actions.ts` — server actions: crearCliente, actualizarCliente, alternarActivo, eliminarCliente.
- `toasts.tsx` — dispara `toast.success/error` desde `?ok=...` / `?error=...` tras redirect de server action.
- `src/lib/tipos/cliente.ts` — tipos `Cliente` y `Direccion`.

**Infra UI**
- `sonner` instalado vía shadcn → `src/components/ui/sonner.tsx`.
- `<Toaster position="top-right" duration={3000} richColors closeButton />` en `src/app/layout.tsx`.
- `next-themes` añadido como dep transitiva.

**Decisiones tomadas en esta iteración (autorizadas por Mario en masa con "sigue" tras Capa 0)**
- `direccion` → JSONB (flexible, evita migración si el formato cambia).
- `nif` → único dentro de la empresa, pero opcional (clientes sin NIF permitidos).
- Soft delete (`activo=false`) como flujo principal; DELETE hard disponible solo para admins, se romperá por FK cuando haya presupuestos en Capa 7 (deseable).

---

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

## Siguientes iteraciones

**Capa 5 — Explosión de piezas + QR** (recomendado como siguiente, sin BD nueva compleja):
- Función SQL `generar_piezas_modulo(modulo_armario_id)` que aplica `calcularDimension()` y devuelve las piezas físicas con largo × ancho × grosor × cantidad × referencia_tablero.
- Tabla `piezas_modulo` (cache materializada) para que las capas 6 y 7 la consulten directamente.
- Ruta `/t/[qr]` pública para trazabilidad.
- QR único por pieza con `qrcode` library.

**Capa 4.2 — Render 3D con R3F** (opcional, puede ir en paralelo):
- `@react-three/fiber` + `@react-three/drei`.
- Renderizar cada módulo como Box con sus dimensiones reales.
- Cámara orbital, luces.
- Botón "Ver 3D" desde la página del configurador.

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
- **Capa 1** (2026-04-23): clientes CRUD con RLS + soft delete + toasts.
- **Capa 1** ✅ **CERRADA**.
- **Capa 2** (2026-04-23): catálogo completo (6 entidades CRUD) + trigger autofill empresa_id.
- **Capa 2** ✅ **CERRADA**.
- **Capa 3** (2026-04-23): tipos_modulo con fórmulas estructuradas + piezas + herrajes + presets UI + preview.
- **Capa 3** ✅ **CERRADA**.
- **Capa 4.1** (2026-04-23): proyectos + armarios + configurador 2D esquemático.
- **Capa 4.1** ✅ **CERRADA**.
- **Capa 5** (siguiente) — explosión de piezas + QR.
- **Capa 4.2** (opcional paralelo) — render 3D con Three.js + R3F.
