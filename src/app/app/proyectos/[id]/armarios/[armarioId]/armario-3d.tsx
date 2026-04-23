"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Edges, Text } from "@react-three/drei";
import { Suspense } from "react";

type ModuloView = {
  id: string;
  nombre: string;
  ancho_mm: number;
  alto_mm: number;
  fondo_mm: number;
  particiones: number;
  color: string;
};

const COLORS = [
  "#93c5fd", "#86efac", "#fcd34d", "#d8b4fe", "#fda4af", "#67e8f9", "#bef264", "#f0abfc",
];

/**
 * Vista 3D del armario con sus módulos.
 * Todo en mm pero escalado a "unidades R3F" dividiendo por 1000 (1 unidad = 1 m).
 * El origen está en la esquina inferior izquierda del armario.
 * Cámara inicial orbital.
 */
export function Armario3D({
  armario_ancho_mm,
  armario_alto_mm,
  armario_fondo_mm,
  tipo_instalacion,
  margen_tapeta_mm,
  modulos,
}: {
  armario_ancho_mm: number;
  armario_alto_mm: number;
  armario_fondo_mm: number;
  tipo_instalacion: "empotrado" | "suelto";
  margen_tapeta_mm: number;
  modulos: ModuloView[];
}) {
  // Escala: mm → m
  const k = 0.001;
  const W = armario_ancho_mm * k;
  const H = armario_alto_mm * k;
  const D = armario_fondo_mm * k;
  // Margen visible (solo si empotrado)
  const margen = tipo_instalacion === "empotrado" ? margen_tapeta_mm * k : 0;

  const diagonal = Math.sqrt(W * W + H * H + D * D);
  const camDist = Math.max(2.5, diagonal * 1.5);

  return (
    <div className="h-[500px] w-full overflow-hidden rounded-xl bg-gradient-to-b from-zinc-100 to-zinc-300 dark:from-zinc-800 dark:to-zinc-950">
      <Canvas
        shadows
        camera={{ position: [camDist, camDist * 0.8, camDist], fov: 35 }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 5]} intensity={1} castShadow />
        <directionalLight position={[-3, 4, -2]} intensity={0.3} />

        <Suspense fallback={null}>
          {/* Suelo con grid */}
          <Grid
            position={[0, 0, 0]}
            args={[20, 20]}
            cellSize={0.1}
            cellThickness={0.5}
            cellColor="#a1a1aa"
            sectionSize={1}
            sectionThickness={1}
            sectionColor="#71717a"
            fadeDistance={30}
            fadeStrength={1}
            infiniteGrid
          />

          {/* Hueco del armario como wireframe (si empotrado, más prominente) */}
          {tipo_instalacion === "empotrado" && margen > 0 ? (
            <mesh position={[W / 2, H / 2, D / 2]}>
              <boxGeometry args={[W + 2 * margen, H + 2 * margen, D + margen]} />
              <meshBasicMaterial color="#f59e0b" transparent opacity={0.06} />
              <Edges color="#f59e0b" lineWidth={1.5} />
            </mesh>
          ) : null}

          {/* Armario (bounding box) */}
          <mesh position={[W / 2, H / 2, D / 2]}>
            <boxGeometry args={[W, H, D]} />
            <meshBasicMaterial color="#27272a" transparent opacity={0.04} />
            <Edges color="#18181b" lineWidth={2} />
          </mesh>

          {/* Módulos (apilados lado a lado en X, ocupando todo alto y fondo del armario) */}
          {(() => {
            let offsetX = 0;
            return modulos.map((m, i) => {
              const mw = m.ancho_mm * k;
              const mh = Math.min(m.alto_mm * k, H); // no excede alto armario
              const md = Math.min(m.fondo_mm * k, D);
              const particiones = Math.max(1, m.particiones);

              const group = (
                <group key={m.id} position={[offsetX + mw / 2, mh / 2, md / 2]}>
                  <mesh castShadow>
                    <boxGeometry args={[mw, mh, md]} />
                    <meshStandardMaterial color={m.color ?? COLORS[i % COLORS.length]} roughness={0.6} />
                  </mesh>
                  <Edges color="#18181b" lineWidth={1} />
                  {/* Líneas de partición horizontales */}
                  {particiones > 1
                    ? Array.from({ length: particiones - 1 }).map((_, k2) => {
                        const y = -mh / 2 + (mh / particiones) * (k2 + 1);
                        return (
                          <mesh key={k2} position={[0, y, md / 2 + 0.002]}>
                            <boxGeometry args={[mw, 0.005, 0.001]} />
                            <meshBasicMaterial color="#18181b" />
                          </mesh>
                        );
                      })
                    : null}
                  {/* Etiqueta del módulo */}
                  <Text
                    position={[0, mh / 2 + 0.05, md / 2 + 0.01]}
                    fontSize={Math.max(0.05, mw / 10)}
                    color="#18181b"
                    anchorX="center"
                    anchorY="bottom"
                  >
                    {m.nombre}
                  </Text>
                </group>
              );
              offsetX += mw;
              return group;
            });
          })()}

          <OrbitControls
            enableDamping
            dampingFactor={0.1}
            target={[W / 2, H / 2, D / 2]}
            minDistance={1}
            maxDistance={20}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
