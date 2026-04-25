"use client";

import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Grid, Edges, Text } from "@react-three/drei";
import { Suspense, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { SUBELEMENTOS_META, type ModuloSubelemento } from "@/lib/tipos/proyectos";
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
  tableros_grosor_mm?: number | null;
  trasera_grosor_mm?: number | null;
  separacion_cajones_mm?: number;
  mostrar_puertas?: boolean;
  grosor_tablero_default_mm?: number; // Viene de referencia_tablero_id
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
const TRASERA_DEFAULT_MM = 10;
const GROSOR_DEFAULT_MM = 16;

/** Contenido 3D puro (sin Canvas). */
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
          <Edges color="#f59e0b" lineWidth={1.2} />
        </mesh>
      ) : null}

      {/* Bounding wireframe ligero del armario */}
      <mesh position={[W / 2, H / 2, D / 2]}>
        <boxGeometry args={[W, H, D]} />
        <meshBasicMaterial color="#18181b" transparent opacity={0.01} />
        <Edges color="#27272a" lineWidth={0.8} />
      </mesh>

      {modulos.map((m) => (
        <ModuloMesh
          key={m.id}
          modulo={m}
          colorAcabado={acab.base}
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

/** Wrapper con Canvas + iluminación. */
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
        <Canvas
          camera={{ position: [camDist, camDist * 0.7, camDist], fov: 35 }}
          dpr={[1, 1.5]}
          gl={{ powerPreference: "low-power", antialias: true, preserveDrawingBuffer: false }}
          onCreated={({ gl }) => {
            // Listener para context loss: recargar el componente si el navegador mata el contexto WebGL
            const canvas = gl.domElement;
            canvas.addEventListener("webglcontextlost", (e) => {
              e.preventDefault();
              console.warn("WebGL perdió el contexto — recarga la página si no se restaura");
            });
          }}
        >
          <color attach="background" args={["#f5f5f5"]} />
          <ambientLight intensity={0.7} />
          <directionalLight position={[6, 10, 5]} intensity={1.0} />
          <directionalLight position={[-4, 6, -3]} intensity={0.3} />
          <Suspense fallback={null}>
            <ArmarioScene {...props} />
          </Suspense>
        </Canvas>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        💡 Click en un módulo para seleccionar · rueda para zoom · click-drag para rotar. Los
        cajones con <strong>proveedor externo</strong> se muestran con borde punteado.
      </p>
    </div>
  );
}

/**
 * Un módulo se renderiza como 6 tableros separados con grosor real, más subelementos internos
 * (cajones, baldas, barras) y puertas opcionales.
 */
function ModuloMesh({
  modulo,
  colorAcabado,
  k,
  H,
  D,
  isSelected,
  onClick,
  onMoveEnd,
}: {
  modulo: ModuloPro;
  colorAcabado: string;
  k: number;
  H: number;
  D: number;
  isSelected: boolean;
  onClick: () => void;
  onMoveEnd: (x_mm: number, y_mm: number) => void;
}) {
  void onMoveEnd;

  const mw = modulo.ancho_mm * k;
  const mh = Math.min(modulo.alto_mm * k, H);
  const md = Math.min(modulo.fondo_mm * k, D);
  const px = modulo.posicion_x_mm * k;
  const py = modulo.posicion_y_mm * k;

  const gMm = modulo.tableros_grosor_mm ?? modulo.grosor_tablero_default_mm ?? GROSOR_DEFAULT_MM;
  const trMm = modulo.trasera_grosor_mm ?? TRASERA_DEFAULT_MM;
  const g = gMm * k;
  const tr = trMm * k;

  // Medidas interiores (dentro de los tableros)
  const mwInt = Math.max(0.02, mw - 2 * g);
  const mhInt = Math.max(0.02, mh - 2 * g);
  const mdInt = Math.max(0.02, md - tr);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onClick();
  };

  const tableroColor = isSelected ? COLOR_SEL : modulo.color || colorAcabado;
  const edgeColor = isSelected ? "#c2410c" : "#2e2a26";
  const edgeWidth = isSelected ? 2.0 : 0.5;

  return (
    <group position={[px, py, 0]}>
      <group position={[mw / 2, mh / 2, md / 2]} onClick={handleClick}>
        {/* SUELO */}
        <TableroMesh
          size={[mw, g, md]}
          position={[0, -mh / 2 + g / 2, 0]}
          color={tableroColor}
          edgeColor={edgeColor}
          edgeWidth={edgeWidth}
        />
        {/* TECHO */}
        <TableroMesh
          size={[mw, g, md]}
          position={[0, mh / 2 - g / 2, 0]}
          color={tableroColor}
          edgeColor={edgeColor}
          edgeWidth={edgeWidth}
        />
        {/* LATERAL IZQUIERDO */}
        <TableroMesh
          size={[g, mhInt, md]}
          position={[-mw / 2 + g / 2, 0, 0]}
          color={tableroColor}
          edgeColor={edgeColor}
          edgeWidth={edgeWidth}
        />
        {/* LATERAL DERECHO */}
        <TableroMesh
          size={[g, mhInt, md]}
          position={[mw / 2 - g / 2, 0, 0]}
          color={tableroColor}
          edgeColor={edgeColor}
          edgeWidth={edgeWidth}
        />
        {/* TRASERA (más fina) */}
        <TableroMesh
          size={[mwInt, mhInt, tr]}
          position={[0, 0, -md / 2 + tr / 2]}
          color={tableroColor}
          edgeColor={edgeColor}
          edgeWidth={edgeWidth}
        />

        {/* Particiones verticales: si particiones > 1, líneas horizontales indicativas */}
        {modulo.particiones > 1
          ? Array.from({ length: modulo.particiones - 1 }).map((_, i) => {
              const y = -mhInt / 2 + (mhInt / modulo.particiones) * (i + 1);
              return (
                <mesh key={i} position={[0, y, md / 2 - tr]}>
                  <boxGeometry args={[mwInt, 0.004, 0.002]} />
                  <meshBasicMaterial color="#c2410c" />
                </mesh>
              );
            })
          : null}

        {/* LED rebaje (en canto frontal superior) */}
        {modulo.tiene_led_rebaje ? (
          <mesh position={[0, mh / 2 - g - 0.006, md / 2 - 0.005]}>
            <boxGeometry args={[mwInt, 0.006, 0.006]} />
            <meshStandardMaterial
              color={modulo.led_color_hex ?? "#ffe066"}
              emissive={modulo.led_color_hex ?? "#ffe066"}
              emissiveIntensity={1.5}
            />
          </mesh>
        ) : null}

        {/* SUBELEMENTOS INTERIORES (cajones, baldas, barras, etc) */}
        <Subelementos
          modulo={modulo}
          mw={mw}
          mh={mh}
          md={md}
          g={g}
          tr={tr}
          mwInt={mwInt}
          mhInt={mhInt}
          mdInt={mdInt}
          tableroColor={tableroColor}
        />

        {/* PUERTAS (si hay, con toggle mostrar_puertas) */}
        {(modulo.mostrar_puertas ?? true) ? (
          <Puertas modulo={modulo} mw={mw} mh={mh} md={md} color={tableroColor} />
        ) : null}

        {/* Etiqueta nombre del módulo DENTRO en el frente */}
        <Text
          position={[0, 0, md / 2 - tr - 0.002]}
          fontSize={Math.max(0.04, Math.min(0.08, mw * 0.15))}
          color={isSelected ? "#7c2d12" : "#1e1e22"}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.002}
          outlineColor="#ffffff"
          maxWidth={mwInt * 0.9}
          textAlign="center"
        >
          {modulo.nombre}
        </Text>
      </group>
    </group>
  );
}

function TableroMesh({
  size,
  position,
  color,
  edgeColor,
  edgeWidth,
}: {
  size: [number, number, number];
  position: [number, number, number];
  color: string;
  edgeColor: string;
  edgeWidth: number;
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.55} metalness={0.04} />
      <Edges color={edgeColor} lineWidth={edgeWidth} />
    </mesh>
  );
}

function Subelementos({
  modulo,
  mw,
  mh,
  md,
  g,
  tr,
  mwInt,
  mhInt,
  mdInt,
  tableroColor,
}: {
  modulo: ModuloPro;
  mw: number;
  mh: number;
  md: number;
  g: number;
  tr: number;
  mwInt: number;
  mhInt: number;
  mdInt: number;
  tableroColor: string;
}) {
  const k = 0.001;
  void mw;
  void tr;

  // Sin auto-generado ficticio: el 3D muestra exactamente los subelementos reales.
  // Antes se generaban 4 cajones placeholder si la categoría contenía "cajonera", lo cual
  // hacía que Mario pidiese 3 y viese 4. Si no hay subelementos, el 3D deja el hueco vacío.
  const sub = modulo.subelementos;

  const interior = [...sub]
    .filter((s) =>
      ["cajon", "balda_fija", "balda_regulable", "barra_colgar", "hueco_abierto"].includes(s.tipo),
    )
    .sort((a, b) => a.orden - b.orden);

  if (interior.length === 0) return null;

  const sepMm = modulo.separacion_cajones_mm ?? 2;
  const sep = sepMm * k;

  // Calcular altos automáticamente para los que no tienen alto_mm
  const totalDefinido = interior.reduce((a, s) => a + (s.alto_mm ?? 0), 0);
  const libre = Math.max(0, modulo.alto_mm - totalDefinido);
  const indefinidos = interior.filter((s) => !s.alto_mm).length;
  const altoAutoMm = indefinidos > 0 ? libre / indefinidos : 0;

  // Espacio vertical interior disponible (entre suelo y techo del módulo)
  // yInt0 = -mhInt/2 (suelo interior), sube hacia arriba
  const elementos = interior.reduce<
    { sub: typeof interior[number]; idx: number; altoMm: number; yStartMm: number }[]
  >((acc, s, idx) => {
    const altoMm = s.alto_mm && s.alto_mm > 0 ? s.alto_mm : altoAutoMm;
    const yStart = acc.length === 0 ? 0 : acc[acc.length - 1].yStartMm + acc[acc.length - 1].altoMm;
    acc.push({ sub: s, idx, altoMm, yStartMm: yStart });
    return acc;
  }, []);

  return (
    <>
      {elementos.map(({ sub: s, altoMm, yStartMm }, idx) => {
        const altoM = altoMm * k;
        // yC es el centro del slot vertical, situado a -mhInt/2 + yStartM + altoM/2
        const yC = -mhInt / 2 + yStartMm * k + altoM / 2;

        if (s.tipo === "cajon") {
          return (
            <CajonMesh
              key={s.id}
              sub={s}
              yCenter={yC}
              altoSlot={altoM}
              mw={mw}
              md={md}
              g={g}
              sep={sep}
              mwInt={mwInt}
              mdInt={mdInt}
              tableroColor={tableroColor}
              isLast={idx === elementos.length - 1}
            />
          );
        }
        if (s.tipo === "balda_fija" || s.tipo === "balda_regulable") {
          // Balda: placa horizontal en la base del slot
          const yBalda = yC - altoM / 2 + g / 2;
          return (
            <group key={s.id}>
              <mesh position={[0, yBalda, 0]}>
                <boxGeometry args={[mwInt - 0.002, g, mdInt - 0.002]} />
                <meshStandardMaterial color={tableroColor} roughness={0.55} />
                <Edges color="#2a2420" lineWidth={0.4} />
              </mesh>
              {s.tipo === "balda_regulable" ? (
                <>
                  <mesh position={[-mwInt / 2 + 0.01, yBalda + g / 2 + 0.005, mdInt / 2 - 0.02]}>
                    <cylinderGeometry args={[0.003, 0.003, 0.01, 8]} />
                    <meshStandardMaterial color="#888" metalness={0.7} />
                  </mesh>
                  <mesh position={[mwInt / 2 - 0.01, yBalda + g / 2 + 0.005, mdInt / 2 - 0.02]}>
                    <cylinderGeometry args={[0.003, 0.003, 0.01, 8]} />
                    <meshStandardMaterial color="#888" metalness={0.7} />
                  </mesh>
                </>
              ) : null}
            </group>
          );
        }
        if (s.tipo === "barra_colgar") {
          // Cilindro horizontal centrado verticalmente
          return (
            <group key={s.id} position={[0, yC, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.012, 0.012, mwInt * 0.95, 14]} />
                <meshStandardMaterial color="#9ca3af" metalness={0.7} roughness={0.25} />
              </mesh>
              {/* Soportes */}
              <mesh position={[-mwInt / 2 + 0.008, 0, 0]}>
                <cylinderGeometry args={[0.013, 0.013, 0.02, 10]} />
                <meshStandardMaterial color="#4b5563" />
              </mesh>
              <mesh position={[mwInt / 2 - 0.008, 0, 0]}>
                <cylinderGeometry args={[0.013, 0.013, 0.02, 10]} />
                <meshStandardMaterial color="#4b5563" />
              </mesh>
            </group>
          );
        }
        return null;
      })}
    </>
  );
}

function CajonMesh({
  sub,
  yCenter,
  altoSlot,
  mw,
  md,
  g,
  sep,
  mwInt,
  mdInt,
  tableroColor,
  isLast,
}: {
  sub: ModuloSubelemento;
  yCenter: number;
  altoSlot: number;
  mw: number;
  md: number;
  g: number;
  sep: number;
  mwInt: number;
  mdInt: number;
  tableroColor: string;
  isLast: boolean;
}) {
  void isLast;
  void g;
  void mw;

  // Frente: ancho = ancho interior + g (sobresale los cantos), alto = altoSlot - sep (hueco entre cajones)
  const altoFrente = Math.max(0.04, altoSlot - sep);
  const anchoFrente = mwInt - 0.002;

  // Caja interior del cajón (costados y fondo)
  const anchoCaja = mwInt - 0.02;
  const altoCaja = altoFrente * 0.85;
  const fondoCaja = mdInt * 0.85;

  const esExterno = !sub.es_propio;
  const colorFrente = esExterno
    ? "#8b9ba8" // gris azulado para cajón externo
    : tableroColor;
  const colorCaja = esExterno ? "#c5cdd3" : tableroColor;

  return (
    <group position={[0, yCenter, 0]}>
      {/* Caja del cajón (contenedor interior) */}
      <group position={[0, 0, -fondoCaja / 2 + mdInt / 2 - 0.01]}>
        {/* Fondo del cajón */}
        <mesh position={[0, -altoCaja / 2 + 0.004, 0]}>
          <boxGeometry args={[anchoCaja, 0.008, fondoCaja]} />
          <meshStandardMaterial color={colorCaja} roughness={0.5} />
        </mesh>
        {/* Costados */}
        <mesh position={[-anchoCaja / 2 + 0.006, 0, 0]}>
          <boxGeometry args={[0.012, altoCaja, fondoCaja]} />
          <meshStandardMaterial color={colorCaja} roughness={0.55} />
        </mesh>
        <mesh position={[anchoCaja / 2 - 0.006, 0, 0]}>
          <boxGeometry args={[0.012, altoCaja, fondoCaja]} />
          <meshStandardMaterial color={colorCaja} roughness={0.55} />
        </mesh>
        {/* Trasera */}
        <mesh position={[0, 0, -fondoCaja / 2 + 0.004]}>
          <boxGeometry args={[anchoCaja - 0.024, altoCaja, 0.008]} />
          <meshStandardMaterial color={colorCaja} roughness={0.55} />
        </mesh>
        {/* Frente interior (opcional, la mayoría no tiene) */}
      </group>

      {/* FRENTE DEL CAJÓN — saliente del módulo */}
      <mesh position={[0, 0, md / 2 - 0.009]}>
        <boxGeometry args={[anchoFrente, altoFrente, 0.018]} />
        <meshStandardMaterial
          color={colorFrente}
          roughness={esExterno ? 0.4 : 0.35}
          metalness={esExterno ? 0.12 : 0.06}
        />
        <Edges
          color={esExterno ? "#475569" : "#332e29"}
          lineWidth={0.6}
        />
      </mesh>

      {/* Indicador visual de "cajón de proveedor": borde punteado */}
      {esExterno ? (
        <mesh position={[0, 0, md / 2 - 0.001]}>
          <boxGeometry args={[anchoFrente * 0.95, altoFrente * 0.95, 0.0005]} />
          <meshBasicMaterial color="#0284c7" transparent opacity={0.25} />
        </mesh>
      ) : null}

      {/* Tirador horizontal */}
      <mesh position={[0, altoFrente * 0.28, md / 2 + 0.005]}>
        <boxGeometry args={[anchoFrente * 0.55, 0.014, 0.01]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}

function Puertas({
  modulo,
  mw,
  mh,
  md,
  color,
}: {
  modulo: ModuloPro;
  mw: number;
  mh: number;
  md: number;
  color: string;
}) {
  const frentes = modulo.subelementos.filter((s) =>
    ["puerta_abatible", "puerta_corredera", "puerta_plegable", "tapeta_ciega", "espejo"].includes(s.tipo),
  );
  if (frentes.length === 0) return null;

  const ordenadas = [...frentes].sort((a, b) => a.orden - b.orden);
  const n = ordenadas.length;

  return (
    <>
      {ordenadas.map((s, i) => {
        const w = mw / n;
        const xC = -mw / 2 + w * (i + 0.5);
        const meta = SUBELEMENTOS_META[s.tipo];
        const colPuerta = meta?.color ?? color;
        const espejo = s.tipo === "espejo";
        const zOffset = s.tipo === "puerta_corredera" ? (i % 2 === 0 ? 0.016 : 0.034) : 0.006;

        return (
          <group key={s.id} position={[xC, 0, md / 2 + zOffset]}>
            <mesh>
              <boxGeometry args={[w * 0.97, mh * 0.97, 0.018]} />
              <meshPhysicalMaterial
                color={colPuerta}
                metalness={espejo ? 0.85 : 0.1}
                roughness={espejo ? 0.1 : 0.4}
                transparent
                opacity={0.55}
                transmission={0.2}
              />
              <Edges color="#0f0f12" lineWidth={0.6} />
            </mesh>
            {s.tipo === "puerta_abatible" || s.tipo === "puerta_plegable" ? (
              <mesh position={[w * 0.35, 0, 0.012]}>
                <boxGeometry args={[0.012, mh * 0.3, 0.014]} />
                <meshStandardMaterial color="#27272a" metalness={0.7} roughness={0.3} />
              </mesh>
            ) : null}
          </group>
        );
      })}
    </>
  );
}
