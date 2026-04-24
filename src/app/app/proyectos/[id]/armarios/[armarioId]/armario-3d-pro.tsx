"use client";

import { Canvas, type ThreeEvent } from "@react-three/fiber";
import {
  OrbitControls,
  Grid,
  Edges,
  Text,
  Environment,
  ContactShadows,
  PivotControls,
  Html,
} from "@react-three/drei";
import { Suspense, useMemo, useState, useTransition, useRef } from "react";
import { toast } from "sonner";
import type { Matrix4 } from "three";
import { SUBELEMENTOS_META, type ModuloSubelemento, type TipoSubelemento } from "@/lib/tipos/proyectos";
import { getMaterialPropsAcabado, type AcabadoKey } from "@/lib/render/materiales";

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

export function Armario3DPro({
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
}: Props) {
  const [dragging, setDragging] = useState(false);
  const [, start] = useTransition();

  const k = 0.001;
  const W = armario_ancho_mm * k;
  const H = armario_alto_mm * k;
  const D = armario_fondo_mm * k;
  const margen = tipo_instalacion === "empotrado" ? margen_tapeta_mm * k : 0;
  const diagonal = Math.sqrt(W * W + H * H + D * D);
  const camDist = Math.max(2.5, diagonal * 1.5);

  return (
    <div className="relative">
      <div className="h-[620px] w-full overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-muted/40 via-background to-muted/60 shadow-inner">
        <Canvas
          shadows
          camera={{ position: [camDist, camDist * 0.7, camDist], fov: 35 }}
          dpr={[1, 2]}
        >
          <color attach="background" args={["#f4f4f5"]} />
          <fog attach="fog" args={["#f4f4f5", 12, 40]} />

          {/* Iluminación tipo showroom */}
          <ambientLight intensity={0.45} />
          <directionalLight
            position={[6, 10, 5]}
            intensity={1.1}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-bias={-0.0005}
          />
          <directionalLight position={[-4, 6, -3]} intensity={0.35} />
          <pointLight position={[W / 2, H + 0.5, D / 2]} intensity={0.4} color="#fff5e0" />

          <Suspense fallback={null}>
            <Environment preset="apartment" background={false} />

            <Grid
              position={[0, -0.001, 0]}
              args={[40, 40]}
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

            <ContactShadows
              position={[W / 2, 0, D / 2]}
              opacity={0.45}
              scale={Math.max(W, D) * 4}
              blur={2.2}
              far={H + 1}
              resolution={512}
              color="#1f1f22"
            />

            {/* Hueco empotrado */}
            {tipo_instalacion === "empotrado" && margen > 0 ? (
              <mesh position={[W / 2, H / 2, D / 2 - 0.005]}>
                <boxGeometry args={[W + 2 * margen, H + 2 * margen, D + margen]} />
                <meshStandardMaterial color="#f59e0b" transparent opacity={0.04} />
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
                acabado={acabado}
                k={k}
                H={H}
                D={D}
                isSelected={selectedId === m.id}
                onClick={() => onSelect(m.id === selectedId ? null : m.id)}
                onMoveEnd={(xmm, ymm) => {
                  setDragging(false);
                  start(() => {
                    onMove(m.id, xmm, ymm).catch((err) => {
                      toast.error(err instanceof Error ? err.message : "Error al mover módulo");
                    });
                  });
                }}
                onDragStart={() => setDragging(true)}
              />
            ))}

            <OrbitControls
              enableDamping
              dampingFactor={0.1}
              target={[W / 2, H / 2, D / 2]}
              minDistance={1}
              maxDistance={25}
              enableRotate={!dragging}
              enablePan={!dragging}
              enableZoom={!dragging}
            />
          </Suspense>
        </Canvas>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        💡 Click sobre un módulo para seleccionar · arrastra las flechas del pivote para mover horizontal/vertical dentro del armario · rueda para zoom · click-drag vacío para rotar.
      </p>
    </div>
  );
}

const SNAP_TOL_MM = 30; // tolerancia de magnetismo al borde / módulo vecino

/**
 * Genera subelementos visuales automáticos cuando el módulo no tiene definidos.
 * Por categoría del tipo_modulo. NO persisten: solo para render 3D.
 */
function autogenerarSubelementos(modulo: ModuloPro): ModuloSubelemento[] {
  const empty = {
    id: "virtual",
    empresa_id: "",
    modulo_id: modulo.id,
    offset_x_mm: 0,
    offset_y_mm: 0,
    offset_z_mm: 0,
    config: {},
    etiqueta: null,
    ancho_mm: null,
    created_at: "",
    updated_at: "",
  };
  const cat = (modulo.categoria ?? "").toLowerCase();

  if (cat.includes("cajonera") || cat.includes("cajon")) {
    // 4 cajones iguales si no sabemos nada
    const n = 4;
    const alto = Math.round(modulo.alto_mm / n);
    return Array.from({ length: n }).map((_, i) => ({
      ...empty,
      id: `virtual-cajon-${i}`,
      tipo: "cajon" as const,
      orden: i,
      alto_mm: alto,
    }));
  }
  if (cat.includes("zapatero")) {
    const alturas = [180, 180, 180, 180];
    return alturas.map((a, i) => ({
      ...empty,
      id: `virtual-zap-${i}`,
      tipo: "balda_fija" as const,
      orden: i,
      alto_mm: a,
    }));
  }
  if (cat.includes("colgador") || cat.includes("colgar")) {
    return [
      { ...empty, id: "virtual-barra", tipo: "barra_colgar", orden: 0, alto_mm: Math.round(modulo.alto_mm * 0.85) },
      { ...empty, id: "virtual-balda-sup", tipo: "balda_fija", orden: 1, alto_mm: Math.round(modulo.alto_mm * 0.15) },
    ];
  }
  if (cat.includes("estanter") || cat.includes("balda")) {
    const n = 5;
    const alto = Math.round(modulo.alto_mm / n);
    return Array.from({ length: n }).map((_, i) => ({
      ...empty,
      id: `virtual-balda-${i}`,
      tipo: "balda_fija" as const,
      orden: i,
      alto_mm: alto,
    }));
  }
  return [];
}

function ModuloMesh({
  modulo,
  otrosModulos,
  armarioAnchoMm,
  armarioAltoMm,
  acabado,
  k,
  H,
  D,
  isSelected,
  onClick,
  onMoveEnd,
  onDragStart,
}: {
  modulo: ModuloPro;
  otrosModulos: ModuloPro[];
  armarioAnchoMm: number;
  armarioAltoMm: number;
  acabado: AcabadoKey;
  k: number;
  H: number;
  D: number;
  isSelected: boolean;
  onClick: () => void;
  onMoveEnd: (x_mm: number, y_mm: number) => void;
  onDragStart: () => void;
}) {
  const mw = modulo.ancho_mm * k;
  const mh = Math.min(modulo.alto_mm * k, H);
  const md = Math.min(modulo.fondo_mm * k, D);
  const px = modulo.posicion_x_mm * k;
  const py = modulo.posicion_y_mm * k;

  const finalPos = useRef({ x: modulo.posicion_x_mm, y: modulo.posicion_y_mm });

  // Calcula snap sobre el valor bruto
  function snapX(xmm: number): number {
    const anchoMax = Math.max(0, armarioAnchoMm - modulo.ancho_mm);
    let out = Math.max(0, Math.min(anchoMax, xmm));
    // Snap al borde izquierdo
    if (out < SNAP_TOL_MM) out = 0;
    // Snap al borde derecho
    if (anchoMax - out < SNAP_TOL_MM) out = anchoMax;
    // Snap a módulos vecinos: borde derecho del vecino = inicio del actual
    for (const o of otrosModulos) {
      const oDerecha = o.posicion_x_mm + o.ancho_mm;
      const oIzquierda = o.posicion_x_mm;
      if (Math.abs(out - oDerecha) < SNAP_TOL_MM) out = oDerecha;
      if (Math.abs(out + modulo.ancho_mm - oIzquierda) < SNAP_TOL_MM)
        out = oIzquierda - modulo.ancho_mm;
    }
    return Math.max(0, Math.min(anchoMax, Math.round(out)));
  }

  function snapY(ymm: number): number {
    const altoMax = Math.max(0, armarioAltoMm - modulo.alto_mm);
    let out = Math.max(0, Math.min(altoMax, ymm));
    if (out < SNAP_TOL_MM) out = 0;
    if (altoMax - out < SNAP_TOL_MM) out = altoMax;
    for (const o of otrosModulos) {
      const oSuperior = o.posicion_y_mm + o.alto_mm;
      const oInferior = o.posicion_y_mm;
      if (Math.abs(out - oSuperior) < SNAP_TOL_MM) out = oSuperior;
      if (Math.abs(out + modulo.alto_mm - oInferior) < SNAP_TOL_MM)
        out = oInferior - modulo.alto_mm;
    }
    return Math.max(0, Math.min(altoMax, Math.round(out)));
  }

  const onDrag = (_l: Matrix4, _dl: Matrix4, w: Matrix4) => {
    const elements = w.elements;
    const tx = elements[12];
    const ty = elements[13];
    finalPos.current.x = snapX(Math.round(tx * 1000));
    finalPos.current.y = snapY(Math.round(ty * 1000));
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onClick();
  };

  const contents = (
    <group position={[mw / 2, mh / 2, md / 2]}>
      <ModuloBody
        modulo={modulo}
        mw={mw}
        mh={mh}
        md={md}
        acabado={acabado}
        isSelected={isSelected}
        onClick={handleClick}
      />
    </group>
  );

  if (isSelected) {
    return (
      <PivotControls
        offset={[px, py, 0]}
        activeAxes={[true, true, false]}
        depthTest={false}
        lineWidth={2.5}
        axisColors={["#f97316", "#10b981", "#ef4444"]}
        scale={Math.max(mw, mh) * 0.7}
        anchor={[0, 0, 0]}
        onDragStart={onDragStart}
        onDrag={onDrag}
        onDragEnd={() => onMoveEnd(finalPos.current.x, finalPos.current.y)}
      >
        {contents}
      </PivotControls>
    );
  }

  return <group position={[px, py, 0]}>{contents}</group>;
}

function ModuloBody({
  modulo,
  mw,
  mh,
  md,
  acabado,
  isSelected,
  onClick,
}: {
  modulo: ModuloPro;
  mw: number;
  mh: number;
  md: number;
  acabado: AcabadoKey;
  isSelected: boolean;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
}) {
  const areaM2 = (modulo.ancho_mm * modulo.alto_mm) / 1_000_000;
  const matProps = getMaterialPropsAcabado(acabado, { respetaVeta: true, area_m2: areaM2 });

  return (
    <group onClick={onClick}>
      {/* Caja del módulo con textura y clearcoat */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[mw, mh, md]} />
        <meshPhysicalMaterial
          map={matProps.map ?? null}
          color={matProps.color}
          roughness={matProps.roughness}
          metalness={matProps.metalness}
          clearcoat={matProps.clearcoat}
          clearcoatRoughness={matProps.clearcoatRoughness}
          emissive={isSelected ? COLOR_SEL : "#000000"}
          emissiveIntensity={isSelected ? 0.15 : 0}
        />
      </mesh>
      <Edges color={isSelected ? "#c2410c" : "#1e1e22"} lineWidth={isSelected ? 2.5 : 0.5} />

      {/* Particiones verticales (horizontales visuales) */}
      {modulo.particiones > 1
        ? Array.from({ length: modulo.particiones - 1 }).map((_, i) => {
            const y = -mh / 2 + (mh / modulo.particiones) * (i + 1);
            return (
              <mesh key={i} position={[0, y, md / 2 + 0.0005]}>
                <boxGeometry args={[mw - 0.004, 0.003, 0.001]} />
                <meshBasicMaterial color="#c2410c" />
              </mesh>
            );
          })
        : null}

      {/* LED rebaje perimetral */}
      {modulo.tiene_led_rebaje ? (
        <LedPerimetral mw={mw} mh={mh} md={md} color={modulo.led_color_hex ?? "#ffe066"} />
      ) : null}

      {/* Subelementos */}
      <SubelementosLayer modulo={modulo} mw={mw} mh={mh} md={md} />

      {/* Etiqueta DENTRO del módulo (billboard, profundidad off para no chocar) */}
      <Html
        position={[0, 0, md / 2 + 0.001]}
        center
        distanceFactor={Math.max(1.2, mw * 2.5)}
        occlude={false}
        transform={false}
        zIndexRange={[0, 10]}
      >
        <div
          className="pointer-events-none select-none rounded px-1.5 py-0.5 text-center font-semibold tracking-tight"
          style={{
            fontSize: `${Math.max(8, Math.min(14, mw * 22))}px`,
            color: isSelected ? "#7c2d12" : "#1e1e22",
            textShadow: "0 1px 2px rgba(255,255,255,0.8)",
          }}
        >
          {modulo.nombre}
          <div className="text-[10px] opacity-70 font-mono">
            {modulo.ancho_mm}×{modulo.alto_mm}×{modulo.fondo_mm}
          </div>
        </div>
      </Html>
    </group>
  );
}

/** Tira LED perimetral roja/ámbar con emissive */
function LedPerimetral({ mw, mh, md, color }: { mw: number; mh: number; md: number; color: string }) {
  // Ilumina el canto delantero superior
  return (
    <group position={[0, mh / 2 - 0.005, md / 2 - 0.003]}>
      <mesh>
        <boxGeometry args={[mw - 0.005, 0.004, 0.004]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.2}
          roughness={0.2}
        />
      </mesh>
      <pointLight position={[0, -0.05, 0.1]} intensity={0.25} color={color} distance={mw} />
    </group>
  );
}

function SubelementosLayer({
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
  // Agrupar por tipo
  const k = 0.001;

  // Si es un tipo cajonera/zapatero/estanteria y NO tiene subelementos definidos,
  // generamos virtuales para que el 3D muestre algo útil en vez de un cubo.
  let sub = modulo.subelementos;
  if (sub.length === 0 && modulo.categoria) {
    sub = autogenerarSubelementos(modulo);
  }

  const interior = sub.filter((s) =>
    ["cajon", "balda_fija", "balda_regulable", "barra_colgar", "hueco_abierto"].includes(s.tipo),
  );
  const frentes = sub.filter((s) =>
    ["puerta_abatible", "puerta_corredera", "puerta_plegable", "tapeta_ciega", "espejo"].includes(s.tipo),
  );
  const complementos = sub.filter((s) =>
    ["zapatero", "cesto_extraible", "corbatero", "joyero", "portapantalones", "canaleta_tirador"].includes(s.tipo),
  );

  // INTERIOR: apilar de abajo a arriba usando alto_mm; si null, distribuir el resto
  const interiorItems = useMemo(() => {
    const totalDefinido = interior
      .filter((s) => s.alto_mm && s.alto_mm > 0)
      .reduce((a, s) => a + (s.alto_mm ?? 0), 0);
    const indefinidos = interior.filter((s) => !s.alto_mm || s.alto_mm <= 0);
    const libre = Math.max(0, modulo.alto_mm - totalDefinido);
    const altoAuto = indefinidos.length > 0 ? libre / indefinidos.length : 0;
    const ordered = [...interior].sort((a, b) => a.orden - b.orden);
    let y = 0;
    return ordered.map((s) => {
      const altoMm = s.alto_mm && s.alto_mm > 0 ? s.alto_mm : altoAuto;
      const item = { s, yStart: y, alto: altoMm };
      y += altoMm;
      return item;
    });
  }, [interior, modulo.alto_mm]);

  return (
    <>
      {/* INTERIOR horizontal */}
      {interiorItems.map(({ s, yStart, alto }) => (
        <SubelementoInterior
          key={s.id}
          tipo={s.tipo}
          color={SUBELEMENTOS_META[s.tipo]?.color ?? "#888"}
          mw={mw}
          md={md}
          yStart={yStart * k}
          alto={alto * k}
          mh={mh}
          label={s.etiqueta ?? SUBELEMENTOS_META[s.tipo]?.label}
        />
      ))}

      {/* FRENTES */}
      {frentes.length > 0 ? (
        <SubelementoFrentes subelementos={frentes} mw={mw} mh={mh} md={md} />
      ) : null}

      {/* COMPLEMENTOS */}
      {complementos.map((s) => (
        <SubelementoComplemento key={s.id} sub={s} mw={mw} mh={mh} md={md} />
      ))}
    </>
  );
}

function SubelementoInterior({
  tipo,
  color,
  mw,
  md,
  yStart,
  alto,
  mh,
  label,
}: {
  tipo: TipoSubelemento;
  color: string;
  mw: number;
  md: number;
  yStart: number;
  alto: number;
  mh: number;
  label?: string;
}) {
  const yCenter = -mh / 2 + yStart + alto / 2;

  if (tipo === "cajon") {
    return (
      <group position={[0, yCenter, 0]}>
        {/* Cuerpo cajón ligeramente retirado para ver frente */}
        <mesh>
          <boxGeometry args={[mw * 0.94, alto * 0.85, md * 0.85]} />
          <meshStandardMaterial color={color} roughness={0.55} />
        </mesh>
        <Edges color="#2e2a26" lineWidth={1} />
        {/* Frente del cajón (panel delantero saliente) */}
        <mesh position={[0, 0, md / 2 - 0.004]}>
          <boxGeometry args={[mw * 0.98, alto * 0.92, 0.016]} />
          <meshStandardMaterial color={color} roughness={0.35} metalness={0.08} />
          <Edges color="#332e29" lineWidth={0.8} />
        </mesh>
        {/* Tirador lineal */}
        <mesh position={[0, alto * 0.35, md / 2 + 0.006]}>
          <boxGeometry args={[mw * 0.6, 0.015, 0.008]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.3} />
        </mesh>
        <InteriorLabel label={label} md={md} alto={alto} />
      </group>
    );
  }

  if (tipo === "balda_fija" || tipo === "balda_regulable") {
    // Placa horizontal delgada (18 mm)
    return (
      <group position={[0, yCenter, 0]}>
        <mesh position={[0, -alto / 2 + 0.009, 0]}>
          <boxGeometry args={[mw * 0.98, 0.018, md * 0.92]} />
          <meshStandardMaterial color={color} roughness={0.5} />
          <Edges color="#332e29" lineWidth={0.6} />
        </mesh>
        {tipo === "balda_regulable" ? (
          <>
            <mesh position={[-mw * 0.45, -alto / 2 + 0.02, md * 0.35]}>
              <cylinderGeometry args={[0.003, 0.003, 0.01, 8]} />
              <meshStandardMaterial color="#888" metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh position={[mw * 0.45, -alto / 2 + 0.02, md * 0.35]}>
              <cylinderGeometry args={[0.003, 0.003, 0.01, 8]} />
              <meshStandardMaterial color="#888" metalness={0.7} roughness={0.3} />
            </mesh>
          </>
        ) : null}
        <InteriorLabel label={label} md={md} alto={0.02} offset={alto / 2} />
      </group>
    );
  }

  if (tipo === "barra_colgar") {
    // Cilindro horizontal
    return (
      <group position={[0, yCenter, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.013, 0.013, mw * 0.9, 16]} />
          <meshStandardMaterial color="#9ca3af" metalness={0.7} roughness={0.25} />
        </mesh>
        {/* Soportes */}
        <mesh position={[-mw * 0.42, 0, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.02, 12]} />
          <meshStandardMaterial color="#4b5563" />
        </mesh>
        <mesh position={[mw * 0.42, 0, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.02, 12]} />
          <meshStandardMaterial color="#4b5563" />
        </mesh>
        <InteriorLabel label={label} md={md} alto={alto} />
      </group>
    );
  }

  // hueco_abierto → no render
  return null;
}

function SubelementoFrentes({
  subelementos,
  mw,
  mh,
  md,
}: {
  subelementos: ModuloSubelemento[];
  mw: number;
  mh: number;
  md: number;
}) {
  const k = 0.001;
  // Reparto: por defecto 1 puerta ocupa todo. 2 = mitades. Correderas ligeramente separadas en Z.
  const orderd = [...subelementos].sort((a, b) => a.orden - b.orden);
  const unidades = orderd.length;

  return (
    <>
      {orderd.map((s, i) => {
        const color = SUBELEMENTOS_META[s.tipo]?.color ?? "#333";
        const w = s.ancho_mm && s.ancho_mm > 0 ? s.ancho_mm * k : mw / unidades;
        const h = s.alto_mm && s.alto_mm > 0 ? s.alto_mm * k : mh;
        const xCenter = -mw / 2 + w * (i + 0.5);
        const zOffset =
          s.tipo === "puerta_corredera" ? (i % 2 === 0 ? 0.012 : 0.028) : 0.004;
        const espejo = s.tipo === "espejo";

        return (
          <group key={s.id} position={[xCenter, 0, md / 2 + zOffset]}>
            <mesh>
              <boxGeometry args={[w * 0.97, h * 0.97, 0.018]} />
              <meshStandardMaterial
                color={color}
                metalness={espejo ? 0.85 : 0.1}
                roughness={espejo ? 0.1 : 0.45}
                envMapIntensity={espejo ? 1.8 : 0.6}
              />
              <Edges color="#0f0f12" lineWidth={0.7} />
            </mesh>
            {/* Tirador */}
            {s.tipo === "puerta_abatible" || s.tipo === "puerta_plegable" ? (
              <mesh position={[w * 0.35, 0, 0.012]}>
                <boxGeometry args={[0.012, h * 0.3, 0.014]} />
                <meshStandardMaterial color="#27272a" metalness={0.7} roughness={0.3} />
              </mesh>
            ) : null}
            {/* Bisagra visual */}
            {s.tipo === "puerta_abatible" ? (
              <>
                <mesh position={[-w * 0.45, h * 0.3, 0.012]}>
                  <cylinderGeometry args={[0.005, 0.005, 0.02, 10]} />
                  <meshStandardMaterial color="#52525b" metalness={0.7} />
                </mesh>
                <mesh position={[-w * 0.45, -h * 0.3, 0.012]}>
                  <cylinderGeometry args={[0.005, 0.005, 0.02, 10]} />
                  <meshStandardMaterial color="#52525b" metalness={0.7} />
                </mesh>
              </>
            ) : null}
          </group>
        );
      })}
    </>
  );
}

function SubelementoComplemento({
  sub,
  mw,
  mh,
  md,
}: {
  sub: ModuloSubelemento;
  mw: number;
  mh: number;
  md: number;
}) {
  const k = 0.001;
  const color = SUBELEMENTOS_META[sub.tipo]?.color ?? "#888";
  const yOff = (sub.offset_y_mm * k) - mh / 2;
  const alto = (sub.alto_mm ?? 120) * k;

  if (sub.tipo === "zapatero") {
    return (
      <group position={[0, yOff + alto / 2, md / 2 - 0.05]}>
        <mesh rotation={[0.25, 0, 0]}>
          <boxGeometry args={[mw * 0.95, 0.02, md * 0.75]} />
          <meshStandardMaterial color={color} roughness={0.5} />
          <Edges color="#332e29" lineWidth={0.7} />
        </mesh>
      </group>
    );
  }
  if (sub.tipo === "cesto_extraible") {
    return (
      <group position={[0, yOff + alto / 2, 0]}>
        <mesh>
          <boxGeometry args={[mw * 0.9, alto * 0.9, md * 0.85]} />
          <meshStandardMaterial color={color} metalness={0.4} roughness={0.35} wireframe />
        </mesh>
      </group>
    );
  }
  if (sub.tipo === "corbatero" || sub.tipo === "portapantalones") {
    return (
      <group position={[mw / 2 - 0.04, yOff + alto / 2, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.008, 0.008, alto * 0.8, 12]} />
          <meshStandardMaterial color={color} metalness={0.6} />
        </mesh>
      </group>
    );
  }
  if (sub.tipo === "joyero") {
    return (
      <group position={[0, yOff + alto / 2, 0]}>
        <mesh>
          <boxGeometry args={[mw * 0.85, alto * 0.7, md * 0.6]} />
          <meshStandardMaterial color={color} roughness={0.5} />
          <Edges color="#332e29" lineWidth={0.7} />
        </mesh>
      </group>
    );
  }
  if (sub.tipo === "canaleta_tirador") {
    return (
      <mesh position={[0, mh / 2 - 0.005, md / 2 + 0.003]}>
        <boxGeometry args={[mw * 0.95, 0.018, 0.008]} />
        <meshStandardMaterial color="#27272a" metalness={0.8} roughness={0.2} />
      </mesh>
    );
  }
  return null;
}

function InteriorLabel({
  label,
  md,
  alto,
  offset = 0,
}: {
  label?: string;
  md: number;
  alto: number;
  offset?: number;
}) {
  if (!label) return null;
  return (
    <Text
      position={[0, offset, md / 2 - 0.005]}
      fontSize={Math.max(0.025, Math.min(0.05, alto * 0.35))}
      color="#1f1f22"
      anchorX="center"
      anchorY="middle"
      material-depthTest={false}
      renderOrder={10}
    >
      {label}
    </Text>
  );
}
