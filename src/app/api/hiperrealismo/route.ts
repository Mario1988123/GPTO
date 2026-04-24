import { NextResponse } from "next/server";
import { InferenceClient } from "@huggingface/inference";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODELOS_IMG2IMG = [
  // Buena relación calidad/velocidad con imagen como guía. Probamos uno detrás de otro.
  "stabilityai/stable-diffusion-xl-refiner-1.0",
  "Lykon/dreamshaper-8",
  "runwayml/stable-diffusion-v1-5",
];

export async function POST(req: Request) {
  if (!process.env.HUGGINGFACE_API_KEY) {
    return NextResponse.json(
      {
        error:
          "Falta HUGGINGFACE_API_KEY en las variables de entorno. Añádela en Vercel → Settings → Environment Variables y redespliega.",
      },
      { status: 400 },
    );
  }

  let body: { imagenBase64?: string; prompt?: string; strength?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { imagenBase64, prompt, strength = 0.45 } = body;
  if (!imagenBase64) {
    return NextResponse.json({ error: "Falta imagenBase64" }, { status: 400 });
  }

  // Convertir base64 a Blob
  const base64 = imagenBase64.replace(/^data:image\/\w+;base64,/, "");
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const imagenBlob = new Blob([bytes], { type: "image/png" });

  const promptFinal =
    prompt?.trim() ||
    "professional interior photography, realistic wooden wardrobe in the room, natural lighting, soft shadows, photorealistic, high detail, 8k";

  const hf = new InferenceClient(process.env.HUGGINGFACE_API_KEY);

  let lastError = "";
  for (const modelo of MODELOS_IMG2IMG) {
    try {
      const result = await hf.imageToImage({
        model: modelo,
        inputs: imagenBlob,
        parameters: {
          prompt: promptFinal,
          strength,
          num_inference_steps: 28,
          guidance_scale: 7,
          negative_prompt:
            "cartoon, 3d render, plastic, toy, low quality, blurry, distorted, ugly furniture",
        },
      });

      // El resultado es un Blob PNG
      const buf = await (result as Blob).arrayBuffer();
      const outBase64 = Buffer.from(buf).toString("base64");
      return NextResponse.json({
        imagenBase64: `data:image/png;base64,${outBase64}`,
        modelo,
      });
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      // Si el modelo está "loading", esperamos un poco y seguimos al siguiente
      if (/loading|503|500/i.test(lastError)) continue;
      // Si es auth, paramos: reintentar con otro modelo no resolverá nada
      if (/401|403|unauthorized|invalid credentials/i.test(lastError)) break;
      continue;
    }
  }

  return NextResponse.json(
    {
      error: `No se pudo generar. Último error: ${lastError}. Los modelos gratuitos de HF pueden tardar 20-30s en "calentarse" la primera vez; vuelve a pulsar.`,
    },
    { status: 502 },
  );
}
