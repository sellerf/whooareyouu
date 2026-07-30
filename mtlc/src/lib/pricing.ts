/** Preço mensal em centavos: R$ 3,99 */
export const MONTHLY_PRICE_CENTS = 399;

/** Desconto a partir de 3 meses */
export const DISCOUNT_FROM_MONTHS = 3;
export const DISCOUNT_PERCENT = 10;

export function calcSubscriptionPrice(months: number): {
  months: number;
  unitCents: number;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  hasDiscount: boolean;
  totalReais: string;
} {
  const safeMonths = Math.max(1, Math.min(24, Math.floor(months || 1)));
  const subtotalCents = safeMonths * MONTHLY_PRICE_CENTS;
  const hasDiscount = safeMonths >= DISCOUNT_FROM_MONTHS;
  const discountCents = hasDiscount
    ? Math.round(subtotalCents * (DISCOUNT_PERCENT / 100))
    : 0;
  const totalCents = subtotalCents - discountCents;

  return {
    months: safeMonths,
    unitCents: MONTHLY_PRICE_CENTS,
    subtotalCents,
    discountCents,
    totalCents,
    hasDiscount,
    totalReais: (totalCents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    }),
  };
}

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
