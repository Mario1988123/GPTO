# NOTAS — GPTO

Anotaciones sueltas: ideas fuera del alcance de la capa actual, decisiones pendientes, dudas abiertas.

---

## Capa 22 — Pendiente tras lista de 35 cambios de Mario (2026-04-25)

Trabajo en curso. Bloques A y D (crítico) hechos o parcialmente hechos. Lo que queda:

### Bloque C — Estancias (parcial)
- **Módulos precargados por tipo de estancia**. Cuando creas una estancia cocina, proponer módulos altos/bajos/cacerolero/esquinero con medidas estándar (40/50/60/80). Requiere un **seed masivo** de tipos_modulo por categoría (cocina, vestidor, dormitorio, salón). Proponer listado con Mario antes de implementar — son cientos de combinaciones. [2.11]
- **Hueco primero, luego módulos**. Ahora mismo el flujo es: creas armario (= hueco) y dentro metes módulos. Mario quiere explicitar: primero defines el hueco/armario con empotrado sí/no + margen de tapeta, luego añades módulos. Parte ya funciona (hay `tipo_instalacion=empotrado` + `margen_tapeta_mm`), falta UX que lo haga evidente. [2.12]
- **Acabados con upload de foto** desde configuración de empresa. Requiere Supabase Storage bucket `acabados`. [2.12 parte]
- **Quitar LED del modal principal, solo en armario**. Revisar formulario de creación de subelemento. [2.19]

### Bloque D — Editor armario (parcial)
- **Plano de montaje con puntos de taladro** en cada pieza (balda atornillada, tope de balda regulable, barra, apoyo doble costado). Requiere tabla nueva `pieza_puntos_taladro` con (pieza_id, x_mm, y_mm, diametro_mm, profundidad_mm, tipo) y cálculo automático por tipo de pieza + tipo de subelemento. [2.17]
- **Cambiar medidas de módulo predefinido + apilar módulo encima de otro**. La base existe (posicion_x/posicion_y), falta UI para editar medidas desde el editor y visualmente apilarlos. [2.18]
- **AR con perspectiva manual**. Reemplazar el hiperrealismo IA (ya retirado) por un editor donde el usuario dibuja ejes X/Y/Z sobre la foto, se detectan 1 o 2 puntos de fuga y el 3D se deforma a esa perspectiva. Grande. [2.15]
- **Subir foto de cámara/galería** (capture=environment + input file). Parte fácil. [2.15]
- **Toggle ver puertas por armario** existe (`mostrar_puertas` en módulo). Falta exponerlo en el editor del armario, no solo en el modal del módulo. [2.21]
- **Selector de tirador por módulo** (dropdown del catálogo herrajes tipo='tirador'). [2.22]
- **Observaciones/notas por módulo** (columna `notas` ya existe). Añadir textarea visible en la ficha del módulo. [2.26]
- **CRUD piezas con canto canteado + veta**. Ya se guarda `lados_con_canto` y `respeta_veta` en piezas. Mostrarlo con inputs directos en una pestaña "Piezas" del módulo con diagrama. [2.26]

### Bloque E — Explosión / Nesting (grande, queda todo)
- **Pieza Lateral resta trasera en el fondo** (600 → 590 si trasera 10mm). Requiere añadir `ajuste_largo_trasera_grosores` / `ajuste_ancho_trasera_grosores` a `tipo_modulo_piezas` y actualizar `regenerar_piezas_modulo`. CAMBIO DE BD mediano. [2.27]
- **Baldas restan 2 grosores de costado** al ancho: ya lo hace el seed (`ajuste_largo_grosores: -2`), pero hay que verificar que el grosor aplicado es el de los costados del módulo (tableros_grosor_mm), no el de la referencia_tablero genérica. [2.27]
- **Cajones descuentan separación y canto del frente**. El backend ya descuenta separaciones (hecho), falta canto. [2.23, 2.27]
- **Nesting lento**: investigar por qué tarda. Probablemente MaxRects con muchas piezas es O(n² × tableros). Intentar guillotina o paralelizar. [2.31]
- **Nesting solapa piezas**: bug crítico del algoritmo. Reproducir y corregir. [2.27]
- **Nesting agrupa todo el proyecto por material**: verificar que ya lo hace; si no, agrupar. [2.30]
- **Definir tableros disponibles por referencia** (244×122 y 380×144 comunes): añadir tabla `referencia_tablero_formatos` con (referencia_id, ancho_mm, alto_mm). [2.28]
- **IA optimizar tableros**: probar reducir ±50mm en piezas no críticas para reducir nº de tableros. Grande. [2.28]
- **Integrar recortes** del almacén: ya hay tabla `recortes`; cuando el nesting busca soporte, probar primero los recortes. [2.28]

### Bloque F — Presupuesto / pedido / producción (grande, queda todo)
- **Aceptar presupuesto** como paso del workflow (nueva acción, cambia estado proyecto→presupuestado→confirmado). [2.35]
- **Pedido de tableros** con fecha entrega a empresa de corte. Tabla nueva `pedidos_tableros`. [2.32]
- **Gantt de montadores** a partir del pedido. Ya existe módulo de producción/agenda, refinar. [2.32]
- **Portal cliente muestra proceso** (presupuesto→confirmado→en fabricación→montaje→entregado). Ya existe `/c/[token]`, ampliar para mostrar timeline. [2.32]
- **Recepción pedido con incidencias** por pieza (mal cortada / tocada). Tabla nueva `incidencias_piezas`. [2.33]
- **Montaje finaliza estancias** una a una; al cerrar la última → cerrar proyecto. [2.34]

### Lista de decisiones para Mario

1. Seed de módulos cocina: ¿qué medidas estándar? (40/45/50/60/80/90cm en bajos, altos a la misma medida, 70cm en esquineros?). Confirmar lista.
2. Tableros estándar: ¿sólo 244×122 y 380×144 o añadir 305×122, 280×207, 420×207?
3. Formato pedido tableros: ¿PDF para enviar al proveedor o sólo pantalla interna?
4. Incidencias pieza: ¿marcar con foto obligatoria o sólo texto?

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
