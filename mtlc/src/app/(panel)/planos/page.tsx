"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PaymentModal } from "@/components/payment/PaymentModal";
import { useAuth } from "@/contexts/AuthContext";
import { calcSubscriptionPrice, formatBRL, MONTHLY_PRICE_CENTS } from "@/lib/pricing";
import { Check, Sparkles } from "lucide-react";

function PlanosInner() {
  const { profile, isPlanActive } = useAuth();
  const [months, setMonths] = useState(1);
  const [open, setOpen] = useState(false);
  const [early, setEarly] = useState(false);
  const pricing = useMemo(() => calcSubscriptionPrice(months), [months]);

  const expiresLabel = profile?.plan_expires_at
    ? format(new Date(profile.plan_expires_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
        locale: ptBR,
      })
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold">Planos</h2>
        <p className="text-sm text-[var(--mtlc-text-muted)]">
          Assinatura mensal via PIX · checkout oculto (só QR / chave)
        </p>
      </div>

      {isPlanActive && expiresLabel && (
        <div className="rounded-2xl border border-[var(--mtlc-accent)]/30 bg-[var(--mtlc-accent-soft)] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--mtlc-text-muted)]">
            Plano ativo
          </p>
          <p className="mt-2 text-lg font-semibold text-[var(--mtlc-accent)]">
            Premium Ilimitado
          </p>
          <p className="mt-1 text-sm text-[var(--mtlc-text-muted)]">
            Válido até <strong className="text-[var(--mtlc-text)]">{expiresLabel}</strong>
          </p>
          <button
            onClick={() => {
              setEarly(true);
              setOpen(true);
            }}
            className="mt-4 rounded-xl bg-[var(--mtlc-accent)] px-4 py-2 text-sm font-semibold text-black"
          >
            Renovar antecipadamente
          </button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[var(--mtlc-border)] bg-[var(--mtlc-bg-card)] p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--mtlc-text-muted)]">
            Free
          </p>
          <p className="mt-3 font-display text-3xl font-semibold">R$ 0</p>
          <ul className="mt-6 space-y-2 text-sm text-[var(--mtlc-text-muted)]">
            <li className="flex gap-2">
              <Check className="h-4 w-4 text-[var(--mtlc-accent)]" /> 1 consulta / dia
            </li>
            <li className="flex gap-2">
              <Check className="h-4 w-4 text-[var(--mtlc-accent)]" /> Metadados completos
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-[var(--mtlc-accent)]/40 bg-[var(--mtlc-bg-card)] p-6 shadow-[0_0_40px_var(--mtlc-accent-glow)]">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--mtlc-accent)]" />
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--mtlc-accent)]">
              Premium
            </p>
          </div>
          <p className="mt-3 font-display text-3xl font-semibold">
            {formatBRL(MONTHLY_PRICE_CENTS)}
            <span className="text-base font-normal text-[var(--mtlc-text-muted)]">
              /mês
            </span>
          </p>
          <ul className="mt-6 space-y-2 text-sm text-[var(--mtlc-text-muted)]">
            <li className="flex gap-2">
              <Check className="h-4 w-4 text-[var(--mtlc-accent)]" /> Consultas ilimitadas
            </li>
            <li className="flex gap-2">
              <Check className="h-4 w-4 text-[var(--mtlc-accent)]" /> 10% off a partir de 3 meses
            </li>
            <li className="flex gap-2">
              <Check className="h-4 w-4 text-[var(--mtlc-accent)]" /> Renovação antecipada
            </li>
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--mtlc-border)] bg-[var(--mtlc-bg-card)] p-6">
        <label className="text-xs uppercase tracking-[0.2em] text-[var(--mtlc-text-muted)]">
          Quantos meses deseja pagar?
        </label>
        <div className="mt-4 flex items-center gap-4">
          <input
            type="range"
            min={1}
            max={24}
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="flex-1 accent-[var(--mtlc-accent)]"
          />
          <span className="w-16 text-center text-2xl font-semibold text-[var(--mtlc-accent)]">
            {months}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-[var(--mtlc-text-muted)]">
              Subtotal {formatBRL(pricing.subtotalCents)}
              {pricing.hasDiscount && (
                <span className="ml-2 text-emerald-400">
                  −{formatBRL(pricing.discountCents)} (10%)
                </span>
              )}
            </p>
            <p className="font-display text-3xl font-semibold">
              {pricing.totalReais}
            </p>
          </div>
          <button
            onClick={() => {
              setEarly(false);
              setOpen(true);
            }}
            className="rounded-xl bg-[var(--mtlc-accent)] px-6 py-3 font-semibold text-black"
          >
            Pagar com PIX
          </button>
        </div>
      </div>

      <PaymentModal
        open={open}
        onClose={() => setOpen(false)}
        initialMonths={months}
        earlyRenewal={early}
      />
    </div>
  );
}

export default function PlanosPage() {
  return <PlanosInner />;
}
