"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { hasActivePlan } from "@/lib/types";

function PerfilInner() {
  const { profile, loading, isPlanActive } = useAuth();

  if (loading || !profile) {
    return (
      <div className="text-[var(--mtlc-text-muted)]">Carregando perfil...</div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold">Perfil</h2>
        <p className="text-sm text-[var(--mtlc-text-muted)]">
          Dados da sua conta MTLC
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--mtlc-border)] bg-[var(--mtlc-bg-card)] p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--mtlc-accent)] text-2xl font-bold text-black">
            {profile.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-xl font-semibold">{profile.username}</p>
            <p className="text-sm text-[var(--mtlc-text-muted)]">
              {profile.email}
            </p>
          </div>
        </div>

        <dl className="mt-8 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wider text-[var(--mtlc-text-muted)]">
              Tema
            </dt>
            <dd className="mt-1 capitalize">{profile.theme}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-[var(--mtlc-text-muted)]">
              Plano
            </dt>
            <dd className="mt-1">
              {isPlanActive ? (
                <span className="text-[var(--mtlc-accent)]">Premium</span>
              ) : (
                "Free"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-[var(--mtlc-text-muted)]">
              Validade do plano
            </dt>
            <dd className="mt-1">
              {hasActivePlan(profile) && profile.plan_expires_at
                ? format(
                    new Date(profile.plan_expires_at),
                    "dd/MM/yyyy HH:mm",
                    { locale: ptBR }
                  )
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-[var(--mtlc-text-muted)]">
              Membro desde
            </dt>
            <dd className="mt-1">
              {format(new Date(profile.created_at), "dd/MM/yyyy", {
                locale: ptBR,
              })}
            </dd>
          </div>
        </dl>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/config"
            className="rounded-xl border border-[var(--mtlc-border)] px-4 py-2 text-sm"
          >
            Alterar tema
          </Link>
          <Link
            href="/planos"
            className="rounded-xl bg-[var(--mtlc-accent)] px-4 py-2 text-sm font-semibold text-black"
          >
            Gerenciar plano
          </Link>
          <a
            href="https://linarcteam.site/"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-[var(--mtlc-border)] px-4 py-2 text-sm"
          >
            Linarc Team
          </a>
        </div>
      </div>
    </div>
  );
}

export default function PerfilPage() {
  return <PerfilInner />;
}
