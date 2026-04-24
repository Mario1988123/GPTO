"use client";

import { useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Upload, Download, RotateCcw, Camera, Sparkles, Loader2 } from "lucide-react";
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
  const [hipereal, setHipereal] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);
  const [prompt, setPrompt] = useState(
    "professional interior photography, realistic wooden wardrobe in the room, natural lighting, soft shadows, photorealistic, high detail",
  );
  const [strength, setStrength] = useState(0.45);

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
    setHipereal(null);
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
    setHipereal(null);
  }

  async function generarHiperrealismo() {
    if (!containerRef.current) return;
    setGenerando(true);
    setHipereal(null);
    try {
      const canvas = await html2canvas(containerRef.current, {
        useCORS: true,
        backgroundColor: null,
        logging: false,
      });
      const dataUrl = canvas.toDataURL("image/png");

      toast("Enviando a la IA...", { description: "Primera vez puede tardar 20-30s mientras arranca el modelo" });

      const resp = await fetch("/api/hiperrealismo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagenBase64: dataUrl, prompt, strength }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        toast.error(data.error ?? "Error generando");
        return;
      }
      setHipereal(data.imagenBase64);
      toast.success("Imagen hiperreal generada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setGenerando(false);
    }
  }

  function descargarHipereal() {
    if (!hipereal) return;
    const a = document.createElement("a");
    a.href = hipereal;
    a.download = `hiperrealismo-${Date.now()}.png`;
    a.click();
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
            💡 Ajusta escala y posición hasta que el armario encaje con la perspectiva. Arrastra el armario en el canvas para orbitarlo. Descarga PNG al terminar.
          </p>

          {/* Panel hiperrealismo IA */}
          <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-5 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-500/25">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-700">
                    Hiperrealismo IA · Hugging Face
                  </p>
                  <h3 className="mt-0.5 text-base font-bold tracking-tight text-slate-900">
                    Regenera la imagen con IA para que parezca real
                  </h3>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={generarHiperrealismo}
                disabled={generando}
                className="bg-gradient-to-br from-blue-500 to-cyan-400 text-white hover:shadow-lg hover:shadow-blue-500/30"
              >
                {generando ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Generar hiperreal
                  </>
                )}
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_200px]">
              <label className="space-y-1 text-xs">
                <span className="font-bold uppercase tracking-wider text-slate-600">
                  Descripción (prompt en inglés, da mejor resultado)
                </span>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={2}
                  className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm"
                />
              </label>
              <div>
                <Slider
                  label="Fidelidad a foto"
                  value={1 - strength}
                  min={0.2}
                  max={0.9}
                  step={0.05}
                  onChange={(v) => setStrength(1 - v)}
                  format={(v) => Math.round(v * 100) + "%"}
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  Más alto = más parecido a tu overlay. Más bajo = más libertad creativa de la IA.
                </p>
              </div>
            </div>

            {hipereal ? (
              <div className="mt-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                  Resultado hiperreal
                </p>
                <div className="overflow-hidden rounded-lg border border-slate-300 bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={hipereal} alt="Hiperreal" className="h-auto w-full" />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={descargarHipereal}
                >
                  <Download className="h-3.5 w-3.5" />
                  Descargar hiperreal
                </Button>
              </div>
            ) : (
              <p className="mt-3 text-[11px] text-slate-500">
                Los modelos gratuitos de HuggingFace pueden tardar 20-30 segundos la primera vez (están "dormidos"). Si falla, vuelve a pulsar.
              </p>
            )}
          </div>
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
