"use client";

import { useRef, useState } from "react";
import { Upload, Image as ImageIcon, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

/**
 * Subida de foto al bucket público "fotos" de Supabase Storage.
 *
 * Renderiza:
 * - Preview de la foto actual (o placeholder).
 * - Botón "Subir foto" que abre el file picker.
 * - Botón "Quitar" si hay foto.
 * - Hidden input con la URL pública para que el form la persista.
 *
 * Uso: <FotoUploader name="foto_url" defaultUrl={cliente.foto_url} carpeta="clientes" />
 */
export function FotoUploader({
  name,
  defaultUrl,
  carpeta,
  label = "Fotografía",
}: {
  name: string;
  defaultUrl?: string | null;
  carpeta: string; // p.ej. "clientes", "acabados", "herrajes"
  label?: string;
}) {
  const [url, setUrl] = useState<string>(defaultUrl ?? "");
  const [subiendo, setSubiendo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Máximo 5 MB por foto");
      return;
    }

    setSubiendo(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const path = `${carpeta}/${safeName}`;

      const { error } = await supabase.storage
        .from("fotos")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });
      if (error) throw error;

      const { data } = supabase.storage.from("fotos").getPublicUrl(path);
      setUrl(data.publicUrl);
      toast.success("Foto subida");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error subiendo la foto");
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function quitar() {
    setUrl("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </label>
      <div className="flex items-center gap-3">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt="Foto"
            className="h-20 w-20 shrink-0 rounded-lg object-cover ring-1 ring-border"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-muted ring-1 ring-border">
            <ImageIcon className="h-7 w-7 text-muted-foreground" />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={subiendo}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-xs transition hover:bg-muted disabled:opacity-50"
          >
            {subiendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {subiendo ? "Subiendo..." : url ? "Cambiar foto" : "Subir foto"}
          </button>
          {url && (
            <button
              type="button"
              onClick={quitar}
              className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-destructive transition hover:bg-destructive/10"
            >
              <X className="h-3.5 w-3.5" />
              Quitar
            </button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={onChange}
      />
      <input type="hidden" name={name} value={url} />
      <p className="text-[10px] text-muted-foreground">JPG / PNG / WebP / AVIF · máx 5 MB</p>
    </div>
  );
}
