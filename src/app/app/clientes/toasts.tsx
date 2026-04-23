"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const MENSAJES_OK: Record<string, string> = {
  creado: "Cliente creado correctamente",
  actualizado: "Cliente actualizado",
  desactivado: "Cliente desactivado",
  reactivado: "Cliente reactivado",
  eliminado: "Cliente eliminado",
};

export function ToastFromSearchParams() {
  const router = useRouter();
  const params = useSearchParams();
  const ok = params.get("ok");
  const error = params.get("error");

  useEffect(() => {
    if (ok) {
      toast.success(MENSAJES_OK[ok] ?? "Operación completada");
    } else if (error) {
      toast.error(error);
    }

    if (ok || error) {
      const newParams = new URLSearchParams(params.toString());
      newParams.delete("ok");
      newParams.delete("error");
      const qs = newParams.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok, error]);

  return null;
}
