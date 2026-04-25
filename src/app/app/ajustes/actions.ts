"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function actualizarAjustesEmpresa(empresaId: string, fd: FormData) {
  const s = await createClient();

  const nombre = String(fd.get("nombre") ?? "").trim();
  if (!nombre) throw new Error("El nombre de la empresa es obligatorio.");

  // Datos empresa visibles (para PDF, portal cliente, etc.)
  const config_empresa: Record<string, unknown> = {};

  const maybeStr = (k: string) => {
    const v = String(fd.get(k) ?? "").trim();
    if (v) config_empresa[k] = v;
  };
  const maybeNum = (k: string, dflt?: number) => {
    const raw = String(fd.get(k) ?? "").trim();
    if (!raw) {
      if (dflt !== undefined) config_empresa[k] = dflt;
      return;
    }
    const n = Number(raw);
    if (Number.isFinite(n)) config_empresa[k] = n;
  };

  // Strings (branding / contacto)
  maybeStr("logo_url");
  maybeStr("empresa_nif");
  maybeStr("empresa_direccion");
  maybeStr("empresa_telefono");
  maybeStr("empresa_email");

  // Números (configuración técnica)
  maybeNum("precio_hora_mano_obra_eur");
  maybeNum("iva_porcentaje", 21);
  maybeNum("kerf_mm", 3);
  maybeNum("tablero_ancho_cm", 244);
  maybeNum("tablero_alto_cm", 122);
  maybeNum("tablero_util_ancho_cm", 240);
  maybeNum("tablero_util_alto_cm", 120);
  maybeNum("trasera_grosor_mm", 10);
  maybeNum("fondo_armario_cm", 61);

  // Herraje de unión módulos apilados (Capa 7.3)
  maybeStr("herraje_union_default_id"); // UUID del herraje a usar en uniones
  maybeNum("herrajes_por_union", 4);    // cantidad por cada junta

  // Datos fiscales para facturación legal (RD 1619/2012)
  const datos_fiscales: Record<string, string> = {};
  for (const [k, dest] of [
    ["datos_fiscales_razon_social", "razon_social"],
    ["datos_fiscales_nif", "nif"],
    ["datos_fiscales_domicilio", "domicilio_fiscal"],
    ["datos_fiscales_iban", "iban"],
  ] as const) {
    const v = String(fd.get(k) ?? "").trim();
    if (v) datos_fiscales[dest] = v;
  }
  if (Object.keys(datos_fiscales).length > 0) {
    config_empresa.datos_fiscales = datos_fiscales;
  }

  const { error } = await s.from("empresas").update({ nombre, config_empresa }).eq("id", empresaId);
  if (error) redirect(`/app/ajustes?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/app/ajustes");
  revalidatePath("/app");
  redirect("/app/ajustes?ok=actualizado");
}
