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
// Fórmulas (con migración 046 aplicada):
//   Lateral:  largo = alto                            ancho = fondo − 1×grosor_trasera
//   Suelo:    largo = ancho − 2×grosor_tableros       ancho = fondo − 1×grosor_trasera
//   Techo:    igual que suelo
//   Trasera:  largo = ancho − 2×grosor_tableros       ancho = alto  − 2×grosor_tableros
// Los ajustes _trasera_grosores aplican trasera_grosor_mm del módulo (default 10mm si null).
const PIEZAS_BASE = [
  { nombre: "Lateral", cantidad: 2, orden: 0,
    fuente_largo: "alto",  ajuste_largo_mm: 0, ajuste_largo_grosores: 0, ajuste_largo_trasera_grosores: 0,
    fuente_ancho: "fondo", ajuste_ancho_mm: 0, ajuste_ancho_grosores: 0, ajuste_ancho_trasera_grosores: -1,
    lados_con_canto: "1", valor_largo_fijo_mm: null, valor_ancho_fijo_mm: null },
  { nombre: "Suelo", cantidad: 1, orden: 1,
    fuente_largo: "ancho", ajuste_largo_mm: 0, ajuste_largo_grosores: -2, ajuste_largo_trasera_grosores: 0,
    fuente_ancho: "fondo", ajuste_ancho_mm: 0, ajuste_ancho_grosores: 0, ajuste_ancho_trasera_grosores: -1,
    lados_con_canto: "1", valor_largo_fijo_mm: null, valor_ancho_fijo_mm: null },
  { nombre: "Techo", cantidad: 1, orden: 2,
    fuente_largo: "ancho", ajuste_largo_mm: 0, ajuste_largo_grosores: -2, ajuste_largo_trasera_grosores: 0,
    fuente_ancho: "fondo", ajuste_ancho_mm: 0, ajuste_ancho_grosores: 0, ajuste_ancho_trasera_grosores: -1,
    lados_con_canto: "1", valor_largo_fijo_mm: null, valor_ancho_fijo_mm: null },
  { nombre: "Trasera", cantidad: 1, orden: 3,
    fuente_largo: "ancho", ajuste_largo_mm: 0, ajuste_largo_grosores: -2, ajuste_largo_trasera_grosores: 0,
    fuente_ancho: "alto",  ajuste_ancho_mm: 0, ajuste_ancho_grosores: -2, ajuste_ancho_trasera_grosores: 0,
    lados_con_canto: "ninguno", valor_largo_fijo_mm: null, valor_ancho_fijo_mm: null, es_trasera: true },
];

const piezaBalda = (orden) => ({
  nombre: "Balda", cantidad: 1, orden,
  // Balda: ancho entre costados (ancho - 2×grosor), fondo = fondo_módulo − 1×grosor_trasera − 20mm aire trasero.
  fuente_largo: "ancho", ajuste_largo_mm: 0,   ajuste_largo_grosores: -2, ajuste_largo_trasera_grosores: 0,
  fuente_ancho: "fondo", ajuste_ancho_mm: -20, ajuste_ancho_grosores: 0,  ajuste_ancho_trasera_grosores: -1,
  lados_con_canto: "1", valor_largo_fijo_mm: null, valor_ancho_fijo_mm: null,
});

const piezaFrontalCajon = (orden) => ({
  nombre: "Frontal cajón", cantidad: 1, orden,
  // Frontal cajón: ancho — 3mm aire — 2×grosor (si van entre costados sin retranqueo), alto fijo 200mm por defecto.
  fuente_largo: "ancho", ajuste_largo_mm: -3, ajuste_largo_grosores: -2, ajuste_largo_trasera_grosores: 0,
  fuente_ancho: "fijo",  ajuste_ancho_mm: 0,  ajuste_ancho_grosores: 0,  ajuste_ancho_trasera_grosores: 0,
  lados_con_canto: "4", valor_largo_fijo_mm: null, valor_ancho_fijo_mm: 200,
});

const piezaPuerta = (orden) => ({
  nombre: "Puerta", cantidad: 1, orden,
  // Puerta de armario: ancho − 3mm − 2×grosor, alto − 3mm − 2×grosor (asume puerta por dentro de los costados).
  fuente_largo: "ancho", ajuste_largo_mm: -3, ajuste_largo_grosores: -2, ajuste_largo_trasera_grosores: 0,
  fuente_ancho: "alto",  ajuste_ancho_mm: -3, ajuste_ancho_grosores: -2, ajuste_ancho_trasera_grosores: 0,
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
  // ================== VESTIDOR / ARMARIO (Capa 22) ==================
  {
    nombre: "Módulo colgador doble (barra + barra)", categoria: "vestidor",
    ancho: 1000, alto: 2000, fondo: 600, horas: 2.2,
    piezas: [...PIEZAS_BASE, piezaBalda(4)],
  },
  {
    nombre: "Módulo 5 cajones bajos", categoria: "vestidor",
    ancho: 600, alto: 1200, fondo: 500, horas: 3.5,
    piezas: [...PIEZAS_BASE, piezaFrontalCajon(4), piezaFrontalCajon(5), piezaFrontalCajon(6), piezaFrontalCajon(7), piezaFrontalCajon(8)],
  },
  {
    nombre: "Módulo baldas pantaloneros", categoria: "vestidor",
    ancho: 600, alto: 1000, fondo: 500, horas: 2.5,
    piezas: [...PIEZAS_BASE, piezaBalda(4), piezaBalda(5), piezaBalda(6)],
  },
  // ================== DORMITORIO ==================
  {
    nombre: "Cabecero 160cm", categoria: "dormitorio",
    ancho: 1600, alto: 1000, fondo: 80, horas: 2,
    piezas: [...PIEZAS_BASE],
  },
  {
    nombre: "Mesilla 2 cajones", categoria: "dormitorio",
    ancho: 450, alto: 500, fondo: 400, horas: 2,
    piezas: [...PIEZAS_BASE, piezaFrontalCajon(4), piezaFrontalCajon(5)],
  },
  {
    nombre: "Cómoda 4 cajones 100×90", categoria: "dormitorio",
    ancho: 1000, alto: 900, fondo: 500, horas: 3.5,
    piezas: [...PIEZAS_BASE, piezaFrontalCajon(4), piezaFrontalCajon(5), piezaFrontalCajon(6), piezaFrontalCajon(7)],
  },
  // ================== SALÓN ==================
  {
    nombre: "Mueble TV 180×50", categoria: "salon",
    ancho: 1800, alto: 500, fondo: 400, horas: 3,
    piezas: [...PIEZAS_BASE, piezaPuerta(4), piezaPuerta(5)],
  },
  {
    nombre: "Estantería salón 80×200", categoria: "salon",
    ancho: 800, alto: 2000, fondo: 350, horas: 3.5,
    piezas: [...PIEZAS_BASE, piezaBalda(4), piezaBalda(5), piezaBalda(6), piezaBalda(7)],
  },
  {
    nombre: "Aparador 120×80 (2 puertas + 1 cajón)", categoria: "salon",
    ancho: 1200, alto: 800, fondo: 450, horas: 3.5,
    piezas: [...PIEZAS_BASE, piezaPuerta(4), piezaPuerta(5), piezaFrontalCajon(6)],
  },
  // ================== BAÑO ==================
  {
    nombre: "Mueble lavabo 60cm (2 cajones)", categoria: "bano",
    ancho: 600, alto: 500, fondo: 450, horas: 2.5,
    piezas: [...PIEZAS_BASE, piezaFrontalCajon(4), piezaFrontalCajon(5)],
  },
  {
    nombre: "Mueble lavabo 80cm suspendido (1 cajón)", categoria: "bano",
    ancho: 800, alto: 400, fondo: 450, horas: 2.5,
    piezas: [...PIEZAS_BASE, piezaFrontalCajon(4)],
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
        ajuste_largo_trasera_grosores: p.ajuste_largo_trasera_grosores ?? 0,
        ajuste_ancho_trasera_grosores: p.ajuste_ancho_trasera_grosores ?? 0,
      }));
      const insP = await sb.from("tipo_modulo_piezas").insert(rows);
      if (insP.error) console.error("  err piezas", insP.error.message);
    }
    console.log(`✓ ${t.nombre} (${t.piezas.length} piezas)`);
  }
  console.log("Seed completo.");
}

main().catch((e) => { console.error(e); process.exit(1); });
