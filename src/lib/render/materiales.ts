"use client";

import * as THREE from "three";

export type AcabadoKey =
  | "roble_claro"
  | "nogal"
  | "blanco_brillo"
  | "blanco_mate"
  | "haya"
  | "negro_mate"
  | "gris"
  | "cerezo";

export const ACABADOS: Record<AcabadoKey, { label: string; base: string; veta: string; veta_strength: number; roughness: number; metalness: number; clearcoat: number }> = {
  roble_claro: { label: "Roble claro", base: "#d6b88b", veta: "#8c6b3f", veta_strength: 0.6, roughness: 0.65, metalness: 0, clearcoat: 0.15 },
  nogal: { label: "Nogal", base: "#5a3a22", veta: "#2d1a0f", veta_strength: 0.7, roughness: 0.55, metalness: 0, clearcoat: 0.2 },
  haya: { label: "Haya", base: "#e5c79a", veta: "#b08a5a", veta_strength: 0.45, roughness: 0.7, metalness: 0, clearcoat: 0.1 },
  cerezo: { label: "Cerezo", base: "#a85a3d", veta: "#6b3418", veta_strength: 0.6, roughness: 0.5, metalness: 0, clearcoat: 0.2 },
  blanco_brillo: { label: "Blanco brillo", base: "#f7f7f5", veta: "#f0efed", veta_strength: 0.05, roughness: 0.15, metalness: 0.02, clearcoat: 0.9 },
  blanco_mate: { label: "Blanco mate", base: "#f3f3f0", veta: "#ecebe8", veta_strength: 0.08, roughness: 0.75, metalness: 0, clearcoat: 0 },
  negro_mate: { label: "Negro mate", base: "#141414", veta: "#1d1d1d", veta_strength: 0.1, roughness: 0.85, metalness: 0.02, clearcoat: 0 },
  gris: { label: "Gris piedra", base: "#7d7d7d", veta: "#646464", veta_strength: 0.15, roughness: 0.7, metalness: 0.03, clearcoat: 0.05 },
};

const cache = new Map<string, THREE.CanvasTexture>();

/** Genera una textura proedural 512x512 con base + vetas sutiles. */
export function getTexturaAcabado(
  key: AcabadoKey,
  options?: { repeatX?: number; repeatY?: number; rotation?: number },
): THREE.CanvasTexture {
  const cacheKey = `${key}-${options?.repeatX ?? 1}-${options?.repeatY ?? 1}-${options?.rotation ?? 0}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const acab = ACABADOS[key];
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo crear contexto 2D");

  // Fondo base
  ctx.fillStyle = acab.base;
  ctx.fillRect(0, 0, 512, 512);

  // Vetas horizontales (se rotará si respeta_veta indica orientación vertical)
  ctx.globalAlpha = acab.veta_strength;
  ctx.strokeStyle = acab.veta;
  for (let y = 0; y < 512; y += 2) {
    const variacion = Math.sin(y * 0.1) * 3 + (Math.random() - 0.5) * 1.5;
    const amplitud = 1 + Math.random() * 1.5;
    ctx.lineWidth = amplitud;
    ctx.globalAlpha = acab.veta_strength * (0.35 + Math.random() * 0.65);
    ctx.beginPath();
    ctx.moveTo(0, y + variacion);
    let x = 0;
    while (x < 512) {
      x += 20 + Math.random() * 40;
      ctx.lineTo(x, y + variacion + (Math.random() - 0.5) * 2);
    }
    ctx.stroke();
  }

  // Pequeños nudos ocasionales para madera
  if (acab.veta_strength > 0.2) {
    ctx.globalAlpha = acab.veta_strength * 0.8;
    for (let i = 0; i < 4; i++) {
      const cx = Math.random() * 512;
      const cy = Math.random() * 512;
      const r = 6 + Math.random() * 12;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, acab.veta);
      grad.addColorStop(1, acab.base);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(options?.repeatX ?? 1, options?.repeatY ?? 1);
  texture.rotation = options?.rotation ?? 0;
  texture.anisotropy = 8;
  texture.needsUpdate = true;

  cache.set(cacheKey, texture);
  return texture;
}

/**
 * Devuelve parámetros de material para meshPhysicalMaterial.
 * @param respetaVeta si true, la textura no rota (veta vertical en largo_mm)
 */
export function getMaterialPropsAcabado(
  key: AcabadoKey,
  opts?: { respetaVeta?: boolean; area_m2?: number },
) {
  const acab = ACABADOS[key];
  const area = opts?.area_m2 ?? 1;
  const repeat = Math.max(1, Math.sqrt(area) * 1.5);
  const rotation = opts?.respetaVeta ? 0 : Math.PI / 2;

  const texture = typeof window !== "undefined"
    ? getTexturaAcabado(key, { repeatX: repeat, repeatY: repeat, rotation })
    : null;

  return {
    map: texture,
    color: acab.base,
    roughness: acab.roughness,
    metalness: acab.metalness,
    clearcoat: acab.clearcoat,
    clearcoatRoughness: 0.4,
  };
}
