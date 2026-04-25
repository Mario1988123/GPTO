"use client";

import { useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

type Plantilla = { id: string; nombre: string; texto: string };

const PLANTILLAS_BASE: Plantilla[] = [
  {
    id: "saludo",
    nombre: "Saludo inicial",
    texto: "Hola {nombre}, soy {empresa}. Encantado de saludarte. ¿Cuándo te viene bien que hablemos sobre tu proyecto?",
  },
  {
    id: "presupuesto-enviado",
    nombre: "Presupuesto enviado",
    texto: "Hola {nombre}, te acabo de enviar el presupuesto al email. Cualquier duda dime y lo vemos. Gracias.",
  },
  {
    id: "recordatorio-cita",
    nombre: "Recordatorio de cita",
    texto: "Hola {nombre}, te confirmo nuestra cita mañana. Si te surge algún imprevisto avísame y lo movemos. Un saludo.",
  },
  {
    id: "fabricacion-iniciada",
    nombre: "Fabricación iniciada",
    texto: "Hola {nombre}, te informo que ya hemos empezado a fabricar tu armario. Te iré contando los avances. Un saludo.",
  },
  {
    id: "entrega-prevista",
    nombre: "Entrega prevista",
    texto: "Hola {nombre}, la entrega/montaje está prevista para el día {fecha}. ¿Te viene bien?",
  },
  {
    id: "post-entrega",
    nombre: "Post-entrega",
    texto: "Hola {nombre}, ¿qué tal todo con el armario? Si necesitas cualquier ajuste o tienes alguna duda dime y lo vemos. Gracias por confiar en nosotros.",
  },
  {
    id: "seguimiento",
    nombre: "Seguimiento (presupuesto sin respuesta)",
    texto: "Hola {nombre}, ¿pudiste echar un vistazo al presupuesto? Si quieres ajustamos algo o lo hablamos con calma, sin compromiso.",
  },
];

export function WhatsAppPlantillas({
  telefono,
  nombre,
  empresa = "",
  onEnviado,
}: {
  telefono: string;
  nombre: string;
  empresa?: string;
  onEnviado?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [texto, setTexto] = useState("");

  function aplicar(p: Plantilla) {
    const nombrePila = nombre.split(" ")[0] ?? nombre;
    setTexto(
      p.texto
        .replace(/\{nombre\}/g, nombrePila)
        .replace(/\{empresa\}/g, empresa || "el equipo"),
    );
  }

  function enviar() {
    if (!texto.trim()) return;
    const limpio = telefono.replace(/[\s\-().]/g, "");
    const internacional = limpio.startsWith("+") ? limpio : limpio.length === 9 ? `+34${limpio}` : limpio;
    const numero = internacional.replace(/^\+/, "");
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(texto)}`, "_blank", "noreferrer");
    setOpen(false);
    setTexto("");
    onEnviado?.();
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <MessageCircle className="h-3.5 w-3.5" />
        WhatsApp con plantilla
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-background shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <MessageCircle className="h-4 w-4 text-emerald-600" />
            Plantillas WhatsApp
          </h2>
          <button type="button" onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          {PLANTILLAS_BASE.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => aplicar(p)}
              className="rounded-lg border border-border bg-card p-3 text-left text-sm transition hover:border-foreground/20 hover:shadow"
            >
              <p className="font-semibold">{p.nombre}</p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.texto}</p>
            </button>
          ))}
        </div>
        <div className="space-y-2 border-t border-border p-5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Mensaje a enviar</label>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={5}
            placeholder="Elige una plantilla arriba o escribe a mano..."
            className="flex w-full rounded-md border border-input bg-background p-3 text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              type="button"
              size="sm"
              onClick={enviar}
              disabled={!texto.trim()}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Send className="h-3.5 w-3.5" />
              Abrir WhatsApp
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
