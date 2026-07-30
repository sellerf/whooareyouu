import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { createPixSale } from "@/lib/blackcat";
import { calcSubscriptionPrice } from "@/lib/pricing";
import { BASE_PATH } from "@/lib/base-path";

function resolveAppOrigin(req: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const header = (req.headers.get("origin") || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
  return `${header}${BASE_PATH}`;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const months = Number(body.months) || 1;
    const pricing = calcSubscriptionPrice(months);

    const externalRef = `MTLC-${user.id.slice(0, 8)}-${Date.now()}`;
    const origin = resolveAppOrigin(req);
    const postbackUrl = `${origin}/api/payment/webhook`;

    const sale = await createPixSale({
      amountCents: pricing.totalCents,
      months: pricing.months,
      externalRef,
      metadata: JSON.stringify({
        userId: user.id,
        months: pricing.months,
        product: "MTLC",
      }),
      postbackUrl,
    });

    if (!sale.success || !sale.data?.transactionId) {
      return NextResponse.json(
        { error: sale.message || "Falha ao criar pagamento" },
        { status: 400 }
      );
    }

    const admin = createServiceClient();
    await admin.from("payments").insert({
      user_id: user.id,
      transaction_id: sale.data.transactionId,
      external_ref: externalRef,
      months: pricing.months,
      amount_cents: pricing.totalCents,
      status: "PENDING",
    });

    return NextResponse.json({
      ok: true,
      transactionId: sale.data.transactionId,
      amount: pricing.totalCents,
      months: pricing.months,
      pricing,
      qrCode: sale.data.paymentData?.qrCode || sale.data.paymentData?.copyPaste,
      qrCodeBase64: sale.data.paymentData?.qrCodeBase64,
      copyPaste:
        sale.data.paymentData?.copyPaste || sale.data.paymentData?.qrCode,
      expiresAt: sale.data.paymentData?.expiresAt,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
