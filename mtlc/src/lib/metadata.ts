import exifr from "exifr";
import {
  type AnalysisResult,
  type GpsData,
  type MetadataSection,
  formatBytes,
} from "@/lib/metadata-types";

export type { AnalysisResult, GpsData, MetadataSection };
export { formatBytes, analysisToJson } from "@/lib/metadata-types";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v) && !(v instanceof Date);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (value instanceof Date) return value.toLocaleString("pt-BR");
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return String(value);
    return Number.isInteger(value)
      ? String(value)
      : value.toLocaleString("pt-BR", { maximumFractionDigits: 8 });
  }
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    if (value.every((x) => typeof x === "number" || typeof x === "string")) {
      return value.join(", ");
    }
    return JSON.stringify(value);
  }
  if (isPlainObject(value)) return JSON.stringify(value, null, 2);
  if (typeof value === "bigint") return value.toString();
  if (value instanceof ArrayBuffer) return `[ArrayBuffer ${value.byteLength} bytes]`;
  if (ArrayBuffer.isView(value)) return `[TypedArray ${value.byteLength} bytes]`;
  try {
    return String(value);
  } catch {
    return "[objeto]";
  }
}

function flattenObject(
  obj: Record<string, unknown>,
  prefix = ""
): { key: string; value: string }[] {
  const rows: { key: string; value: string }[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (isPlainObject(v) && !(v instanceof Date)) {
      rows.push(...flattenObject(v as Record<string, unknown>, key));
    } else {
      rows.push({ key, value: formatValue(v) });
    }
  }
  return rows;
}

function pickGps(raw: Record<string, unknown>): GpsData | null {
  const lat =
    (raw.latitude as number) ??
    (raw.GPSLatitude as number) ??
    (raw.gpsLatitude as number);
  const lon =
    (raw.longitude as number) ??
    (raw.GPSLongitude as number) ??
    (raw.gpsLongitude as number);

  if (typeof lat !== "number" || typeof lon !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const altitude =
    (raw.GPSAltitude as number) ??
    (raw.altitude as number) ??
    null;
  const accuracy =
    (raw.GPSHPositioningError as number) ??
    (raw.GPSDOP as number) ??
    null;

  return {
    latitude: lat,
    longitude: lon,
    altitude: typeof altitude === "number" ? altitude : null,
    accuracy: typeof accuracy === "number" ? accuracy : null,
    mapsUrl: `https://www.google.com/maps?q=${lat},${lon}`,
    openStreetMapUrl: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=16`,
  };
}

async function extractExifr(file: File): Promise<Record<string, unknown>> {
  try {
    const data = await exifr.parse(file, {
      gps: true,
      exif: true,
      iptc: true,
      icc: true,
      xmp: true,
      ihdr: true,
      jfif: true,
      tiff: true,
      interop: true,
      makerNote: true,
      translateKeys: true,
      translateValues: true,
      reviveValues: true,
      sanitize: false,
      mergeOutput: true,
      multiSegment: true,
    } as Parameters<typeof exifr.parse>[1]);
    return (data || {}) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function extractVideoHints(file: File): Promise<Record<string, unknown>> {
  const hints: Record<string, unknown> = {
    mediaKind: "video",
    browserType: file.type || "desconhecido",
  };

  // Tenta obter duração / dimensões via elemento video
  try {
    const url = URL.createObjectURL(file);
    const meta = await new Promise<Record<string, unknown>>((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      const timer = setTimeout(() => {
        URL.revokeObjectURL(url);
        resolve({});
      }, 8000);
      video.onloadedmetadata = () => {
        clearTimeout(timer);
        const info = {
          durationSeconds: video.duration,
          durationFormatted: formatDuration(video.duration),
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          aspectRatio:
            video.videoWidth && video.videoHeight
              ? (video.videoWidth / video.videoHeight).toFixed(4)
              : undefined,
        };
        URL.revokeObjectURL(url);
        resolve(info);
      };
      video.onerror = () => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        resolve({});
      };
      video.src = url;
    });
    Object.assign(hints, meta);
  } catch {
    /* ignore */
  }

  // Busca strings de localização em átomos comuns (ISO BMFF / QuickTime)
  try {
    const buf = await file.slice(0, Math.min(file.size, 4 * 1024 * 1024)).arrayBuffer();
    const text = new TextDecoder("latin1").decode(buf);
    const latMatch = text.match(/([+-]?\d{1,2}\.\d{4,})[,/\s]+([+-]?\d{1,3}\.\d{4,})/);
    if (latMatch) {
      const la = parseFloat(latMatch[1]);
      const lo = parseFloat(latMatch[2]);
      if (Math.abs(la) <= 90 && Math.abs(lo) <= 180) {
        hints.possibleEmbeddedLatitude = la;
        hints.possibleEmbeddedLongitude = lo;
      }
    }
    if (/com\.apple\.quicktime\.location/i.test(text)) {
      hints.quickTimeLocationAtom = "detectado";
    }
    if (/©xyz/i.test(text) || /\+\/-\d+\.\d+[+-]\d+\.\d+\//.test(text)) {
      hints.isoLocationTag = "possível ©xyz / localização embutida";
    }
  } catch {
    /* ignore */
  }

  return hints;
}

async function extractImageDimensions(file: File): Promise<Record<string, unknown>> {
  if (!file.type.startsWith("image/")) return {};
  try {
    const url = URL.createObjectURL(file);
    const dims = await new Promise<Record<string, unknown>>((resolve) => {
      const img = new Image();
      const timer = setTimeout(() => {
        URL.revokeObjectURL(url);
        resolve({});
      }, 5000);
      img.onload = () => {
        clearTimeout(timer);
        resolve({
          displayWidth: img.naturalWidth,
          displayHeight: img.naturalHeight,
          aspectRatio: (img.naturalWidth / img.naturalHeight).toFixed(4),
        });
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        resolve({});
      };
      img.src = url;
    });
    return dims;
  } catch {
    return {};
  }
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return "—";
  const s = Math.floor(seconds % 60);
  const m = Math.floor((seconds / 60) % 60);
  const h = Math.floor(seconds / 3600);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function groupSections(raw: Record<string, unknown>): MetadataSection[] {
  const buckets: Record<string, Record<string, unknown>> = {
    Arquivo: {},
    GPS: {},
    Câmera: {},
    EXIF: {},
    IPTC: {},
    XMP: {},
    ICC: {},
    Vídeo: {},
    Outros: {},
  };

  const cameraKeys = /make|model|lens|focal|aperture|fnumber|iso|exposure|flash|whitebalance|metering|shutter/i;
  const gpsKeys = /gps|latitude|longitude|altitude|lat|lon|positioning/i;
  const iptcKeys = /iptc|caption|credit|byline|headline|keywords|copyright|city|country|province/i;
  const xmpKeys = /xmp|creator|rights|subject|description|title|rating/i;
  const iccKeys = /icc|colorspace|profile|chromatic|whitepoint|gamma/i;
  const videoKeys = /duration|video|codec|frame|bitrate|audio|quicktime|media/i;
  const fileKeys = /file|size|type|mime|width|height|orientation|bit|resolution|display|aspect/i;

  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined) continue;
    if (gpsKeys.test(k)) buckets.GPS[k] = v;
    else if (cameraKeys.test(k)) buckets.Câmera[k] = v;
    else if (iptcKeys.test(k)) buckets.IPTC[k] = v;
    else if (xmpKeys.test(k)) buckets.XMP[k] = v;
    else if (iccKeys.test(k)) buckets.ICC[k] = v;
    else if (videoKeys.test(k)) buckets.Vídeo[k] = v;
    else if (fileKeys.test(k)) buckets.Arquivo[k] = v;
    else if (/exif/i.test(k)) buckets.EXIF[k] = v;
    else buckets.Outros[k] = v;
  }

  return Object.entries(buckets)
    .filter(([, obj]) => Object.keys(obj).length > 0)
    .map(([title, obj]) => ({
      title,
      entries: flattenObject(obj).sort((a, b) => a.key.localeCompare(b.key)),
    }));
}

export async function analyzeMediaFile(file: File): Promise<AnalysisResult> {
  const isVideo = file.type.startsWith("video/") || /\.(mp4|mov|m4v|webm|mkv|avi)$/i.test(file.name);
  const isImage = file.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif|tiff?|gif|bmp)$/i.test(file.name);

  const [exifrData, dims, videoHints] = await Promise.all([
    extractExifr(file),
    isImage ? extractImageDimensions(file) : Promise.resolve({}),
    isVideo ? extractVideoHints(file) : Promise.resolve({}),
  ]);

  const fileInfo: Record<string, unknown> = {
    fileName: file.name,
    fileSizeBytes: file.size,
    fileSizeFormatted: formatBytes(file.size),
    mimeType: file.type || "desconhecido",
    lastModified: new Date(file.lastModified).toLocaleString("pt-BR"),
    lastModifiedISO: new Date(file.lastModified).toISOString(),
    extension: file.name.includes(".") ? file.name.split(".").pop() : "—",
  };

  const raw: Record<string, unknown> = {
    ...fileInfo,
    ...dims,
    ...videoHints,
    ...exifrData,
  };

  // Se vídeo só achou lat/lon possíveis, injeta no GPS
  if (
    !raw.latitude &&
    typeof (videoHints as Record<string, unknown>).possibleEmbeddedLatitude ===
      "number" &&
    typeof (videoHints as Record<string, unknown>).possibleEmbeddedLongitude ===
      "number"
  ) {
    raw.latitude = (videoHints as Record<string, unknown>)
      .possibleEmbeddedLatitude;
    raw.longitude = (videoHints as Record<string, unknown>)
      .possibleEmbeddedLongitude;
  }

  let gps = pickGps(raw);

  // Também tenta exifr.gps dedicado
  if (!gps) {
    try {
      const g = await exifr.gps(file);
      if (g && typeof g.latitude === "number" && typeof g.longitude === "number") {
        gps = {
          latitude: g.latitude,
          longitude: g.longitude,
          altitude: null,
          accuracy: null,
          mapsUrl: `https://www.google.com/maps?q=${g.latitude},${g.longitude}`,
          openStreetMapUrl: `https://www.openstreetmap.org/?mlat=${g.latitude}&mlon=${g.longitude}&zoom=16`,
        };
        raw.latitude = g.latitude;
        raw.longitude = g.longitude;
      }
    } catch {
      /* ignore */
    }
  }

  let previewUrl: string | undefined;
  if (isImage || isVideo) {
    previewUrl = URL.createObjectURL(file);
  }

  return {
    fileName: file.name,
    fileSize: file.size,
    fileType: isVideo ? "video" : isImage ? "image" : "other",
    mimeType: file.type || "desconhecido",
    lastModified: new Date(file.lastModified).toISOString(),
    gps,
    sections: groupSections(raw),
    raw,
    previewUrl,
  };
}
