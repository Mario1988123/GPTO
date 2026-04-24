"use client";

import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  ContactShadows,
  Grid,
  Edges,
  Html,
} from "@react-three/drei";
import { Suspense, useMemo } from "react";
import type { Abertura } from "@/lib/tipos/proyectos";

type Punto = { x: number; y: number };

type ArmarioEnPlano = {
  id: string;
  nombre: string;
  ancho_total_mm: number;
  alto_total_mm: number;
  fondo_mm: number;
  plano_x_mm: number;
  plano_y_mm: number;
  plano_rotacion: 0 | 90 | 180 | 270;
};

export function Estancia3D({
  puntos,
  alto_pared_mm,
  aberturas,
  armarios,
}: {
  puntos: Punto[];
  alto_pared_mm: number;
  aberturas: Abertura[];
  armarios: ArmarioEnPlano[];
}) {
  const k = 0.001;
  const H = alto_pared_mm * k;

  const centroid = useMemo(() => {
    const cx = puntos.reduce((a, p) => a + p.x, 0) / puntos.length;
    const cy = puntos.reduce((a, p) => a + p.y, 0) / puntos.length;
    return { cx: cx * k, cy: cy * k };
  }, [puntos]);

  const extents = useMemo(() => {
    const xs = puntos.map((p) => p.x * k);
    const zs = puntos.map((p) => p.y * k);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);
    return { minX, maxX, minZ, maxZ, w: maxX - minX, d: maxZ - minZ };
  }, [puntos, k]);

  const camDist = Math.max(extents.w, extents.d) * 1.4;

  return (
    <div className="h-[600px] w-full overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-muted/30 via-background to-muted/50 shadow-inner">
      <Canvas
        shadows
        camera={{ position: [centroid.cx + camDist, H * 1.6, centroid.cy + camDist], fov: 42 }}
        dpr={[1, 2]}
      >
        <color attach="background" args={["#f4f4f5"]} />
        <fog attach="fog" args={["#f4f4f5", 20, 60]} />

        <ambientLight intensity={0.45} />
        <directionalLight
          position={[8, 14, 5]}
          intensity={1.1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-bias={-0.0005}
        />
        <directionalLight position={[-5, 8, -4]} intensity={0.35} />

        <Suspense fallback={null}>
          <Environment preset="apartment" background={false} />

          <Grid
            position={[0, -0.002, 0]}
            args={[80, 80]}
            cellSize={0.1}
            cellThickness={0.4}
            cellColor="#c4c4c8"
            sectionSize={1}
            sectionThickness={1}
            sectionColor="#8b8b93"
            fadeDistance={40}
            fadeStrength={1.5}
            infiniteGrid
          />

          {/* Suelo de la estancia */}
          <Suelo puntos={puntos} k={k} />

          {/* Paredes con huecos de puertas y ventanas */}
          <Paredes puntos={puntos} alto_pared={H} aberturas={aberturas} k={k} />

          {/* Armarios */}
          {armarios.map((a) => (
            <ArmarioEnEstancia key={a.id} armario={a} k={k} />
          ))}

          <ContactShadows
            position={[centroid.cx, 0, centroid.cy]}
            opacity={0.35}
            scale={Math.max(extents.w, extents.d) * 2}
            blur={2.5}
            far={2}
          />

          <OrbitControls
            enableDamping
            dampingFactor={0.1}
            target={[centroid.cx, H / 2, centroid.cy]}
            minDistance={1}
            maxDistance={50}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

function Suelo({ puntos, k }: { puntos: Punto[]; k: number }) {
  // Suelo renderizado como plano triangulado desde el centroide (sirve para convexos y ligeramente cóncavos)
  const geoms = useMemo(() => {
    const cx = puntos.reduce((a, p) => a + p.x, 0) / puntos.length;
    const cy = puntos.reduce((a, p) => a + p.y, 0) / puntos.length;
    const tris: [number, number, number][] = [];
    for (let i = 0; i < puntos.length; i++) {
      const p1 = puntos[i];
      const p2 = puntos[(i + 1) % puntos.length];
      tris.push([p1.x, p1.y, p2.x], [p2.x, p2.y, cx], [cy, 0, 0]);
    }
    return { cx, cy };
  }, [puntos]);
  void geoms;

  // Simple: plano rectangular bounding box (suficiente visualmente si es convexo)
  const xs = puntos.map((p) => p.x * k);
  const zs = puntos.map((p) => p.y * k);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const w = maxX - minX;
  const d = maxZ - minZ;

  return (
    <mesh position={[cx, 0, cz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial color="#e8e4df" roughness={0.9} metalness={0.02} />
    </mesh>
  );
}

function Paredes({
  puntos,
  alto_pared,
  aberturas,
  k,
}: {
  puntos: Punto[];
  alto_pared: number;
  aberturas: Abertura[];
  k: number;
}) {
  const thickness = 0.08;

  return (
    <>
      {puntos.map((p, i) => {
        const next = puntos[(i + 1) % puntos.length];
        const dx = (next.x - p.x) * k;
        const dz = (next.y - p.y) * k;
        const len = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dz, dx);
        const cx = (p.x + next.x) * 0.5 * k;
        const cz = (p.y + next.y) * 0.5 * k;

        const paredAberturas = aberturas.filter((a) => a.pared_idx === i);
        // Simplificación: pintamos la pared completa y colocamos los huecos como "recortes" visuales (marcos)
        // Para un recorte real, se necesitaría CSG. Aquí vamos a crear segmentos de pared.
        return (
          <group key={i} position={[cx, alto_pared / 2, cz]} rotation={[0, -angle, 0]}>
            <ParedConHuecos
              length={len}
              alto={alto_pared}
              thickness={thickness}
              aberturas={paredAberturas}
              k={k}
            />
          </group>
        );
      })}
    </>
  );
}

/** Pinta la pared como concatenación de segmentos (split en aberturas) + marcos + cristales */
function ParedConHuecos({
  length,
  alto,
  thickness,
  aberturas,
  k,
}: {
  length: number;
  alto: number;
  thickness: number;
  aberturas: Abertura[];
  k: number;
}) {
  // Ordenar aberturas por x_en_pared_mm
  const ord = [...aberturas].sort((a, b) => a.x_en_pared_mm - b.x_en_pared_mm);

  // Generar segmentos [x0, x1] en metros desde el inicio de la pared
  type Seg = { x0: number; x1: number; y0?: number; y1?: number };
  const muro: Seg[] = [];
  const dinteles: Seg[] = [];
  const antepechos: Seg[] = [];
  const marcos: { cx: number; ancho: number; alto: number; y: number; tipo: "puerta" | "ventana" }[] = [];

  let cursor = 0;
  for (const a of ord) {
    const x0 = a.x_en_pared_mm * k;
    const x1 = x0 + a.ancho_mm * k;
    const y_top = alto;
    const y_bot = a.tipo === "ventana" ? a.antepecho_mm * k : 0;
    const y_hole_top = y_bot + a.alto_mm * k;

    // Segmento sólido antes de la abertura
    if (cursor < x0) muro.push({ x0: cursor, x1: x0 });

    // Antepecho (solo ventanas)
    if (a.tipo === "ventana" && y_bot > 0) {
      antepechos.push({ x0, x1, y0: 0, y1: y_bot });
    }

    // Dintel arriba del hueco
    if (y_hole_top < y_top) {
      dinteles.push({ x0, x1, y0: y_hole_top, y1: y_top });
    }

    marcos.push({
      cx: (x0 + x1) / 2,
      ancho: a.ancho_mm * k,
      alto: a.alto_mm * k,
      y: y_bot + (a.alto_mm * k) / 2,
      tipo: a.tipo,
    });

    cursor = x1;
  }
  if (cursor < length) muro.push({ x0: cursor, x1: length });

  return (
    <>
      {/* Segmentos completos de pared */}
      {muro.map((s, idx) => {
        const w = s.x1 - s.x0;
        return (
          <mesh
            key={`muro-${idx}`}
            position={[s.x0 + w / 2 - length / 2, 0, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[w, alto, thickness]} />
            <meshStandardMaterial color="#f1ece5" roughness={0.9} />
            <Edges color="#9a8f81" lineWidth={0.5} />
          </mesh>
        );
      })}
      {/* Dinteles (pared sobre puerta/ventana) */}
      {dinteles.map((s, idx) => {
        const w = s.x1 - s.x0;
        const h = (s.y1 ?? 0) - (s.y0 ?? 0);
        return (
          <mesh
            key={`dintel-${idx}`}
            position={[s.x0 + w / 2 - length / 2, (s.y0 ?? 0) + h / 2 - alto / 2, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[w, h, thickness]} />
            <meshStandardMaterial color="#f1ece5" roughness={0.9} />
          </mesh>
        );
      })}
      {/* Antepechos (muro bajo ventana) */}
      {antepechos.map((s, idx) => {
        const w = s.x1 - s.x0;
        const h = (s.y1 ?? 0) - (s.y0 ?? 0);
        return (
          <mesh
            key={`antepecho-${idx}`}
            position={[s.x0 + w / 2 - length / 2, (s.y0 ?? 0) + h / 2 - alto / 2, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[w, h, thickness]} />
            <meshStandardMaterial color="#f1ece5" roughness={0.9} />
          </mesh>
        );
      })}
      {/* Marcos de aberturas */}
      {marcos.map((m, idx) => (
        <group
          key={`marco-${idx}`}
          position={[m.cx - length / 2, m.y - alto / 2, 0]}
        >
          {/* Marco superior/inferior/laterales */}
          <mesh position={[0, m.alto / 2 - 0.03, 0]}>
            <boxGeometry args={[m.ancho, 0.04, thickness * 1.2]} />
            <meshStandardMaterial color={m.tipo === "puerta" ? "#8b6f4e" : "#d4d4d8"} roughness={0.6} />
          </mesh>
          <mesh position={[0, -m.alto / 2 + 0.03, 0]}>
            <boxGeometry args={[m.ancho, 0.04, thickness * 1.2]} />
            <meshStandardMaterial color={m.tipo === "puerta" ? "#8b6f4e" : "#d4d4d8"} roughness={0.6} />
          </mesh>
          <mesh position={[-m.ancho / 2 + 0.02, 0, 0]}>
            <boxGeometry args={[0.04, m.alto, thickness * 1.2]} />
            <meshStandardMaterial color={m.tipo === "puerta" ? "#8b6f4e" : "#d4d4d8"} roughness={0.6} />
          </mesh>
          <mesh position={[m.ancho / 2 - 0.02, 0, 0]}>
            <boxGeometry args={[0.04, m.alto, thickness * 1.2]} />
            <meshStandardMaterial color={m.tipo === "puerta" ? "#8b6f4e" : "#d4d4d8"} roughness={0.6} />
          </mesh>

          {/* Cristal transparente si ventana */}
          {m.tipo === "ventana" ? (
            <mesh>
              <boxGeometry args={[m.ancho - 0.05, m.alto - 0.05, 0.005]} />
              <meshPhysicalMaterial
                color="#bde0fe"
                transparent
                opacity={0.35}
                roughness={0.02}
                transmission={0.85}
                thickness={0.01}
                metalness={0}
                ior={1.45}
              />
            </mesh>
          ) : (
            /* Hoja de puerta entornada */
            <group position={[-m.ancho / 2 + 0.02, 0, 0]}>
              <mesh rotation={[0, -0.7, 0]} position={[m.ancho / 2, 0, 0]}>
                <boxGeometry args={[m.ancho - 0.05, m.alto - 0.07, 0.02]} />
                <meshStandardMaterial color="#6b4f33" roughness={0.5} />
              </mesh>
            </group>
          )}
        </group>
      ))}
    </>
  );
}

function ArmarioEnEstancia({
  armario,
  k,
}: {
  armario: ArmarioEnPlano;
  k: number;
}) {
  const W = armario.ancho_total_mm * k;
  const H = armario.alto_total_mm * k;
  const D = armario.fondo_mm * k;
  const x = armario.plano_x_mm * k;
  const z = armario.plano_y_mm * k;
  const rot = ((armario.plano_rotacion ?? 0) * Math.PI) / 180;

  return (
    <group position={[x + W / 2, H / 2, z + D / 2]} rotation={[0, -rot, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[W, H, D]} />
        <meshStandardMaterial color="#e4d4c0" roughness={0.5} metalness={0.04} />
        <Edges color="#2e2a26" lineWidth={1.2} />
      </mesh>
      <Html position={[0, H / 2 + 0.1, 0]} center distanceFactor={6} zIndexRange={[0, 10]}>
        <div className="pointer-events-none whitespace-nowrap rounded bg-foreground/90 px-1.5 py-0.5 text-[10px] font-semibold text-background">
          {armario.nombre}
        </div>
      </Html>
    </group>
  );
}
