"use client";

import { useEffect, useState } from "react";
import type { GpsData } from "@/lib/metadata-types";

export function GpsMap({ gps }: { gps: GpsData }) {
  const [MapView, setMapView] = useState<React.ComponentType<{
    gps: GpsData;
  }> | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("./GpsMapInner").then((mod) => {
      if (!cancelled) setMapView(() => mod.GpsMapInner);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--mtlc-border)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--mtlc-border)] bg-[var(--mtlc-bg-card)] px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-[var(--mtlc-text)]">
            Localização GPS
          </p>
          <p className="text-xs text-[var(--mtlc-text-muted)]">
            {gps.latitude.toFixed(6)}, {gps.longitude.toFixed(6)}
            {gps.altitude != null ? ` · alt ${gps.altitude.toFixed(1)}m` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={gps.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-[var(--mtlc-accent)] px-3 py-1.5 text-xs font-semibold text-black"
          >
            Google Maps
          </a>
          <a
            href={gps.openStreetMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-[var(--mtlc-border)] px-3 py-1.5 text-xs text-[var(--mtlc-text)]"
          >
            OpenStreetMap
          </a>
        </div>
      </div>
      <div className="h-72 w-full bg-[var(--mtlc-bg)]">
        {MapView ? (
          <MapView gps={gps} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--mtlc-text-muted)]">
            Carregando mapa...
          </div>
        )}
      </div>
    </div>
  );
}
