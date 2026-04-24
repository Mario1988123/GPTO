"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Punto = { x: number; y: number };

function parseIntPos(v: string, def = 0): number {
  const n = Number.parseInt(v.trim(), 10);
  return Number.isFinite(n) && n >= 0 ? n : def;
}

export async function guardarGeometriaRectangular(
  proyectoId: string,
  estanciaId: string,
  fd: FormData,
) {
  const s = await createClient();
  const largo = parseIntPos(String(fd.get("largo_mm") ?? ""), 4000);
  const ancho = parseIntPos(String(fd.get("ancho_mm") ?? ""), 3000);
  const alto = parseIntPos(String(fd.get("alto_pared_mm") ?? ""), 2500);
  if (largo <= 0 || ancho <= 0 || alto < 1000) {
    redirect(`/app/proyectos/${proyectoId}/estancias/${estanciaId}?error=${encodeURIComponent("Medidas inválidas")}`);
  }

  const puntos: Punto[] = [
    { x: 0, y: 0 },
    { x: largo, y: 0 },
    { x: largo, y: ancho },
    { x: 0, y: ancho },
  ];

  const { error } = await s.from("estancia_geometria").upsert(
    {
      estancia_id: estanciaId,
      tipo: "rectangular",
      puntos,
      alto_pared_mm: alto,
    },
    { onConflict: "estancia_id" },
  );

  if (error) {
    redirect(`/app/proyectos/${proyectoId}/estancias/${estanciaId}?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath(`/app/proyectos/${proyectoId}/estancias/${estanciaId}`);
  redirect(`/app/proyectos/${proyectoId}/estancias/${estanciaId}?ok=actualizado`);
}

export async function guardarGeometriaPoligono(
  proyectoId: string,
  estanciaId: string,
  puntos: Punto[],
  alto_pared_mm: number,
  tipo: "rectangular" | "poligono" = "poligono",
) {
  const s = await createClient();
  if (!Array.isArray(puntos) || puntos.length < 3) throw new Error("Polígono necesita al menos 3 puntos");
  if (alto_pared_mm < 1000 || alto_pared_mm > 6000) throw new Error("Altura pared fuera de rango");

  const { error } = await s.from("estancia_geometria").upsert(
    {
      estancia_id: estanciaId,
      tipo,
      puntos,
      alto_pared_mm,
    },
    { onConflict: "estancia_id" },
  );
  if (error) throw new Error(error.message);

  // Sincronizar campos legacy de la estancia (bounding box) para compat con /plano-2d y portal cliente
  const xs = puntos.map((p) => p.x);
  const ys = puntos.map((p) => p.y);
  const largo = Math.max(...xs) - Math.min(...xs);
  const ancho = Math.max(...ys) - Math.min(...ys);
  await s
    .from("estancias")
    .update({
      largo_mm: largo > 0 ? largo : null,
      ancho_mm: ancho > 0 ? ancho : null,
      alto_mm: alto_pared_mm,
    })
    .eq("id", estanciaId);

  revalidatePath(`/app/proyectos/${proyectoId}/estancias/${estanciaId}`);
}

export async function crearAbertura(
  proyectoId: string,
  estanciaId: string,
  fd: FormData,
) {
  const s = await createClient();
  const tipo = String(fd.get("tipo") ?? "puerta");
  if (!["puerta", "ventana"].includes(tipo)) throw new Error("Tipo inválido");

  const pared_idx = Number.parseInt(String(fd.get("pared_idx") ?? "0"), 10);
  const x = Number.parseInt(String(fd.get("x_en_pared_mm") ?? "0"), 10);
  const ancho = Number.parseInt(String(fd.get("ancho_mm") ?? "800"), 10);
  const alto = Number.parseInt(String(fd.get("alto_mm") ?? "2030"), 10);
  const antepecho = Number.parseInt(String(fd.get("antepecho_mm") ?? "0"), 10);

  if ([pared_idx, x, ancho, alto].some((n) => !Number.isFinite(n) || n < 0)) {
    redirect(`/app/proyectos/${proyectoId}/estancias/${estanciaId}?error=${encodeURIComponent("Datos abertura inválidos")}`);
  }

  const { data: max } = await s.from("aberturas")
    .select("orden").eq("estancia_id", estanciaId)
    .order("orden", { ascending: false }).limit(1).maybeSingle();
  const orden = ((max?.orden ?? -1) as number) + 1;

  const { error } = await s.from("aberturas").insert({
    estancia_id: estanciaId,
    tipo,
    pared_idx,
    x_en_pared_mm: x,
    ancho_mm: ancho,
    alto_mm: alto,
    antepecho_mm: tipo === "ventana" ? antepecho : 0,
    etiqueta: String(fd.get("etiqueta") ?? "").trim() || null,
    orden,
  });

  if (error) {
    redirect(`/app/proyectos/${proyectoId}/estancias/${estanciaId}?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath(`/app/proyectos/${proyectoId}/estancias/${estanciaId}`);
  redirect(`/app/proyectos/${proyectoId}/estancias/${estanciaId}?ok=creado`);
}

export async function actualizarAbertura(
  proyectoId: string,
  estanciaId: string,
  aberturaId: string,
  fd: FormData,
) {
  const s = await createClient();
  const update: Record<string, unknown> = {};
  const setInt = (k: string, min = 0) => {
    const v = fd.get(k);
    if (v === null) return;
    const n = Number.parseInt(String(v), 10);
    if (Number.isFinite(n) && n >= min) update[k] = n;
  };
  const tipo = String(fd.get("tipo") ?? "").trim();
  if (tipo === "puerta" || tipo === "ventana") update.tipo = tipo;
  setInt("pared_idx");
  setInt("x_en_pared_mm");
  setInt("ancho_mm", 100);
  setInt("alto_mm", 100);
  setInt("antepecho_mm");
  const etiqueta = String(fd.get("etiqueta") ?? "").trim();
  if (etiqueta !== "") update.etiqueta = etiqueta;

  const { error } = await s.from("aberturas").update(update).eq("id", aberturaId);
  if (error) {
    redirect(`/app/proyectos/${proyectoId}/estancias/${estanciaId}?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath(`/app/proyectos/${proyectoId}/estancias/${estanciaId}`);
  redirect(`/app/proyectos/${proyectoId}/estancias/${estanciaId}?ok=actualizado`);
}

export async function eliminarAbertura(
  proyectoId: string,
  estanciaId: string,
  aberturaId: string,
) {
  const s = await createClient();
  const { error } = await s.from("aberturas").delete().eq("id", aberturaId);
  if (error) {
    redirect(`/app/proyectos/${proyectoId}/estancias/${estanciaId}?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath(`/app/proyectos/${proyectoId}/estancias/${estanciaId}`);
  redirect(`/app/proyectos/${proyectoId}/estancias/${estanciaId}?ok=eliminado`);
}
