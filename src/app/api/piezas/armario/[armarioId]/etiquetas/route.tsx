import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { EtiquetasPDF } from "@/lib/pdf/etiquetas";
import type { PiezaModulo } from "@/lib/tipos/piezas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ armarioId: string }> },
) {
  const { armarioId } = await params;
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  // Armario + proyecto + empresa
  const { data: arm } = await s
    .from("armarios")
    .select("id, nombre, proyectos(nombre, empresas(nombre))")
    .eq("id", armarioId)
    .maybeSingle<{
      id: string; nombre: string;
      proyectos: { nombre: string; empresas: { nombre: string } | null } | null;
    }>();
  if (!arm) return new NextResponse("Not found", { status: 404 });

  // Piezas del armario
  const { data: piezas } = await s
    .from("piezas_modulo")
    .select("*, modulos_armario!inner(nombre_override, tipos_modulo(nombre), armario_id)")
    .eq("modulos_armario.armario_id", armarioId)
    .order("orden")
    .returns<(PiezaModulo & { modulos_armario: { nombre_override: string | null; tipos_modulo: { nombre: string } | null } })[]>();

  if (!piezas || piezas.length === 0) {
    return new NextResponse("No hay piezas. Explosiona primero desde el armario.", { status: 400 });
  }

  // Obtener URL base para los QR (desde el request para evitar hardcode)
  const baseUrl = new URL(req.url).origin;

  // Generar dataURL de cada QR
  const piezasConQR = await Promise.all(
    piezas.map(async (p) => {
      const url = `${baseUrl}/t/${p.qr_code}`;
      const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 200, errorCorrectionLevel: "M" });
      return {
        ...p,
        qrDataUrl,
        modulo_nombre: p.modulos_armario?.nombre_override ?? p.modulos_armario?.tipos_modulo?.nombre ?? "Módulo",
        armario_nombre: arm.nombre,
      };
    }),
  );

  const buffer = await renderToBuffer(
    <EtiquetasPDF
      piezas={piezasConQR}
      armario_nombre={arm.nombre}
      proyecto_nombre={arm.proyectos?.nombre ?? "—"}
      empresa_nombre={arm.proyectos?.empresas?.nombre ?? "—"}
    />,
  );

  const nombreArchivo = `etiquetas-${arm.nombre.replace(/\s+/g, "-")}.pdf`;
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nombreArchivo}"`,
      "Cache-Control": "no-store",
    },
  });
}
