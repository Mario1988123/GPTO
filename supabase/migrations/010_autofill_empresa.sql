-- 010_autofill_empresa.sql
-- FIX: al insertar filas sin empresa_id explícito (caso normal desde server actions con
-- cliente authenticated), autocompletar con la empresa del usuario autenticado. Sin esto,
-- RLS rechaza todos los INSERT porque empresa_id queda NULL.
--
-- Trigger BEFORE INSERT: solo actúa si NEW.empresa_id IS NULL → no interfiere con llamadas
-- que sí pasan empresa_id (service_role, migraciones, seeds).

CREATE OR REPLACE FUNCTION public.autofill_empresa_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.empresa_id IS NULL THEN
    NEW.empresa_id := public.current_empresa_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER usuarios_autofill_empresa
  BEFORE INSERT ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.autofill_empresa_id();

CREATE TRIGGER clientes_autofill_empresa
  BEFORE INSERT ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.autofill_empresa_id();

CREATE TRIGGER proveedores_autofill_empresa
  BEFORE INSERT ON public.proveedores
  FOR EACH ROW EXECUTE FUNCTION public.autofill_empresa_id();

CREATE TRIGGER materiales_autofill_empresa
  BEFORE INSERT ON public.materiales
  FOR EACH ROW EXECUTE FUNCTION public.autofill_empresa_id();

CREATE TRIGGER acabados_autofill_empresa
  BEFORE INSERT ON public.acabados
  FOR EACH ROW EXECUTE FUNCTION public.autofill_empresa_id();

CREATE TRIGGER referencias_tablero_autofill_empresa
  BEFORE INSERT ON public.referencias_tablero
  FOR EACH ROW EXECUTE FUNCTION public.autofill_empresa_id();

CREATE TRIGGER cantos_autofill_empresa
  BEFORE INSERT ON public.cantos
  FOR EACH ROW EXECUTE FUNCTION public.autofill_empresa_id();

CREATE TRIGGER herrajes_autofill_empresa
  BEFORE INSERT ON public.herrajes
  FOR EACH ROW EXECUTE FUNCTION public.autofill_empresa_id();
