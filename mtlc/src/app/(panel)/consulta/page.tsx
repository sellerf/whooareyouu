"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { Download, Loader2, Upload, X } from "lucide-react";
import { GpsMap } from "@/components/metadata/GpsMap";
import type { AnalysisResult } from "@/lib/metadata-types";
import { analysisToJson, formatBytes } from "@/lib/metadata-types";
import { useAuth } from "@/contexts/AuthContext";
import { withBasePath } from "@/lib/base-path";

function ConsultaInner() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { refreshProfile, isPlanActive } = useAuth();
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const clear = () => {
    if (result?.previewUrl) URL.revokeObjectURL(result.previewUrl);
    setResult(null);
    setError("");
  };

  const processFile = useCallback(
    async (file: File) => {
      setLoading(true);
      setError("");
      clear();

      try {
        const consume = await fetch(withBasePath("/api/metadata/consume"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type || "unknown",
          }),
        });
        const quota = await consume.json();
        if (!consume.ok || !quota.ok) {
          throw new Error(
            quota.error ||
              "Limite diário atingido. Assine o plano para consultas ilimitadas."
          );
        }

        const { analyzeMediaFile } = await import("@/lib/metadata");
        const analysis = await analyzeMediaFile(file);
        setResult(analysis);
        await refreshProfile();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha na consulta");
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshProfile]
  );

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await processFile(file);
  };

  const downloadJson = () => {
    if (!result) return;
    const blob = new Blob([analysisToJson(result)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.fileName}.metadata.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold">
            Consulta de metadados
          </h2>
          <p className="text-sm text-[var(--mtlc-text-muted)]">
            Imagens e vídeos · máximo de informações possível
            {!isPlanActive && " · 1 grátis/dia sem plano"}
          </p>
        </div>
        {!isPlanActive && (
          <Link
            href="/planos"
            className="rounded-xl bg-[var(--mtlc-accent)] px-4 py-2 text-sm font-semibold text-black"
          >
            Liberar ilimitado
          </Link>
        )}
      </div>

      {!result && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition ${
            dragging
              ? "border-[var(--mtlc-accent)] bg-[var(--mtlc-accent-soft)]"
              : "border-[var(--mtlc-border)] bg-[var(--mtlc-bg-card)] hover:border-[var(--mtlc-accent)]/40"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*,.heic,.heif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) processFile(f);
            }}
          />
          {loading ? (
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-[var(--mtlc-accent)]" />
          ) : (
            <Upload className="mx-auto h-10 w-10 text-[var(--mtlc-accent)]" />
          )}
          <p className="mt-4 text-lg font-medium">
            {loading
              ? "Analisando metadados..."
              : "Arraste um arquivo ou clique para selecionar"}
          </p>
          <p className="mt-2 text-sm text-[var(--mtlc-text-muted)]">
            JPG, PNG, HEIC, TIFF, WEBP, MP4, MOV, WEBM e mais
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}{" "}
          {error.toLowerCase().includes("limite") && (
            <Link href="/planos" className="underline">
              Ver planos
            </Link>
          )}
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">{result.fileName}</h3>
              <p className="text-sm text-[var(--mtlc-text-muted)]">
                {result.mimeType} · {formatBytes(result.fileSize)} ·{" "}
                {result.fileType}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={downloadJson}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--mtlc-border)] px-4 py-2 text-sm"
              >
                <Download className="h-4 w-4" /> JSON
              </button>
              <button
                onClick={clear}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--mtlc-accent)] px-4 py-2 text-sm font-semibold text-black"
              >
                <X className="h-4 w-4" /> Nova
              </button>
            </div>
          </div>

          {result.previewUrl && (
            <div className="overflow-hidden rounded-2xl border border-[var(--mtlc-border)] bg-black">
              {result.fileType === "video" ? (
                <video
                  src={result.previewUrl}
                  controls
                  className="mx-auto max-h-80"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={result.previewUrl}
                  alt="preview"
                  className="mx-auto max-h-80 object-contain"
                />
              )}
            </div>
          )}

          {result.gps ? (
            <GpsMap gps={result.gps} />
          ) : (
            <div className="rounded-xl border border-[var(--mtlc-border)] bg-[var(--mtlc-bg-card)] px-4 py-3 text-sm text-[var(--mtlc-text-muted)]">
              Nenhuma coordenada GPS encontrada neste arquivo.
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {result.sections.map((section) => (
              <div
                key={section.title}
                className="rounded-2xl border border-[var(--mtlc-border)] bg-[var(--mtlc-bg-card)]"
              >
                <div className="border-b border-[var(--mtlc-border)] px-4 py-3">
                  <h4 className="text-sm font-semibold text-[var(--mtlc-accent)]">
                    {section.title}
                  </h4>
                  <p className="text-[10px] text-[var(--mtlc-text-muted)]">
                    {section.entries.length} campos
                  </p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <tbody>
                      {section.entries.map((row) => (
                        <tr
                          key={row.key}
                          className="border-b border-[var(--mtlc-border)]/60"
                        >
                          <td className="w-[40%] px-4 py-2 font-mono text-[var(--mtlc-text-muted)]">
                            {row.key}
                          </td>
                          <td className="break-all px-4 py-2 text-[var(--mtlc-text)]">
                            {row.value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConsultaPage() {
  return <ConsultaInner />;
}
