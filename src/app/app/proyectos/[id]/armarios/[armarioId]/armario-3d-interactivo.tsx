"use client";

import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Grid, Edges, Text } from "@react-three/drei";
import { Suspense, useState, useTransition } from "react";
import { toast } from "sonner";

type ModuloView = {
  id: string;
  nombre: string;
  ancho_mm: number;
  alto_mm: number;
  fondo_mm: number;
  particiones: number;
  color: string;
};

const COLOR_SELECTED = "#f97316"; // naranja

export function Armario3DInteractivo({
  armario_ancho_mm,
  armario_alto_mm,
  armario_fondo_mm,
  tipo_instalacion,
  margen_tapeta_mm,
  modulos,
  actionMoverArriba,
  actionMoverAbajo,
  actionEliminar,
}: {
  armario_ancho_mm: number;
  armario_alto_mm: number;
  armario_fondo_mm: number;
  tipo_instalacion: "empotrado" | "suelto";
  margen_tapeta_mm: number;
  modulos: ModuloView[];
  actionMoverArriba: (id: string) => Promise<void>;
  actionMoverAbajo: (id: string) => Promise<void>;
  actionEliminar: (id: string) => Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const k = 0.001;
  const W = armario_ancho_mm * k;
  const H = armario_alto_mm * k;
  const D = armario_fondo_mm * k;
  const margen = tipo_instalacion === "empotrado" ? margen_tapeta_mm * k : 0;
  const diagonal = Math.sqrt(W * W + H * H + D * D);
  const camDist = Math.max(2.5, diagonal * 1.5);

  const selected = modulos.find((m) => m.id === selectedId) ?? null;
  const selectedIdx = selected ? modulos.findIndex((m) => m.id === selected.id) : -1;

  const handleClick = (id: string) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setSelectedId((prev) => (prev === id ? null : id));
  };

  const run = (action: () => Promise<void>, label: string) => {
    start(async () => {
      try {
        await action();
        toast.success(label);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  };

  return (
    <div className="relative">
      <div className="h-[500px] w-full overflow-hidden rounded-xl bg-gradient-to-b from-zinc-100 to-zinc-300 dark:from-zinc-800 dark:to-zinc-950">
        <Canvas shadows camera={{ position: [camDist, camDist * 0.8, camDist], fov: 35 }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 8, 5]} intensity={1} castShadow />
          <directionalLight position={[-3, 4, -2]} intensity={0.3} />

          <Suspense fallback={null}>
            <Grid position={[0, 0, 0]} args={[20, 20]} cellSize={0.1} cellThickness={0.5} cellColor="#a1a1aa" sectionSize={1} sectionThickness={1} sectionColor="#71717a" fadeDistance={30} fadeStrength={1} infiniteGrid />

            {tipo_instalacion === "empotrado" && margen > 0 ? (
              <mesh position={[W / 2, H / 2, D / 2]}>
                <boxGeometry args={[W + 2 * margen, H + 2 * margen, D + margen]} />
                <meshBasicMaterial color="#f59e0b" transparent opacity={0.06} />
                <Edges color="#f59e0b" lineWidth={1.5} />
              </mesh>
            ) : null}

            <mesh position={[W / 2, H / 2, D / 2]}>
              <boxGeometry args={[W, H, D]} />
              <meshBasicMaterial color="#27272a" transparent opacity={0.04} />
              <Edges color="#18181b" lineWidth={2} />
            </mesh>

            {(() => {
              let offsetX = 0;
              return modulos.map((m) => {
                const mw = m.ancho_mm * k;
                const mh = Math.min(m.alto_mm * k, H);
                const md = Math.min(m.fondo_mm * k, D);
                const particiones = Math.max(1, m.particiones);
                const esSel = selectedId === m.id;

                const group = (
                  <group key={m.id} position={[offsetX + mw / 2, mh / 2, md / 2]} onClick={handleClick(m.id)}>
                    <mesh castShadow>
                      <boxGeometry args={[mw, mh, md]} />
                      <meshStandardMaterial
                        color={esSel ? COLOR_SELECTED : m.color}
                        roughness={0.6}
                        emissive={esSel ? COLOR_SELECTED : "#000000"}
                        emissiveIntensity={esSel ? 0.2 : 0}
                      />
                    </mesh>
                    <Edges color={esSel ? "#c2410c" : "#18181b"} lineWidth={esSel ? 3 : 1} />
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
                    <Text
                      position={[0, mh / 2 + 0.05, md / 2 + 0.01]}
                      fontSize={Math.max(0.05, mw / 10)}
                      color={esSel ? "#c2410c" : "#18181b"}
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

            <OrbitControls enableDamping dampingFactor={0.1} target={[W / 2, H / 2, D / 2]} minDistance={1} maxDistance={20} />
          </Suspense>
        </Canvas>
      </div>

      {/* Toolbar flotante con acciones del módulo seleccionado */}
      {selected ? (
        <div className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
            📦 {selected.nombre}
          </span>
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
            {selected.ancho_mm}×{selected.alto_mm}×{selected.fondo_mm}
          </span>
          <div className="ml-2 flex items-center gap-1">
            <button
              onClick={() => run(() => actionMoverArriba(selected.id), "Movido a la izquierda")}
              disabled={pending || selectedIdx === 0}
              title="Mover a la izquierda"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-300 text-sm disabled:opacity-30 dark:border-zinc-700"
            >
              ←
            </button>
            <button
              onClick={() => run(() => actionMoverAbajo(selected.id), "Movido a la derecha")}
              disabled={pending || selectedIdx === modulos.length - 1}
              title="Mover a la derecha"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-300 text-sm disabled:opacity-30 dark:border-zinc-700"
            >
              →
            </button>
            <button
              onClick={() => {
                if (!confirm(`¿Eliminar el módulo "${selected.nombre}"?`)) return;
                run(() => actionEliminar(selected.id), "Módulo eliminado");
                setSelectedId(null);
              }}
              disabled={pending}
              title="Eliminar módulo"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-red-300 text-xs font-semibold text-red-700 disabled:opacity-30 dark:border-red-900 dark:text-red-300"
            >
              ✕
            </button>
            <button
              onClick={() => setSelectedId(null)}
              className="ml-1 text-[10px] text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              deseleccionar
            </button>
          </div>
        </div>
      ) : null}

      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        💡 Haz clic en un módulo para seleccionarlo y ver acciones (mover izquierda/derecha, eliminar).
      </p>
    </div>
  );
}
