"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  daysLeftInPlan,
  getGreeting,
  hasActivePlan,
  planUsagePercent,
} from "@/lib/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowUpRight, FileSearch, Infinity } from "lucide-react";

function DashboardInner() {
  const { profile, loading, isPlanActive } = useAuth();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-[var(--mtlc-text-muted)]">
        Carregando...
      </div>
    );
  }

  const usedPct = isPlanActive ? planUsagePercent(profile) : 0;
  const daysLeft = daysLeftInPlan(profile);
  const expiresLabel = profile?.plan_expires_at
    ? format(new Date(profile.plan_expires_at), "dd/MM/yyyy HH:mm", {
        locale: ptBR,
      })
    : "—";

  const freeUsedToday =
    profile?.free_queries_date ===
    new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })
      ? profile.free_queries_used
      : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Plano */}
        <div className="rounded-2xl border border-[var(--mtlc-border)] bg-[var(--mtlc-bg-card)] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--mtlc-text-muted)]">
            Seu plano
          </p>
          <h2 className="mt-3 font-display text-2xl font-semibold text-[var(--mtlc-accent)]">
            {isPlanActive ? "PREMIUM ILIMITADO" : "FREE DIÁRIO"}
          </h2>
          <p className="mt-1 text-sm text-[var(--mtlc-text-muted)]">
            {isPlanActive
              ? `Expira em ${expiresLabel}`
              : "1 consulta grátis por dia"}
          </p>
          <Link
            href="/planos"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--mtlc-accent)] py-3 text-sm font-semibold text-black shadow-[0_0_24px_var(--mtlc-accent-glow)]"
          >
            {isPlanActive ? "Renovar antecipadamente" : "Fazer Upgrade"}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
          <Link
            href="/planos"
            className="mt-3 block text-center text-xs text-[var(--mtlc-text-muted)] hover:text-[var(--mtlc-accent)]"
          >
            Ver todos os planos
          </Link>
        </div>

        {/* Consumo */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--mtlc-border)] bg-[var(--mtlc-bg-card)] p-5">
          <div className="relative flex h-36 w-36 items-center justify-center">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="var(--mtlc-border)"
                strokeWidth="10"
              />
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="var(--mtlc-accent)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 52}`}
                strokeDashoffset={`${
                  2 *
                  Math.PI *
                  52 *
                  (1 - (isPlanActive ? usedPct : freeUsedToday * 100) / 100)
                }`}
                style={{ filter: "drop-shadow(0 0 8px var(--mtlc-accent-glow))" }}
              />
            </svg>
            <div className="absolute text-center">
              <p className="font-display text-3xl font-bold text-[var(--mtlc-text)]">
                {isPlanActive ? `${usedPct}%` : `${freeUsedToday}/1`}
              </p>
            </div>
          </div>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--mtlc-text-muted)]">
            {isPlanActive
              ? `DIAS RESTANTES: ${daysLeft}`
              : "CONSULTAS HOJE"}
          </p>
        </div>

        {/* Welcome */}
        <div className="relative overflow-hidden rounded-2xl border border-[var(--mtlc-border)] bg-[var(--mtlc-bg-card)] p-5 mesh-bg">
          <div className="absolute inset-0 grid-pattern opacity-30" />
          <div className="relative">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--mtlc-text-muted)]">
              Bem-vindo
            </p>
            <h2 className="mt-3 font-display text-2xl font-semibold">
              {getGreeting()},{" "}
              <span className="text-[var(--mtlc-accent)]">
                {profile?.username || "membro"}
              </span>
            </h2>
            <div className="mt-8 flex gap-6">
              <div>
                <p className="text-2xl font-semibold">
                  {isPlanActive ? (
                    <Infinity className="h-7 w-7 text-[var(--mtlc-accent)]" />
                  ) : (
                    Math.max(0, 1 - freeUsedToday)
                  )}
                </p>
                <p className="text-xs text-[var(--mtlc-text-muted)]">
                  {isPlanActive ? "Ilimitado" : "Restantes hoje"}
                </p>
              </div>
              <div>
                <p className="text-2xl font-semibold capitalize text-[var(--mtlc-accent)]">
                  {profile?.theme || "lua"}
                </p>
                <p className="text-xs text-[var(--mtlc-text-muted)]">Tema</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--mtlc-border)] bg-[var(--mtlc-bg-card)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-xl font-semibold">Consultas</h3>
            <p className="text-sm text-[var(--mtlc-text-muted)]">
              Extraia GPS, EXIF, IPTC, XMP e mais de imagens e vídeos
            </p>
          </div>
          <Link
            href="/consulta"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--mtlc-accent-soft)] px-5 py-3 text-sm font-semibold text-[var(--mtlc-accent)]"
          >
            <FileSearch className="h-4 w-4" />
            Nova consulta
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {["Imagem", "Vídeo", "GPS", "EXIF", "IPTC", "XMP", "ICC"].map(
            (tag, i) => (
              <span
                key={tag}
                className={`rounded-full border px-3 py-1.5 text-xs ${
                  i === 0
                    ? "border-[var(--mtlc-accent)]/50 bg-[var(--mtlc-accent-soft)] text-[var(--mtlc-accent)]"
                    : "border-[var(--mtlc-border)] text-[var(--mtlc-text-muted)]"
                }`}
              >
                {tag}
              </span>
            )
          )}
        </div>

        {!hasActivePlan(profile) && freeUsedToday >= 1 && (
          <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Você já usou a consulta gratuita de hoje.{" "}
            <Link href="/planos" className="underline">
              Assine o plano
            </Link>{" "}
            para continuar ilimitado.
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return <DashboardInner />;
}
