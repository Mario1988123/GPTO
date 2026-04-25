"use client";

import { useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Upload, Download, RotateCcw, Camera } from "lucide-react";
import html2canvas from "html2canvas-pro";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ModuloPro } from "./armario-3d-pro";
import { ArmarioScene } from "./armario-3d-pro";

type Props = {
  armario_ancho_mm: number;
  armario_alto_mm: number;
  armario_fondo_mm: number;
  tipo_instalacion: "empotrado" | "suelto";
  margen_tapeta_mm: number;
  modulos: ModuloPro[];
};

export function ARPreview(props: Props) {
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [escala, setEscala] = useState(1);
  const [posX, setPosX] = useState(50); // %
  const [posY, setPosY] = useState(60); // %
  const [rotacion, setRotacion] = useState(0); // deg
  const [opacity3D, setOpacity3D] = useState(0.95);
  const [descargando, setDescargando] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Selecciona un archivo de imagen (JPG, PNG, WebP)");
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      toast.error("Imagen demasiado grande (máx 15 MB)");
      return;
    }
    // Revocar URL previa si la había
    if (fotoUrl) URL.revokeObjectURL(fotoUrl);
    const url = URL.createObjectURL(f);
    setFotoUrl(url);
  }

  async function descargar() {
    if (!containerRef.current) return;
    setDescargando(true);
    try {
      const canvas = await html2canvas(containerRef.current, {
        useCORS: true,
        backgroundColor: null,
        logging: false,
      });
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
      if (!blob) throw new Error("No se pudo generar imagen");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ar-preview-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Imagen descargada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al descargar");
    } finally {
      setDescargando(false);
    }
  }

  function reset() {
    setEscala(1);
    setPosX(50);
    setPosY(60);
    setRotacion(0);
    setOpacity3D(0.95);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
          <Upload className="h-4 w-4" />
          {fotoUrl ? "Cambiar foto" : "Subir foto"}
          <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
        </label>
        {fotoUrl ? (
          <>
            <Button type="button" size="sm" variant="outline" onClick={reset}>
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={descargar}
              disabled={descargando}
              className="bg-gradient-to-br from-blue-500 to-cyan-400 text-white"
            >
              <Download className="h-3.5 w-3.5" />
              {descargando ? "Generando..." : "Descargar PNG"}
            </Button>
          </>
        ) : null}
        <p className="ml-auto text-xs text-slate-500">
          Foto local solo en tu navegador. No se sube al servidor.
        </p>
      </div>

      {!fotoUrl ? (
        <div className="flex h-[400px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500">
          <Camera className="mb-3 h-12 w-12" />
          <p className="text-sm font-medium">Sube una foto de la pared o habitación</p>
          <p className="mt-1 text-xs">El armario se superpondrá en 3D</p>
        </div>
      ) : (
        <>
          <div
            ref={containerRef}
            className="relative w-full overflow-hidden rounded-xl border border-slate-300 bg-black"
            style={{ aspectRatio: "16 / 10" }}
          >
            {/* Foto de fondo (blob local, sin crossOrigin) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fotoUrl}
              alt="Fondo"
              className="absolute inset-0 h-full w-full object-cover"
              onError={() => toast.error("No se pudo cargar la imagen. Prueba con JPG/PNG de menos de 10 MB.")}
            />

            {/* Canvas 3D encima con opacidad */}
            <div
              className="pointer-events-auto absolute"
              style={{
                left: `${posX - escala * 25}%`,
                top: `${posY - escala * 30}%`,
                width: `${escala * 50}%`,
                height: `${escala * 60}%`,
                transform: `rotate(${rotacion}deg)`,
                opacity: opacity3D,
              }}
            >
              <Canvas
                camera={{ position: [2.5, 1.8, 3], fov: 35 }}
                gl={{
                  preserveDrawingBuffer: true,
                  alpha: true,
                  powerPreference: "low-power",
                  antialias: true,
                }}
                dpr={[1, 1.5]}
                style={{ background: "transparent" }}
                onCreated={({ gl }) => {
                  const canvas = gl.domElement;
                  canvas.addEventListener("webglcontextlost", (e) => {
                    e.preventDefault();
                    toast.error("WebGL perdió el contexto. Recarga la página si no se recupera.");
                  });
                  canvas.addEventListener("webglcontextrestored", () => {
                    toast.success("WebGL restaurado");
                  });
                }}
              >
                <ambientLight intensity={0.7} />
                <directionalLight position={[5, 8, 5]} intensity={1.0} />
                <directionalLight position={[-3, 5, -2]} intensity={0.3} />
                <ArmarioScene
                  {...props}
                  selectedId={null}
                  onSelect={() => {}}
                  onMove={async () => {}}
                  showFloor={false}
                  showControls={false}
                />
                <OrbitControls enableDamping dampingFactor={0.1} minDistance={2} maxDistance={10} />
              </Canvas>
            </div>
          </div>

          {/* Controles */}
          <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-4">
            <Slider label="Escala" value={escala} min={0.3} max={2.5} step={0.05} onChange={setEscala} format={(v) => v.toFixed(2) + "×"} />
            <Slider label="Posición X" value={posX} min={0} max={100} step={1} onChange={setPosX} format={(v) => v + "%"} />
            <Slider label="Posición Y" value={posY} min={0} max={100} step={1} onChange={setPosY} format={(v) => v + "%"} />
            <Slider label="Opacidad" value={opacity3D} min={0.3} max={1} step={0.05} onChange={setOpacity3D} format={(v) => Math.round(v * 100) + "%"} />
            <Slider label="Rotación" value={rotacion} min={-180} max={180} step={1} onChange={setRotacion} format={(v) => v + "°"} />
          </div>

          <p className="text-xs text-slate-500">
            💡 Ajusta escala y posición hasta que el armario encaje con la perspectiva. Descarga PNG al terminar.
            <br />
            <span className="text-amber-600">⚠ Pendiente: perspectiva manual con dibujo de ejes X/Y/Z y doble punto de fuga (próxima iteración).</span>
          </p>
        </>
      )}
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  return (
    <label className="space-y-1 text-xs">
      <div className="flex items-baseline justify-between">
        <span className="font-bold uppercase tracking-wider text-slate-600">{label}</span>
        <span className="font-mono text-slate-900">{format(value)}</span>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-500"
      />
    </label>
  );
}
