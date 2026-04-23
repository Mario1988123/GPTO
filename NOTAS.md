# NOTAS — GPTO

Anotaciones sueltas: ideas fuera del alcance de la capa actual, decisiones pendientes, dudas abiertas.

Cuando una idea "para más adelante" aparezca en una iteración, se anota aquí y se sigue con lo actual.

---

## Pendientes de decisión

### Capa 6 (Nesting)
Elegir librería 2D. Candidatos: `SVGnest`, `deepnest.io`, solución a medida.

### Password MVP de Mario
Password inicial de login del admin (Sub 0.4): `Mario.:123`. Muy débil, solo para MVP interno. **Cambiar en cuanto haya más usuarios o datos reales.** El cambio puede hacerlo Mario desde `/app` (pendiente de UI de ajuste de perfil) o directamente en el dashboard de Supabase Auth.

---

## Propuestas aparcadas (esperando aprobación de Mario)

_(ninguna en este momento)_

---

## Ideas "siguiente paso" fuera del alcance actual

### UI de ajuste de perfil (tras Capa 1)
- Permitir que el usuario cambie su password desde `/app/perfil`.
- Editar nombre visible.
- Ver empresa actual.

### Selector de empresa para auditoría / soporte (futuro SaaS)
- Cuando Mario abra GPTO como SaaS a otras carpinterías, tener un modo "super-admin" que pueda ver/entrar como otra empresa.
- Requiere añadir rol `super_admin` y función `set_empresa_override()`.

### Paginación real de /app/clientes
- Hoy listo todos los clientes (sin LIMIT). Servirá mientras haya pocos. A partir de ~500 clientes hará falta paginación (cursor o offset + limit).

---

## Dudas abiertas
- Email de commits de Mario configurado como `mario.ortigueira@me.com`. Email en contexto de Claude Code es `@gmail.com`. Preguntar a Mario si quiere unificar.

---

## Convenciones decididas pero no aún aplicadas
- Numeración SQL: `001_nombre.sql` en `/supabase/migrations/`.
- Toasts verde/rojo 3s en toda acción UI (ya aplicado en Capa 1 con sonner).
- `__ninguna__` en Supabase Select con value vacío (pendiente primer uso en Capa 2 catálogo).
