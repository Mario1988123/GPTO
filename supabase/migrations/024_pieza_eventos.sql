-- 024_pieza_eventos.sql
-- Capa 10: historial de eventos de una pieza para trazabilidad publica con timeline.

CREATE TABLE public.pieza_eventos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pieza_modulo_id   UUID NOT NULL REFERENCES public.piezas_modulo(id) ON DELETE CASCADE,
  estado_anterior   TEXT,
  estado_nuevo      TEXT NOT NULL,
  comentario        TEXT,
  actor_user_id     UUID,  -- quien hizo el cambio (auth.users.id; se llena por trigger)
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX pieza_eventos_pieza_idx ON public.pieza_eventos(pieza_modulo_id, created_at);
COMMENT ON TABLE public.pieza_eventos IS
  'Historial de cambios de estado de una pieza. Alimenta el timeline en /t/[qr].';

-- Trigger: al cambiar piezas_modulo.estado, registrar evento.
CREATE OR REPLACE FUNCTION public.log_pieza_evento()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.pieza_eventos (pieza_modulo_id, estado_anterior, estado_nuevo, actor_user_id)
    VALUES (NEW.id, NULL, NEW.estado, auth.uid());
  ELSIF TG_OP = 'UPDATE' AND OLD.estado IS DISTINCT FROM NEW.estado THEN
    INSERT INTO public.pieza_eventos (pieza_modulo_id, estado_anterior, estado_nuevo, actor_user_id)
    VALUES (NEW.id, OLD.estado, NEW.estado, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER piezas_modulo_log_evento
AFTER INSERT OR UPDATE OF estado ON public.piezas_modulo
FOR EACH ROW EXECUTE FUNCTION public.log_pieza_evento();
