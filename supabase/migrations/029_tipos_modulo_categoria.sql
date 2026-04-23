-- 029_tipos_modulo_categoria.sql
-- Capa 4.5: categoria y flag estandar para tipos_modulo.

ALTER TABLE public.tipos_modulo
  ADD COLUMN categoria TEXT NOT NULL DEFAULT 'otro'
    CHECK (categoria IN ('cajonera','colgador_corto','colgador_largo','zapatero','estanteria','baldas','espejo','complemento','puerta','otro')),
  ADD COLUMN es_estandar BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX tipos_modulo_categoria_idx ON public.tipos_modulo(empresa_id, categoria);

COMMENT ON COLUMN public.tipos_modulo.categoria IS
  'Categoria funcional del modulo. Usada en el editor para que el cliente diga "quiero cajonera + colgador + zapatero".';
COMMENT ON COLUMN public.tipos_modulo.es_estandar IS
  'true = modulo que el proveedor fabrica a medida estandar; false = personalizado o plantilla generica.';
