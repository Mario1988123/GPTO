# NOTAS — GPTO

Anotaciones sueltas: ideas fuera del alcance de la capa actual, decisiones pendientes, dudas abiertas.

---

## Pendientes de decisión

### Password MVP de Mario
Password inicial de login del admin (Sub 0.4): `Mario.:123`. Muy débil, solo para MVP interno. **Cambiar en cuanto haya más usuarios o datos reales.** El cambio puede hacerlo Mario desde `/app` (pendiente de UI de ajuste de perfil) o directamente en el dashboard de Supabase Auth.

---

## Propuestas aparcadas (esperando aprobación de Mario)

### 🪚 Capa 6.3 — Partido automático de piezas grandes
**Estado**: propuesta guardada. Requiere decisiones de negocio antes de implementar.

**Problema que resuelve**
Cuando una pieza es más grande que el tablero útil (ej: lateral de 2500mm y tablero útil 2400mm), el nesting la reporta como "no colocada". Lo lógico en carpintería es **partir la pieza** en varias unidas con herraje, no descartar el proyecto.

**Propuesta técnica**
- Detectar piezas `> tablero_util_largo` o `> tablero_util_ancho` en ambas orientaciones.
- Proponer **puntos de corte válidos** con reglas de negocio:
  - Laterales se pueden partir en sentido vertical (mejor en 2/3 que en 1/2 para que la junta no quede a altura de ojo).
  - Baldas generalmente NO se parten (se ven).
  - Frontales/puertas NUNCA se parten (estética).
- Generar 2+ `piezas_modulo` hijas con FK a la `pieza_original_id` y atributo `orden_particion`.
- Sumar automáticamente el coste de los herrajes de unión (conectores tipo "rafix" o espigas + cola).

**Schema nuevo (cuando se implemente)**
- Nueva tabla `piezas_particiones` o columna `pieza_padre_id` en `piezas_modulo` (self-reference).
- Nueva categoría en `herrajes`: `tipo='conector'` (para poder elegir qué unión usar).
- Campo `cfg_empresa.conector_default_id` para auto-asignar.

**Decisiones de negocio pendientes a preguntar a Mario**:
- ¿Qué piezas sí se pueden partir? (mi hipótesis: solo laterales y traseras, nunca frontales/baldas visibles).
- ¿Qué herraje/método de unión prefieres? (conector mecánico vs espiga + cola).
- ¿El usuario decide el punto de corte o el sistema lo propone automático?
- ¿Se avisa al cliente en el presupuesto que el lateral va partido?

### 🤖 Capa 11 (o mini 6.5) — Asistente IA de optimización de dimensiones
**Estado**: propuesta guardada.

**Problema que resuelve**
Tras ejecutar nesting, sugerir ajustes de medidas del armario/módulos para **minimizar merma** (ahorro de tableros). Ej: "si haces el módulo 20mm más estrecho, pasas de 3 tableros a 2".

**Propuesta técnica** (dos enfoques combinables):

**A) Determinista (recomendado como primer paso)**:
- Función que prueba variantes (±10mm, ±20mm, ±30mm, ±50mm) en ancho/alto/fondo y re-ejecuta nesting.
- Compara % de merma y nº tableros.
- Devuelve las 3 mejores sugerencias con % de ahorro.
- Sin LLM, totalmente controlado.

**B) LLM-assisted** (capa encima):
- Envía al LLM el resumen (dimensiones actuales, merma, nº tableros) + catálogo de referencias disponibles.
- Le pide "sugerencias humanamente legibles" del tipo: "Considerando que tu armario es 2500×600 y usas tablero 2440×1220, si bajas el alto 30mm podrías usar tablero estándar 2440 en vez de altura cocina y ahorrar X€".
- Stack: `anthropic` SDK (Claude), prompt caching para catálogo.

**UI propuesta**: botón "Sugerencias IA" al lado del botón "Ejecutar nesting". Lista de propuestas con botón "Aplicar" que modifica las dimensiones y re-lanza nesting automáticamente.

**Decisiones pendientes**:
- ¿Qué variantes probar? (rango de ±mm y step).
- ¿LLM sí/no? (costa dinero por query; el determinista es gratis).
- Si LLM: ¿proveedor (Anthropic Claude / OpenAI / local)?

---

## Ideas "siguiente paso" fuera del alcance actual

### UI de ajuste de perfil
- Permitir que el usuario cambie su password desde `/app/perfil`.
- Editar nombre visible.
- Ver empresa actual.

### Selector de empresa para auditoría / soporte (futuro SaaS)
- Cuando Mario abra GPTO como SaaS a otras carpinterías, tener modo "super-admin" que pueda entrar como otra empresa.
- Requiere rol `super_admin` y función `set_empresa_override()`.

### Paginación real de /app/clientes
- Hoy listo todos los clientes (sin LIMIT). A partir de ~500 hará falta paginación.

### Capa 6.2 — Drag&drop manual del nesting
- Client component sobre los tableros 6.1.
- Mover piezas entre tableros / reposicionar / rotar con botones.
- Persistir `piezas_en_tablero.{x_mm, y_mm, rotada}` al soltar.

### Mini 5.1 — PDF etiquetas QR
- `/api/piezas/[armarioId]/etiquetas.pdf` con `qrcode` + `@react-pdf/renderer`.
- Hoja A4 con los QRs de cada pieza para imprimir y pegar.

---

## Dudas abiertas
- Email de commits de Mario configurado como `mario.ortigueira@me.com`. Email en contexto de Claude Code es `@gmail.com`. Preguntar a Mario si quiere unificar.

---

## Convenciones decididas pero no aún aplicadas
- Numeración SQL: `001_nombre.sql` en `/supabase/migrations/` (aplicado hasta 018).
- Toasts verde/rojo 3s en toda acción UI (aplicado desde Capa 1).
- `__ninguna__` en Supabase Select con value vacío (aplicado en Capa 2 cantos/herrajes/etc).
