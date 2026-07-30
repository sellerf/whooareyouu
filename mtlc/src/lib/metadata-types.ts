export interface GpsData {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy?: number | null;
  mapsUrl: string;
  openStreetMapUrl: string;
}

export interface MetadataSection {
  title: string;
  entries: { key: string; value: string }[];
}

export interface AnalysisResult {
  fileName: string;
  fileSize: number;
  fileType: string;
  mimeType: string;
  lastModified: string;
  gps: GpsData | null;
  sections: MetadataSection[];
  raw: Record<string, unknown>;
  previewUrl?: string;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function analysisToJson(result: AnalysisResult): string {
  return JSON.stringify(
    {
      fileName: result.fileName,
      fileSize: result.fileSize,
      fileType: result.fileType,
      mimeType: result.mimeType,
      lastModified: result.lastModified,
      gps: result.gps,
      raw: result.raw,
    },
    null,
    2
  );
}
