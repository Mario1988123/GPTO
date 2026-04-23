# NOTAS — GPTO

Anotaciones sueltas: ideas fuera del alcance de la capa actual, decisiones pendientes, dudas abiertas.

Cuando una idea "para más adelante" aparezca en una iteración, se anota aquí y se sigue con lo actual.

---

## Pendientes de decisión

### Capa 6 (Nesting)
Elegir librería 2D. Candidatos: `SVGnest`, `deepnest.io`, solución a medida.

### Password MVP de Mario
Password inicial de login del admin en Sub 0.4: `Mario.:123`. Muy débil, solo para MVP interno. **Cambiar en cuanto haya más usuarios.**

---

## Propuestas aparcadas (esperando aprobación de Mario)

### 🧾 CAMBIO DE BD — Capa 1 (Clientes)

**Estado**: propuesto, NO aplicado. Requiere tu OK antes de ejecutar.

**Qué cambia**
Primera tabla de negocio: `clientes` (clientes finales de la empresa, es decir, las personas/comercios que encargan armarios a Carpintería MAZOR).

**Por qué**
Capa 1 de la hoja de ruta. Sin `clientes` no se pueden crear presupuestos ni pedidos. Las siguientes capas dependen de esta.

**Tablas afectadas**
- `public.clientes` (nueva).

**Migración (SQL)**
```sql
-- 006_clientes.sql
CREATE TABLE public.clientes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  nombre      TEXT NOT NULL,
  email       TEXT,
  telefono    TEXT,
  direccion   JSONB,   -- { calle, numero, piso, cp, ciudad, provincia, pais }
  nif         TEXT,    -- DNI/NIF/CIF opcional
  notas       TEXT,
  activo      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX clientes_empresa_id_idx ON public.clientes(empresa_id);
CREATE INDEX clientes_nombre_idx     ON public.clientes(empresa_id, lower(nombre));

CREATE TRIGGER clientes_touch_updated_at
BEFORE UPDATE ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

COMMENT ON TABLE public.clientes IS
  'Clientes finales de cada empresa (los que encargan armarios).';
```

```sql
-- 007_clientes_rls.sql
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clientes_select_misma_empresa"
ON public.clientes FOR SELECT TO authenticated
USING (empresa_id = public.current_empresa_id());

CREATE POLICY "clientes_insert_admin_operario"
ON public.clientes FOR INSERT TO authenticated
WITH CHECK (
  empresa_id = public.current_empresa_id()
  AND public.current_rol() IN ('admin', 'operario')
);

CREATE POLICY "clientes_update_admin_operario"
ON public.clientes FOR UPDATE TO authenticated
USING (
  empresa_id = public.current_empresa_id()
  AND public.current_rol() IN ('admin', 'operario')
)
WITH CHECK (
  empresa_id = public.current_empresa_id()
  AND public.current_rol() IN ('admin', 'operario')
);

CREATE POLICY "clientes_delete_admin"
ON public.clientes FOR DELETE TO authenticated
USING (empresa_id = public.current_empresa_id() AND public.es_admin());
```

**Rollback (SQL)**
```sql
DROP POLICY IF EXISTS "clientes_delete_admin"            ON public.clientes;
DROP POLICY IF EXISTS "clientes_update_admin_operario"   ON public.clientes;
DROP POLICY IF EXISTS "clientes_insert_admin_operario"   ON public.clientes;
DROP POLICY IF EXISTS "clientes_select_misma_empresa"    ON public.clientes;
DROP TRIGGER IF EXISTS clientes_touch_updated_at ON public.clientes;
DROP TABLE IF EXISTS public.clientes;
```

**Riesgo**
Bajo. Tabla nueva, sin dependencias aguas abajo todavía. Rollback limpio.

**Cosas a decidir contigo**
- ¿`direccion` como JSONB (flexible) o como columnas planas (`calle`, `cp`, `ciudad`, `provincia`)? Voto JSONB: evita migración si un cliente tiene formato raro (piso sin número, etc.).
- ¿`nif` debe ser UNIQUE dentro de la empresa? Voto sí (con `UNIQUE (empresa_id, nif) WHERE nif IS NOT NULL`).
- ¿Soft delete (`activo=false`) o hard delete? Ahora mismo: hay `activo`, pero DELETE sigue permitido para admins. Para clientes con presupuestos asociados será obligatorio soft delete (ON DELETE RESTRICT en Capa 7).

**Siguiente iteración tras aprobación (Capa 1 UI)**
- Ruta `/app/clientes` — listado con búsqueda.
- Ruta `/app/clientes/nuevo` — form.
- Ruta `/app/clientes/[id]` — detalle + editar.
- Toasts verde/rojo 3s en save/delete.
- Paginación servidor (10/25/50).

---

## Ideas "siguiente paso" fuera del alcance actual
_(vacío por ahora)_

## Dudas abiertas
- Email de commits de Mario configurado como `mario.ortigueira@me.com`. Email en contexto de Claude Code es `@gmail.com`. Preguntar a Mario si quiere unificar.

---

## Convenciones decididas pero no aún aplicadas
- Numeración SQL: `001_nombre.sql` en `/supabase/migrations/`.
- Toasts verde/rojo 3s en toda acción UI.
- `__ninguna__` en Supabase Select con value vacío.
