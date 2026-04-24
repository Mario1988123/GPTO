"use client";

import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Grid, Edges, Text } from "@react-three/drei";
import { Suspense, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import type { Matrix4 } from "three";
import { SUBELEMENTOS_META, type ModuloSubelemento, type TipoSubelemento } from "@/lib/tipos/proyectos";
import type { AcabadoKey } from "@/lib/render/materiales";
import { ACABADOS } from "@/lib/render/materiales";

export type ModuloPro = {
  id: string;
  nombre: string;
  ancho_mm: number;
  alto_mm: number;
  fondo_mm: number;
  posicion_x_mm: number;
  posicion_y_mm: number;
  particiones: number;
  color: string;
  tiene_led_rebaje: boolean;
  led_color_hex: string | null;
  led_intensidad_lm_m: number | null;
  categoria: string | null;
  subelementos: ModuloSubelemento[];
};

type Props = {
  armario_ancho_mm: number;
  armario_alto_mm: number;
  armario_fondo_mm: number;
  tipo_instalacion: "empotrado" | "suelto";
  margen_tapeta_mm: number;
  modulos: ModuloPro[];
  acabado?: AcabadoKey;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x_mm: number, y_mm: number) => Promise<void>;
};

const COLOR_SEL = "#f97316";

/** Contenido 3D puro (sin Canvas). Se monta dentro de cualquier Canvas externo. */
export function ArmarioScene({
  armario_ancho_mm,
  armario_alto_mm,
  armario_fondo_mm,
  tipo_instalacion,
  margen_tapeta_mm,
  modulos,
  acabado = "roble_claro",
  selectedId,
  onSelect,
  onMove,
  showFloor = true,
  showControls = true,
}: Props & { showFloor?: boolean; showControls?: boolean }) {
  const [, start] = useTransition();
  const k = 0.001;
  const W = armario_ancho_mm * k;
  const H = armario_alto_mm * k;
  const D = armario_fondo_mm * k;
  const margen = tipo_instalacion === "empotrado" ? margen_tapeta_mm * k : 0;
  const acab = ACABADOS[acabado];

  return (
    <>
      {showFloor ? (
        <Grid
          position={[0, -0.001, 0]}
          args={[20, 20]}
          cellSize={0.1}
          cellThickness={0.4}
          cellColor="#c4c4c8"
          sectionSize={1}
          sectionThickness={1}
          sectionColor="#8b8b93"
          fadeDistance={25}
          fadeStrength={1.5}
          infiniteGrid
        />
      ) : null}

      {/* Hueco empotrado */}
      {tipo_instalacion === "empotrado" && margen > 0 ? (
        <mesh position={[W / 2, H / 2, D / 2 - 0.005]}>
          <boxGeometry args={[W + 2 * margen, H + 2 * margen, D + margen]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.04} />
          <Edges color="#f59e0b" lineWidth={1.5} />
        </mesh>
      ) : null}

      {/* Bounding armario */}
      <mesh position={[W / 2, H / 2, D / 2]}>
        <boxGeometry args={[W, H, D]} />
        <meshBasicMaterial color="#18181b" transparent opacity={0.02} />
        <Edges color="#27272a" lineWidth={1.5} />
      </mesh>

      {modulos.map((m) => (
        <ModuloMesh
          key={m.id}
          modulo={m}
          otrosModulos={modulos.filter((x) => x.id !== m.id)}
          armarioAnchoMm={armario_ancho_mm}
          armarioAltoMm={armario_alto_mm}
          color={acab.base}
          k={k}
          H={H}
          D={D}
          isSelected={selectedId === m.id}
          onClick={() => onSelect(m.id === selectedId ? null : m.id)}
          onMoveEnd={(xmm, ymm) => {
            start(() => {
              onMove(m.id, xmm, ymm).catch((err) => {
                toast.error(err instanceof Error ? err.message : "Error");
              });
            });
          }}
        />
      ))}

      {showControls ? (
        <OrbitControls
          enableDamping
          dampingFactor={0.1}
          target={[W / 2, H / 2, D / 2]}
          minDistance={1}
          maxDistance={25}
        />
      ) : null}
    </>
  );
}

/** Wrapper con Canvas + iluminación. Usado en el editor principal. */
export function Armario3DPro(props: Props) {
  const k = 0.001;
  const W = props.armario_ancho_mm * k;
  const H = props.armario_alto_mm * k;
  const D = props.armario_fondo_mm * k;
  const diagonal = Math.sqrt(W * W + H * H + D * D);
  const camDist = Math.max(2.5, diagonal * 1.5);

  return (
    <div className="relative">
      <div className="h-[560px] w-full overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-slate-100 via-white to-slate-200">
        <Canvas camera={{ position: [camDist, camDist * 0.7, camDist], fov: 35 }} dpr={[1, 1.5]}>
          <color attach="background" args={["#f4f4f5"]} />
          <ambientLight intensity={0.65} />
          <directionalLight position={[6, 10, 5]} intensity={1.0} />
          <directionalLight position={[-4, 6, -3]} intensity={0.3} />
          <Suspense fallback={null}>
            <ArmarioScene {...props} />
          </Suspense>
        </Canvas>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        💡 Click en un módulo para seleccionarlo · rueda para zoom · click-drag fondo para rotar.
      </p>
    </div>
  );
}

const SNAP_TOL_MM = 30;

function ModuloMesh({
  modulo,
  otrosModulos,
  armarioAnchoMm,
  armarioAltoMm,
  color,
  k,
  H,
  D,
  isSelected,
  onClick,
  onMoveEnd,
}: {
  modulo: ModuloPro;
  otrosModulos: ModuloPro[];
  armarioAnchoMm: number;
  armarioAltoMm: number;
  color: string;
  k: number;
  H: number;
  D: number;
  isSelected: boolean;
  onClick: () => void;
  onMoveEnd: (x_mm: number, y_mm: number) => void;
}) {
  const mw = modulo.ancho_mm * k;
  const mh = Math.min(modulo.alto_mm * k, H);
  const md = Math.min(modulo.fondo_mm * k, D);
  const px = modulo.posicion_x_mm * k;
  const py = modulo.posicion_y_mm * k;

  void armarioAnchoMm;
  void armarioAltoMm;
  void otrosModulos;
  void onMoveEnd;
  void SNAP_TOL_MM;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onClick();
  };

  const bodyColor = isSelected ? COLOR_SEL : (modulo.color || color);
  const ringColor = isSelected ? "#c2410c" : "#1e1e22";

  return (
    <group position={[px, py, 0]}>
      <group position={[mw / 2, mh / 2, md / 2]} onClick={handleClick}>
        <mesh>
          <boxGeometry args={[mw, mh, md]} />
          <meshStandardMaterial
            color={bodyColor}
            roughness={0.55}
            metalness={0.05}
            emissive={isSelected ? COLOR_SEL : "#000000"}
            emissiveIntensity={isSelected ? 0.15 : 0}
          />
        </mesh>
        <Edges color={ringColor} lineWidth={isSelected ? 2.5 : 0.7} />

        {/* Particiones verticales */}
        {modulo.particiones > 1
          ? Array.from({ length: modulo.particiones - 1 }).map((_, i) => {
              const y = -mh / 2 + (mh / modulo.particiones) * (i + 1);
              return (
                <mesh key={i} position={[0, y, md / 2 + 0.001]}>
                  <boxGeometry args={[mw - 0.005, 0.003, 0.001]} />
                  <meshBasicMaterial color="#c2410c" />
                </mesh>
              );
            })
          : null}

        {/* LED rebaje */}
        {modulo.tiene_led_rebaje ? (
          <mesh position={[0, mh / 2 - 0.005, md / 2 - 0.003]}>
            <boxGeometry args={[mw - 0.005, 0.004, 0.004]} />
            <meshStandardMaterial
              color={modulo.led_color_hex ?? "#ffe066"}
              emissive={modulo.led_color_hex ?? "#ffe066"}
              emissiveIntensity={1.2}
            />
          </mesh>
        ) : null}

        {/* Subelementos */}
        <Subelementos modulo={modulo} mw={mw} mh={mh} md={md} />

        {/* Etiqueta DENTRO del módulo, en el frente */}
        <Text
          position={[0, 0, md / 2 + 0.002]}
          fontSize={Math.max(0.04, Math.min(0.08, mw * 0.2))}
          color={isSelected ? "#7c2d12" : "#1e1e22"}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.001}
          outlineColor="#ffffff"
        >
          {modulo.nombre}
        </Text>
      </group>
    </group>
  );
}

function Subelementos({
  modulo,
  mw,
  mh,
  md,
}: {
  modulo: ModuloPro;
  mw: number;
  mh: number;
  md: number;
}) {
  const k = 0.001;
  // Auto-generar cajones si es cajonera y no tiene subelementos
  const sub = useMemo(() => {
    if (modulo.subelementos.length > 0) return modulo.subelementos;
    const cat = (modulo.categoria ?? "").toLowerCase();
    if (cat.includes("cajonera") || cat.includes("cajon")) {
      const n = 4;
      const alto = Math.round(modulo.alto_mm / n);
      return Array.from({ length: n }).map((_, i) => ({
        id: `v-${i}`,
        empresa_id: "",
        modulo_id: modulo.id,
        tipo: "cajon" as TipoSubelemento,
        orden: i,
        alto_mm: alto,
        ancho_mm: null,
        offset_x_mm: 0,
        offset_y_mm: 0,
        offset_z_mm: 0,
        config: {},
        etiqueta: null,
        created_at: "",
        updated_at: "",
      }));
    }
    return [];
  }, [modulo]);

  const interior = sub.filter((s) =>
    ["cajon", "balda_fija", "balda_regulable", "barra_colgar"].includes(s.tipo),
  );
  if (interior.length === 0) return null;

  const totalDefinido = interior.reduce((a, s) => a + (s.alto_mm ?? 0), 0);
  const libre = Math.max(0, modulo.alto_mm - totalDefinido);
  const indefinidos = interior.filter((s) => !s.alto_mm).length;
  const altoAuto = indefinidos > 0 ? libre / indefinidos : 0;

  let yAcum = 0;
  return (
    <>
      {[...interior]
        .sort((a, b) => a.orden - b.orden)
        .map((s) => {
          const altoMm = s.alto_mm && s.alto_mm > 0 ? s.alto_mm : altoAuto;
          const altoM = altoMm * k;
          const yC = -mh / 2 + yAcum * k + altoM / 2;
          yAcum += altoMm;
          const meta = SUBELEMENTOS_META[s.tipo];
          const col = meta?.color ?? "#a07855";

          if (s.tipo === "cajon") {
            return (
              <group key={s.id} position={[0, yC, 0]}>
                <mesh position={[0, 0, md / 2 - 0.005]}>
                  <boxGeometry args={[mw * 0.94, altoM * 0.88, 0.016]} />
                  <meshStandardMaterial color={col} roughness={0.45} />
                  <Edges color="#2a2420" lineWidth={0.7} />
                </mesh>
                <mesh position={[0, altoM * 0.28, md / 2 + 0.006]}>
                  <boxGeometry args={[mw * 0.55, 0.014, 0.008]} />
                  <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.3} />
                </mesh>
              </group>
            );
          }
          if (s.tipo === "balda_fija" || s.tipo === "balda_regulable") {
            return (
              <mesh key={s.id} position={[0, yC - altoM / 2 + 0.009, 0]}>
                <boxGeometry args={[mw * 0.98, 0.018, md * 0.92]} />
                <meshStandardMaterial color={col} roughness={0.5} />
                <Edges color="#332e29" lineWidth={0.6} />
              </mesh>
            );
          }
          if (s.tipo === "barra_colgar") {
            return (
              <mesh key={s.id} position={[0, yC, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.012, 0.012, mw * 0.9, 12]} />
                <meshStandardMaterial color="#9ca3af" metalness={0.7} roughness={0.25} />
              </mesh>
            );
          }
          return null;
        })}
    </>
  );
}
