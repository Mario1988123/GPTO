// scripts/seed-tipos-estandar.mjs
// Inserta tipos de modulo estandar (cajoneras, colgadores, zapatero, estanterias)
// para la primera empresa de la BD. Idempotente: borra los que tienen es_estandar=true antes.
//
// Uso: pnpm seed-tipos-estandar

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();

function loadEnv() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const raw of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    const v = line.slice(eq + 1).trim();
    if (!(k in process.env)) process.env[k] = v;
  }
}

// Piezas base comunes: 2 laterales + suelo + techo + trasera.
// Convención: costados de pie, suelo+techo encastrados entre costados, trasera encastrada al fondo.
// - Lateral: alto × (fondo - grosor_trasera).  ajuste_ancho_mm=-10 asume trasera 10mm.
//   (Mejora futura: campo ajuste_ancho_trasera_grosores que aplique trasera_grosor_mm del módulo).
// - Suelo/Techo: (ancho - 2×grosor) × (fondo - grosor_trasera).
// - Trasera: (ancho - 2×grosor) × (alto - 2×grosor) × grosor_trasera.
const PIEZAS_BASE = [
  { nombre: "Lateral", cantidad: 2, orden: 0, fuente_largo: "alto", ajuste_largo_mm: 0, ajuste_largo_grosores: 0, fuente_ancho: "fondo", ajuste_ancho_mm: -10, ajuste_ancho_grosores: 0, lados_con_canto: "1", valor_largo_fijo_mm: null, valor_ancho_fijo_mm: null },
  { nombre: "Suelo", cantidad: 1, orden: 1, fuente_largo: "ancho", ajuste_largo_mm: 0, ajuste_largo_grosores: -2, fuente_ancho: "fondo", ajuste_ancho_mm: -10, ajuste_ancho_grosores: 0, lados_con_canto: "1", valor_largo_fijo_mm: null, valor_ancho_fijo_mm: null },
  { nombre: "Techo", cantidad: 1, orden: 2, fuente_largo: "ancho", ajuste_largo_mm: 0, ajuste_largo_grosores: -2, fuente_ancho: "fondo", ajuste_ancho_mm: -10, ajuste_ancho_grosores: 0, lados_con_canto: "1", valor_largo_fijo_mm: null, valor_ancho_fijo_mm: null },
  { nombre: "Trasera", cantidad: 1, orden: 3, fuente_largo: "ancho", ajuste_largo_mm: 0, ajuste_largo_grosores: -2, fuente_ancho: "alto", ajuste_ancho_mm: 0, ajuste_ancho_grosores: -2, lados_con_canto: "ninguno", valor_largo_fijo_mm: null, valor_ancho_fijo_mm: null, es_trasera: true },
];

const piezaBalda = (orden) => ({
  nombre: "Balda", cantidad: 1, orden,
  fuente_largo: "ancho", ajuste_largo_mm: 0, ajuste_largo_grosores: -2,
  fuente_ancho: "fondo", ajuste_ancho_mm: -10, ajuste_ancho_grosores: 0,
  lados_con_canto: "1", valor_largo_fijo_mm: null, valor_ancho_fijo_mm: null,
});

const piezaFrontalCajon = (orden) => ({
  nombre: "Frontal cajón", cantidad: 1, orden,
  fuente_largo: "ancho", ajuste_largo_mm: -3, ajuste_largo_grosores: -2,
  fuente_ancho: "fijo", ajuste_ancho_mm: 0, ajuste_ancho_grosores: 0,
  lados_con_canto: "4", valor_largo_fijo_mm: null, valor_ancho_fijo_mm: 200,
});

const piezaPuerta = (orden) => ({
  nombre: "Puerta", cantidad: 1, orden,
  fuente_largo: "ancho", ajuste_largo_mm: -3, ajuste_largo_grosores: -2,
  fuente_ancho: "alto", ajuste_ancho_mm: -3, ajuste_ancho_grosores: -2,
  lados_con_canto: "4", valor_largo_fijo_mm: null, valor_ancho_fijo_mm: null,
});

const TIPOS_ESTANDAR = [
  {
    nombre: "Cajonera 3 cajones", categoria: "cajonera",
    ancho: 600, alto: 700, fondo: 500, horas: 2.5,
    piezas: [...PIEZAS_BASE, piezaFrontalCajon(4), piezaFrontalCajon(5), piezaFrontalCajon(6)],
  },
  {
    nombre: "Cajonera 4 cajones", categoria: "cajonera",
    ancho: 600, alto: 1000, fondo: 500, horas: 3,
    piezas: [...PIEZAS_BASE, piezaFrontalCajon(4), piezaFrontalCajon(5), piezaFrontalCajon(6), piezaFrontalCajon(7)],
  },
  {
    nombre: "Colgador corto (camisas/pantalones)", categoria: "colgador_corto",
    ancho: 600, alto: 900, fondo: 550, horas: 1.5,
    piezas: [...PIEZAS_BASE],
  },
  {
    nombre: "Colgador largo (trajes/vestidos)", categoria: "colgador_largo",
    ancho: 600, alto: 1800, fondo: 550, horas: 1.8,
    piezas: [...PIEZAS_BASE, piezaPuerta(4)],
  },
  {
    nombre: "Zapatero", categoria: "zapatero",
    ancho: 600, alto: 1200, fondo: 400, horas: 2.5,
    piezas: [...PIEZAS_BASE, piezaBalda(4), piezaBalda(5), piezaBalda(6), piezaBalda(7)],
  },
  {
    nombre: "Estantería 5 baldas", categoria: "estanteria",
    ancho: 600, alto: 2000, fondo: 400, horas: 3,
    piezas: [...PIEZAS_BASE, piezaBalda(4), piezaBalda(5), piezaBalda(6), piezaBalda(7), piezaBalda(8)],
  },
  // ================== COCINA (Capa 22) ==================
  // Muebles bajos: alto 720mm, fondo 560mm (estándar encimera 60cm con encimera 40mm).
  {
    nombre: "Bajo cocina 30cm", categoria: "cocina_bajo",
    ancho: 300, alto: 720, fondo: 560, horas: 1.2,
    piezas: [...PIEZAS_BASE, piezaPuerta(4)],
  },
  {
    nombre: "Bajo cocina 40cm", categoria: "cocina_bajo",
    ancho: 400, alto: 720, fondo: 560, horas: 1.3,
    piezas: [...PIEZAS_BASE, piezaPuerta(4)],
  },
  {
    nombre: "Bajo cocina 50cm", categoria: "cocina_bajo",
    ancho: 500, alto: 720, fondo: 560, horas: 1.4,
    piezas: [...PIEZAS_BASE, piezaPuerta(4)],
  },
  {
    nombre: "Bajo cocina 60cm", categoria: "cocina_bajo",
    ancho: 600, alto: 720, fondo: 560, horas: 1.5,
    piezas: [...PIEZAS_BASE, piezaPuerta(4)],
  },
  {
    nombre: "Bajo cocina 80cm (2 puertas)", categoria: "cocina_bajo",
    ancho: 800, alto: 720, fondo: 560, horas: 1.8,
    piezas: [...PIEZAS_BASE, piezaPuerta(4), piezaPuerta(5)],
  },
  {
    nombre: "Bajo cocina 90cm (2 puertas)", categoria: "cocina_bajo",
    ancho: 900, alto: 720, fondo: 560, horas: 1.9,
    piezas: [...PIEZAS_BASE, piezaPuerta(4), piezaPuerta(5)],
  },
  // Cacerolero (3 cajones de gran altura): bajo de cocina destinado a cacerolas.
  {
    nombre: "Cacerolero 60cm (3 cajones)", categoria: "cocina_cacerolero",
    ancho: 600, alto: 720, fondo: 560, horas: 2.8,
    piezas: [...PIEZAS_BASE, piezaFrontalCajon(4), piezaFrontalCajon(5), piezaFrontalCajon(6)],
  },
  {
    nombre: "Cacerolero 90cm (3 cajones)", categoria: "cocina_cacerolero",
    ancho: 900, alto: 720, fondo: 560, horas: 3.2,
    piezas: [...PIEZAS_BASE, piezaFrontalCajon(4), piezaFrontalCajon(5), piezaFrontalCajon(6)],
  },
  // Esquineros: mueble de rincón 90x90 con giratorio o puerta chaflán.
  {
    nombre: "Esquinero bajo 90×90", categoria: "cocina_esquinero",
    ancho: 900, alto: 720, fondo: 900, horas: 3.5,
    piezas: [...PIEZAS_BASE, piezaPuerta(4)],
  },
  // Muebles altos: alto 900mm, fondo 350mm (más estrecho que los bajos).
  {
    nombre: "Alto cocina 30cm", categoria: "cocina_alto",
    ancho: 300, alto: 900, fondo: 350, horas: 1.2,
    piezas: [...PIEZAS_BASE, piezaPuerta(4)],
  },
  {
    nombre: "Alto cocina 40cm", categoria: "cocina_alto",
    ancho: 400, alto: 900, fondo: 350, horas: 1.3,
    piezas: [...PIEZAS_BASE, piezaPuerta(4)],
  },
  {
    nombre: "Alto cocina 60cm", categoria: "cocina_alto",
    ancho: 600, alto: 900, fondo: 350, horas: 1.5,
    piezas: [...PIEZAS_BASE, piezaPuerta(4)],
  },
  {
    nombre: "Alto cocina 80cm (2 puertas)", categoria: "cocina_alto",
    ancho: 800, alto: 900, fondo: 350, horas: 1.8,
    piezas: [...PIEZAS_BASE, piezaPuerta(4), piezaPuerta(5)],
  },
  {
    nombre: "Columna horno + microondas 60cm", categoria: "cocina_columna",
    ancho: 600, alto: 2100, fondo: 560, horas: 3.5,
    piezas: [...PIEZAS_BASE, piezaPuerta(4), piezaPuerta(5)],
  },
  {
    nombre: "Columna despensa 60cm", categoria: "cocina_columna",
    ancho: 600, alto: 2100, fondo: 560, horas: 3.2,
    piezas: [...PIEZAS_BASE, piezaPuerta(4), piezaPuerta(5), piezaBalda(6), piezaBalda(7), piezaBalda(8)],
  },
  {
    nombre: "Hueco libre", categoria: "otro",
    ancho: 900, alto: 2000, fondo: 600, horas: 2,
    piezas: [...PIEZAS_BASE],
  },
];

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) { console.error("Faltan env"); process.exit(1); }
  const sb = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

  // Empresa MAZOR (seed original)
  const empresaId = "00000000-0000-0000-0000-000000000001";

  // Referencia tablero default: primer activo de la empresa
  const { data: ref } = await sb.from("referencias_tablero").select("id, grosor_mm").eq("empresa_id", empresaId).eq("activo", true).order("grosor_mm").limit(1).single();
  const refDefaultId = ref?.id ?? null;

  // Borrar estandar previos
  const prev = await sb.from("tipos_modulo").select("id").eq("empresa_id", empresaId).eq("es_estandar", true);
  if (prev.data && prev.data.length > 0) {
    console.log("Borrando", prev.data.length, "tipos estandar previos...");
    for (const t of prev.data) {
      await sb.from("tipos_modulo").delete().eq("id", t.id);
    }
  }

  for (const t of TIPOS_ESTANDAR) {
    const ins = await sb.from("tipos_modulo").insert({
      empresa_id: empresaId,
      nombre: t.nombre,
      categoria: t.categoria,
      es_estandar: true,
      ancho_default_mm: t.ancho,
      alto_default_mm: t.alto,
      fondo_default_mm: t.fondo,
      horas_fabricacion_default: t.horas,
      referencia_tablero_default_id: refDefaultId,
      activo: true,
      descripcion: `Tipo estándar · ${t.categoria}`,
    }).select("id").single();
    if (ins.error) { console.error("err tipo", t.nombre, ins.error.message); continue; }
    const tipoId = ins.data.id;

    if (t.piezas.length > 0) {
      const rows = t.piezas.map((p) => ({
        tipo_modulo_id: tipoId,
        ...p,
        respeta_veta_override: null,
        canto_id: null,
        referencia_tablero_id: null,
        notas: null,
        es_trasera: p.es_trasera ?? false,
      }));
      const insP = await sb.from("tipo_modulo_piezas").insert(rows);
      if (insP.error) console.error("  err piezas", insP.error.message);
    }
    console.log(`✓ ${t.nombre} (${t.piezas.length} piezas)`);
  }
  console.log("Seed completo.");
}

main().catch((e) => { console.error(e); process.exit(1); });
