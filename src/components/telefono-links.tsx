"use client";

import { Phone, MessageCircle } from "lucide-react";

/**
 * Muestra un teléfono con dos accesos directos:
 * - Llamar (tel:)
 * - WhatsApp (wa.me/) — limpia espacios y guiones, asume +34 si solo viene un número de 9 dígitos.
 *
 * Es un client component porque usa onClick para detener la propagación dentro de filas clicables.
 */
export function TelefonoLinks({
  telefono,
  size = "sm",
  showText = true,
}: {
  telefono: string | null | undefined;
  size?: "sm" | "xs";
  showText?: boolean;
}) {
  if (!telefono) return <span className="text-muted-foreground">—</span>;

  const limpio = telefono.replace(/[\s\-().]/g, "");
  const internacional = limpio.startsWith("+")
    ? limpio
    : limpio.length === 9
    ? `+34${limpio}` // España por defecto si vienen 9 dígitos
    : limpio;
  const waNumber = internacional.replace(/^\+/, "");
  const valido = /^\+?\d{6,}$/.test(internacional);

  const iconClass = size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5";
  const btnClass =
    size === "xs"
      ? "flex h-6 w-6 items-center justify-center rounded transition"
      : "flex h-7 w-7 items-center justify-center rounded transition";

  return (
    <span className="inline-flex items-center gap-1.5">
      {showText && <Phone className={`${iconClass} text-muted-foreground`} />}
      {showText && <span className="font-mono">{telefono}</span>}
      {valido && (
        <span className="inline-flex items-center gap-0.5">
          <a
            href={`tel:${internacional}`}
            title={`Llamar a ${telefono}`}
            className={`${btnClass} text-blue-600 hover:bg-blue-500/10 hover:text-blue-700`}
            onClick={(e) => e.stopPropagation()}
          >
            <Phone className={iconClass} />
          </a>
          <a
            href={`https://wa.me/${waNumber}`}
            target="_blank"
            rel="noreferrer"
            title={`WhatsApp a ${telefono}`}
            className={`${btnClass} text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700`}
            onClick={(e) => e.stopPropagation()}
          >
            <MessageCircle className={iconClass} />
          </a>
        </span>
      )}
    </span>
  );
}
