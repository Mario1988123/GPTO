import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { PresupuestoPDF } from "@/lib/pdf/presupuesto";
import type { Presupuesto, PresupuestoLinea } from "@/lib/tipos/presupuestos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const s = await createClient();

  const { data: { user } } = await s.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data: pres } = await s
    .from("presupuestos")
    .select("*, proyectos(id, nombre, clientes(nombre, nif, email, telefono, direccion)), empresas(nombre, config_empresa)")
    .eq("id", id)
    .maybeSingle<
      Presupuesto & {
        proyectos:
          | {
              id: string;
              nombre: string;
              clientes: {
                nombre: string;
                nif: string | null;
                email: string | null;
                telefono: string | null;
                direccion: Record<string, string | undefined> | null;
              } | null;
            }
          | null;
        empresas: { nombre: string; config_empresa: Record<string, unknown> } | null;
      }
    >();
  if (!pres) return new NextResponse("Not found", { status: 404 });

  const { data: lineas } = await s
    .from("presupuestos_lineas")
    .select("*")
    .eq("presupuesto_id", id)
    .order("orden")
    .returns<PresupuestoLinea[]>();

  const empresa = pres.empresas ?? { nombre: "—", config_empresa: {} };
  const buffer = await renderToBuffer(
    <PresupuestoPDF
      presupuesto={pres}
      lineas={lineas ?? []}
      empresa={empresa}
      cliente={pres.proyectos?.clientes ?? null}
      proyecto={pres.proyectos ? { nombre: pres.proyectos.nombre } : null}
    />,
  );

  const nombreArchivo = `${pres.numero ?? "presupuesto-borrador"}.pdf`;
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nombreArchivo}"`,
      "Cache-Control": "no-store",
    },
  });
}
