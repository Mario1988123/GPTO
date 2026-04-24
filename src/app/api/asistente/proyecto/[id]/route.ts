import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error: "Falta ANTHROPIC_API_KEY en las variables de entorno. Añádela en Vercel → Settings → Environment Variables.",
      },
      { status: 400 },
    );
  }

  const s = await createClient();

  // Contexto del proyecto
  const [{ data: proyecto }, { data: armarios }, { data: piezas }, { data: tableros }, { data: recortes }, { data: empresa }] = await Promise.all([
    s.from("proyectos").select("nombre, estado, fecha_entrega_comprometida, clientes(nombre), estancias(nombre, tipo, largo_mm, ancho_mm, alto_mm)").eq("id", id).maybeSingle(),
    s.from("armarios").select("nombre, ancho_total_mm, alto_total_mm, fondo_mm, tipo_instalacion, modulos_armario(ancho_mm, alto_mm, fondo_mm, particiones_verticales, tipos_modulo(nombre, categoria))").eq("proyecto_id", id),
    s.from("piezas_modulo").select("nombre, cantidad, largo_mm, ancho_mm, grosor_mm, respeta_veta, modulos_armario!inner(armarios!inner(proyecto_id))").eq("modulos_armario.armarios.proyecto_id", id),
    s.from("tableros_corte").select("numero, ancho_mm, alto_mm, area_ocupada_mm2, referencias_tablero(precio_m2, grosor_mm)").eq("proyecto_id", id),
    s.from("recortes").select("largo_mm, ancho_mm, estado, origen_tablero_id").in("origen_tablero_id", ((await s.from("tableros_corte").select("id").eq("proyecto_id", id)).data ?? []).map((t) => t.id as string) as string[]),
    s.from("empresas").select("config_empresa").limit(1).maybeSingle<{ config_empresa: Record<string, number> }>(),
  ]);

  if (!proyecto) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  const cfg = empresa?.config_empresa ?? {};
  const tablUtilAncho = Number(cfg.tablero_util_ancho_cm ?? 240) * 10;
  const tablUtilAlto = Number(cfg.tablero_util_alto_cm ?? 120) * 10;
  const kerf = Number(cfg.kerf_mm ?? 3);

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const proyRel = proyecto as unknown as {
    nombre: string;
    estado: string;
    fecha_entrega_comprometida: string | null;
    clientes: { nombre: string } | null;
    estancias: unknown[];
  };
  const contexto = {
    proyecto: {
      nombre: proyRel.nombre,
      estado: proyRel.estado,
      fecha_entrega: proyRel.fecha_entrega_comprometida,
      cliente: proyRel.clientes?.nombre,
      estancias: proyRel.estancias,
    },
    armarios: armarios ?? [],
    piezas_resumen: {
      total: (piezas ?? []).length,
      total_unidades: (piezas ?? []).reduce((a, p: { cantidad: number }) => a + (p.cantidad ?? 0), 0),
      muestra: (piezas ?? []).slice(0, 50),
    },
    tableros: tableros ?? [],
    recortes: recortes ?? [],
    config_taller: {
      tablero_util_mm: `${tablUtilAncho} × ${tablUtilAlto}`,
      kerf_mm: kerf,
    },
  };

  const systemPrompt = `Eres el asistente experto de GPTO, un ERP para carpinterías especializadas en armarios a medida. Tu rol: analizar el estado actual de un proyecto y dar consejos CONCRETOS, CUANTIFICADOS y ACCIONABLES sobre optimización de tableros, reducción de merma, reaprovechamiento de recortes para generar baldas extra, y ajustes dimensionales.

Reglas:
- SIEMPRE en español.
- NUNCA inventes datos numéricos: solo usa los del contexto.
- Sé directo. No divagues.
- Cuando sugieras reducir dimensiones "por pocos centímetros", calcula y muestra: cuántos mm exactos, cuántos tableros se ahorrarían, y aproximadamente cuánto dinero.
- Cuando haya recortes conservados grandes, sugiere usos concretos (p. ej. "3 baldas de 600×280 mm").
- Devuelve la respuesta en formato MARKDOWN estructurado con 3 secciones fijas:
  ## 🎯 Optimización de tableros
  ## 🪚 Ajustes dimensionales sugeridos
  ## ♻️ Reaprovechamiento de recortes
- Cada sección: máximo 4 bullet points con el formato "**acción →** resultado medible".
- Si no hay nada que mejorar en una sección, escribe una sola frase positiva.`;

  const userPrompt = `Analiza este proyecto GPTO y dame consejos:

\`\`\`json
${JSON.stringify(contexto, null, 2)}
\`\`\`
`;

  try {
    const resp = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const texto = resp.content
      .filter((c) => c.type === "text")
      .map((c) => (c as { type: "text"; text: string }).text)
      .join("\n");

    return NextResponse.json({ texto, modelo: resp.model, usage: resp.usage });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: `Claude API: ${msg}` }, { status: 500 });
  }
}
