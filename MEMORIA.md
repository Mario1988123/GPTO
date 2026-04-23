# MEMORIA — GPTO

Estado vivo del proyecto. Se actualiza al final de cada iteración.

---

## Iteraciones más recientes

### Capa 12 — Portal cliente final · ✅ Cerrada
**Fecha**: 2026-04-23

**Resultado**
- 🌐 `/c/[token]` — portal público mobile-first para el cliente final.
- Se genera automáticamente un `acceso_token UUID` al crear cualquier proyecto.
- En `/app/proyectos/[id]` hay una tarjeta verde con la URL del portal para copiarla y mandarla al cliente por WhatsApp/email.

**Migración**
- `026_proyectos_token.sql` — `ALTER TABLE proyectos ADD COLUMN acceso_token UUID UNIQUE DEFAULT gen_random_uuid()`.

**Autenticación**
- No usa policies anon: la ruta usa `createAdminClient` (service_role) server-side y filtra por `acceso_token`. El token UUID es la auth.
- Valida formato UUID antes de consultar.

**Contenido del portal**
- Logo empresa + proyecto + estado.
- Progreso de fabricación con barra y 4 contadores (pendiente / cortada / producida / entregada).
- Tarjeta pedido (si existe) con nº, fecha y entrega prevista.
- Tarjeta presupuesto (si enviado/aceptado) con total.
- Lista armarios con módulos (indicando si llevan apilado).
- Contacto empresa con tel/email clickables.

**Capa 0-12 completas** 🎉 — Hoja de ruta original cerrada de extremo a extremo.

---

### Capa 10 — Trazabilidad pública mejorada · ✅ Cerrada
**Fecha**: 2026-04-23

**Resultado**
- 🌐 `/t/[qr]` rediseñado con timeline visual + historial cronológico + contacto empresa.
- Tabla `pieza_eventos` nueva + trigger que registra cada cambio de estado automáticamente (estado_anterior, estado_nuevo, actor_user_id, timestamp).

**Migraciones**
- `024_pieza_eventos.sql` — tabla + trigger `log_pieza_evento()` AFTER INSERT OR UPDATE OF estado en `piezas_modulo`.
- `025_pieza_eventos_rls.sql` — RLS con SELECT authenticated vía cadena y SELECT anon para timeline público.

**UI `/t/[qr]`**
- Cabecera con logo empresa (desde `config_empresa.logo_url`) + nombre.
- Tarjeta principal con estado pill + timeline horizontal 4 pasos con círculos numerados, check verde en completados, negro en actual, línea de progreso proporcional.
- Fecha entrega prevista del pedido asociado.
- Detalles técnicos (dimensiones, canto, veta, armario, proyecto, cliente, nº pedido).
- Historial cronológico vertical de eventos (from trigger) con timestamps.
- Caja contacto (tel/email/dirección clickables) desde `config_empresa`.

---

### Capa 11 — Informes · ✅ Cerrada
**Fecha**: 2026-04-23

**Resultado**
- 🌐 `/app/informes` con dashboard de métricas del negocio últimos 12 meses.
- Sin BD nueva — todas agregaciones sobre tablas existentes.

**Secciones**
- **4 KPIs** arriba: Facturación 12m, Conversión presupuestos (%), Clientes activos, Pipeline (presupuestos enviados sin respuesta).
- **Gráfico barras** Ventas por mes (12 meses) con barra destacada para mes actual y tooltip en hover.
- **Top 5 clientes** por facturación con barras proporcionales.
- **Estado de proyectos**: barra horizontal dividida por estado + leyenda con conteo.
- **Recortes/Merma**: m² aprovechados vs descartados vs total.
- **Stock bajo**: herrajes con ≤10 unidades, alerta roja si ≤2.

**Link en sidebar** con icono `BarChart3`.

---

### Capa 9 — Producción kanban · ✅ Cerrada
**Fecha**: 2026-04-23

**Resultado**
- 🌐 `/app/produccion` — vista kanban con 4 columnas (pendiente / cortada / producida / entregada).
- Cada pieza aparece como tarjeta con nombre, cantidad, dimensiones, proyecto+armario y botones para mover a otros estados.
- Filtro por pedido activo (dropdown) o "Todos los pedidos activos".
- Sin migración BD: usa `piezas_modulo.estado` ya existente de Capa 5.
- Link al QR público `/t/[qr]` desde cada tarjeta.
- Link "Producción" añadido al sidebar con icono Hammer.

**Flujo completo implementado end-to-end**
1. Login → 2. Crear cliente → 3. Crear proyecto → 4. Configurar armarios/módulos → 5. Explosionar piezas → 6. Ejecutar nesting → 7. Calcular presupuesto → 8. Emitir y descargar PDF → 9. Marcar aceptado (genera pedido) → 10. Trasladar pedido a "en fabricación" → 11. Kanban de piezas → 12. Marcar piezas como cortadas/producidas/entregadas → 13. Estado proyecto se actualiza automáticamente.

---

### Capa 8 — Pedidos + rediseño UI global · ✅ Cerrada
**Fecha**: 2026-04-23

**Capa 8 — Pedidos**
- 🌐 `/app/pedidos` listado + `/app/pedidos/[id]` detalle.
- Relación 1:1 con presupuestos (UNIQUE `presupuesto_id`).
- Al marcar presupuesto como **aceptado** → auto-genera pedido `PED-2026-0001` y proyecto pasa a `confirmado`.
- Estados pedido: `pendiente / en_fabricacion / fabricado / entregado / cancelado`.
- Sincroniza estado del proyecto: `en_fabricacion/fabricado → proyecto en_fabricacion`; `entregado → proyecto entregado`.

**Migraciones**
- `022_pedidos.sql` — tabla con UNIQUE presupuesto_id, importe copiado.
- `023_pedidos_rls.sql` — RLS empresa directa.

**Rediseño UI global**
- Nuevo layout con **sidebar 240px** (desktop) con iconos `lucide-react` y avatar usuario con inicial.
- Móvil: nav horizontal scrollable.
- Dashboard con:
  - Saludo personalizado.
  - 4 stat cards (clientes, proyectos, presupuestos, pedidos).
  - Banner gradiente con total facturado.
  - 6 NavCards de acceso a módulos.
  - Últimos 5 proyectos y presupuestos en columnas.

---

### Capa 7.2 — PDF del presupuesto · ✅ Cerrada
**Fecha**: 2026-04-23

**Resultado**
- Botón **"Descargar PDF"** en `/app/presupuestos/[id]` (también accesible en borrador).
- Ruta API `/api/presupuestos/[id]/pdf` (Node runtime) genera PDF server-side con `@react-pdf/renderer@4.5.1`.
- PDF A4 con cabecera (logo+datos empresa), caja cliente, tabla de líneas agrupadas por categoría, totales destacados, notas y pie fijo con paginación.
- Nombre archivo = número del presupuesto (`PRES-2026-0001.pdf`) o `presupuesto-borrador.pdf`.

**Archivos**
- `src/lib/pdf/presupuesto.tsx` — componente PDF React.
- `src/app/api/presupuestos/[id]/pdf/route.tsx` — handler GET con auth + queries JOIN + renderToBuffer.

**Config opcional en `empresas.config_empresa`** (cualquiera puede editarlo con futuro UI `/app/ajustes`):
- `logo_url` — URL pública de imagen.
- `empresa_nif`, `empresa_direccion`, `empresa_telefono`, `empresa_email` — datos que aparecen en cabecera.

**Deps añadidas**: `@react-pdf/renderer@4.5.1`.

---

### Capa 7.1 — Presupuestos (borrador + emitir + líneas editables) · ✅ Cerrada
**Fecha**: 2026-04-23

**Resultado**
🌐 `/app/presupuestos` listado; `/app/presupuestos/[id]` detalle con líneas inline editables, totales (subtotal/desc/base/IVA/total), metadatos (validez, modo, descuento global, IVA, notas), botones "Regenerar desde proyecto", "Emitir" y transiciones aceptado/rechazado/caducado.

🔢 Número automático `PRES-2026-0001` vía función SQL `get_next_sequence(tipo)` con UPSERT en tabla `secuencias (empresa_id, tipo, anio)`. Soporte también para PED/ALB/PIE/LOT.

**Migraciones aplicadas**
- `020_presupuestos.sql`: `secuencias`, `presupuestos`, `presupuestos_lineas`, función `get_next_sequence` en SQL puro con UPSERT + RETURNING formateado.
- `021_presupuestos_rls.sql`: RLS. Secuencias solo lectura (modificadas vía función SECURITY DEFINER). Presupuestos y líneas admin+operario.

**Decisiones aplicadas**
- **Congelar al emitir**: snapshot JSONB captura proyecto + cliente + líneas en el momento. Post-emisión no se puede editar líneas; solo cambiar estado.
- **Número asignado en emisión** (NULL en borrador). Fecha emisión = hoy.
- **Descuento por línea + global** combinables.
- **IVA 21%** default, editable por presupuesto.
- **Mano de obra**: `precio_hora_mano_obra_eur` en `empresas.config_empresa` (default 25). Se multiplica por horas × `particiones_verticales`.

**Cálculo automático** (línea por categoría):
- Tableros: por referencia, `N × área_útil_m² @ precio_m²`.
- Cantos: longitud según `lados_con_canto` × cantidad piezas, sumada por `canto_id`, `@ precio_ml`.
- Herrajes: `cantidad_herraje × módulos × particiones_verticales @ precio_unidad`, sumado por herraje.
- Mano de obra: `Σ horas_tipo_modulo × particiones` `@ precio_hora`.

**Pendiente**
- Capa 7.2: PDF descargable con `@react-pdf/renderer` (plantilla fija con logo empresa).

---

### Capa 6.3 — Particiones verticales (apilar módulos) · ✅ Cerrada
**Fecha**: 2026-04-23

**Resultado**
- Campo nuevo `modulos_armario.particiones_verticales` (INTEGER, default 1, CHECK 1-10).
- La función `regenerar_piezas_modulo` divide `alto_mm` entre particiones y multiplica `cantidad` por particiones.
- UI: input "Particiones ↕" en form del módulo + auto-sugerencia `ceil(alto / tablero_util_alto)` al cambiar tipo/alto.
- Visualización: líneas horizontales punteadas en el preview frontal del armario por cada partición; columna "Part." en tabla de módulos.
- Verificado en BD: módulo 600×2500×600 con particiones=2 genera piezas con alto efectivo 1250 mm y cantidades x2 (Lateral ×4, Suelo ×2, Techo ×2, Trasera ×2, Frontal ×2).

**Migración**
- `019_particiones_verticales.sql` — ALTER TABLE + REPLACE FUNCTION.

**Semántica**
Un módulo con `particiones_verticales = 2` se fabrica como **2 módulos físicos apilados verticalmente**, cada uno con `alto = alto_mm / 2`. Las piezas se calculan usando ese alto efectivo y se duplica la cantidad. Coincide con la respuesta de Mario: *"si mide 3m → 2 de 1,5m"*.

**Limitación identificada**
Con alto=2500 y particiones=2, el alto efectivo es 1250 mm y las piezas interiores (trasera 568×1218, frontal 568×1250) siguen excediendo el tablero útil de 1200 mm por ~18-50 mm. Solución: usar particiones=3 (alto efectivo 833 mm) o ajustar alto del armario a 2400 mm (múltiplo que da 1200 exacto).

**Decisiones de Mario aplicadas**
1. ✅ Partir MÓDULO entero (no pieza individual).
2. Herraje de unión entre módulos apilados → **aparcado** hasta Capa 7 presupuestos (añadir `config_empresa.herraje_union_default_id`).
3. Punto de corte al medio por defecto. Optimización "coincidir con balda" queda para Capa 6.5 (asistente determinista).
4. ✅ Avisar al cliente en presupuesto: línea "Fabricado en N partes apilables" — a implementar en Capa 7.

---

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
- **Capa 6.3** (2026-04-23): particiones verticales de módulos (apilar módulos grandes). ✅
- **Capa 7.1** (2026-04-23): presupuestos con líneas editables + emisión con snapshot + numeración automática. ✅
- **Capa 7.2** (2026-04-23): PDF descargable del presupuesto. ✅
- **Capa 8** (2026-04-23): pedidos 1:1 con presupuestos + rediseño UI global (sidebar + dashboard). ✅
- **Capa 9** (2026-04-23): producción kanban de piezas con filtro por pedido. ✅
- **Capa 11** (2026-04-23): informes con KPIs + gráficos ventas + top clientes + merma + stock. ✅
- **Capa 10** (2026-04-23): trazabilidad `/t/[qr]` con timeline visual + historial de eventos + contacto empresa. ✅
- **Capa 12** (2026-04-23): portal cliente final `/c/[token]` con progreso, pedido, presupuesto, armarios y contacto. ✅
- 🎉 **HOJA DE RUTA ORIGINAL COMPLETA** (Capas 0-12) 🎉
- **Iteraciones opcionales pendientes**:
  - **Capa 6.2** — drag&drop manual sobre plano de corte nesting.
  - **Capa 6.3 extendido** — herraje de unión específico al facturar módulos apilados.
  - **Capa 6.5** — asistente determinista de optimización de dimensiones.
  - **Mini 5.1** — PDF etiquetas QR para pegar en piezas físicas.
  - **Capa 11 extendido** — asistente IA (Claude) con sugerencias humanas sobre nesting/ventas.
  - **Ajustes empresa** — UI /app/ajustes para editar config_empresa (logo, nif, contacto, precio_hora, etc).
- **Capa 6.2** (opcional) — drag&drop manual sobre el plano de corte.
- **Capa 6.5** (opcional) — asistente determinista de optimización dimensiones.
- **Capa 4.2** (paralelo opcional) — render 3D con Three.js + R3F.
- **Mini 5.1** (opcional) — PDF etiquetas QR.
