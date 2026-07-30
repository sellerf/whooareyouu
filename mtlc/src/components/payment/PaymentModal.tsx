"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, Loader2, X } from "lucide-react";
import { calcSubscriptionPrice, formatBRL } from "@/lib/pricing";
import { useAuth } from "@/contexts/AuthContext";
import { withBasePath } from "@/lib/base-path";

interface Props {
  open: boolean;
  onClose: () => void;
  initialMonths?: number;
  earlyRenewal?: boolean;
}

export function PaymentModal({
  open,
  onClose,
  initialMonths = 1,
  earlyRenewal = false,
}: Props) {
  const { refreshProfile } = useAuth();
  const [months, setMonths] = useState(initialMonths);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [tx, setTx] = useState<{
    transactionId: string;
    copyPaste: string;
    qrCodeBase64?: string;
  } | null>(null);
  const [paid, setPaid] = useState(false);

  const pricing = useMemo(() => calcSubscriptionPrice(months), [months]);

  useEffect(() => {
    if (open) {
      setMonths(initialMonths);
      setTx(null);
      setPaid(false);
      setError("");
    }
  }, [open, initialMonths]);

  useEffect(() => {
    if (!tx?.transactionId || paid) return;
    const id = setInterval(async () => {
      try {
        const res = await fetch(
          withBasePath(
            `/api/payment/status?transactionId=${encodeURIComponent(tx.transactionId)}`
          )
        );
        const data = await res.json();
        if (data.status === "PAID") {
          setPaid(true);
          await refreshProfile();
          clearInterval(id);
        }
      } catch {
        /* ignore */
      }
    }, 3000);
    return () => clearInterval(id);
  }, [tx, paid, refreshProfile]);

  if (!open) return null;

  const createPayment = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(withBasePath("/api/payment/create"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ months }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao gerar PIX");
      setTx({
        transactionId: data.transactionId,
        copyPaste: data.copyPaste,
        qrCodeBase64: data.qrCodeBase64,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  };

  const copyKey = async () => {
    if (!tx?.copyPaste) return;
    await navigator.clipboard.writeText(tx.copyPaste);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-[var(--mtlc-border)] bg-[var(--mtlc-bg-elevated)] p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-[var(--mtlc-text-muted)] hover:text-[var(--mtlc-text)]"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-xl font-semibold text-[var(--mtlc-text)]">
          {earlyRenewal ? "Renovação antecipada" : "Assinar MTLC"}
        </h2>
        <p className="mt-1 text-sm text-[var(--mtlc-text-muted)]">
          R$ 3,99/mês · 10% de desconto a partir de 3 meses · pagamento só via
          PIX
        </p>

        {paid ? (
          <div className="mt-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--mtlc-accent-soft)] text-[var(--mtlc-accent)]">
              <Check className="h-8 w-8" />
            </div>
            <p className="text-lg font-semibold text-[var(--mtlc-text)]">
              Pagamento confirmado!
            </p>
            <p className="mt-1 text-sm text-[var(--mtlc-text-muted)]">
              Seu plano ilimitado já está ativo.
            </p>
            <button
              onClick={onClose}
              className="mt-6 w-full rounded-xl bg-[var(--mtlc-accent)] py-3 font-semibold text-black"
            >
              Continuar
            </button>
          </div>
        ) : !tx ? (
          <>
            <label className="mt-6 block text-xs font-medium uppercase tracking-wider text-[var(--mtlc-text-muted)]">
              Quantidade de meses
            </label>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={24}
                value={months}
                onChange={(e) => setMonths(Number(e.target.value))}
                className="flex-1 accent-[var(--mtlc-accent)]"
              />
              <input
                type="number"
                min={1}
                max={24}
                value={months}
                onChange={(e) => setMonths(Number(e.target.value) || 1)}
                className="w-16 rounded-lg border border-[var(--mtlc-border)] bg-[var(--mtlc-bg-card)] px-2 py-2 text-center text-[var(--mtlc-text)]"
              />
            </div>

            <div className="mt-4 space-y-2 rounded-xl border border-[var(--mtlc-border)] bg-[var(--mtlc-bg-card)] p-4 text-sm">
              <div className="flex justify-between text-[var(--mtlc-text-muted)]">
                <span>
                  {months} × {formatBRL(pricing.unitCents)}
                </span>
                <span>{formatBRL(pricing.subtotalCents)}</span>
              </div>
              {pricing.hasDiscount && (
                <div className="flex justify-between text-emerald-400">
                  <span>Desconto 10% (3+ meses)</span>
                  <span>-{formatBRL(pricing.discountCents)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-[var(--mtlc-border)] pt-2 text-base font-semibold text-[var(--mtlc-text)]">
                <span>Total</span>
                <span className="text-[var(--mtlc-accent)]">
                  {pricing.totalReais}
                </span>
              </div>
            </div>

            {error && (
              <p className="mt-3 text-sm text-red-400">{error}</p>
            )}

            <button
              onClick={createPayment}
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--mtlc-accent)] py-3 font-semibold text-black disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Gerar PIX
            </button>
          </>
        ) : (
          <div className="mt-6 flex flex-col items-center">
            <div className="rounded-2xl bg-white p-4">
              {tx.qrCodeBase64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tx.qrCodeBase64}
                  alt="QR Code PIX"
                  className="h-48 w-48"
                />
              ) : (
                <QRCodeSVG value={tx.copyPaste} size={192} />
              )}
            </div>
            <p className="mt-4 text-center text-sm text-[var(--mtlc-text-muted)]">
              Escaneie o QR Code ou copie a chave aleatória (copia e cola)
            </p>
            <button
              onClick={copyKey}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--mtlc-border)] bg-[var(--mtlc-bg-card)] px-4 py-3 text-sm text-[var(--mtlc-text)]"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? "Copiado!" : "Copiar chave PIX"}
            </button>
            <p className="mt-3 flex items-center gap-2 text-xs text-[var(--mtlc-text-muted)]">
              <Loader2 className="h-3 w-3 animate-spin" />
              Aguardando confirmação automática...
            </p>
            <p className="mt-1 text-[10px] text-[var(--mtlc-text-muted)]">
              Total: {pricing.totalReais} · {months} mês(es)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
