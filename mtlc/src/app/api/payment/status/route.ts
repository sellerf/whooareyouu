import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { getSaleStatus } from "@/lib/blackcat";

async function activatePlan(
  userId: string,
  months: number,
  transactionId: string
) {
  const admin = createServiceClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("plan_expires_at, plan_active")
    .eq("id", userId)
    .single();

  const now = Date.now();
  const currentExpiry =
    profile?.plan_active && profile.plan_expires_at
      ? new Date(profile.plan_expires_at).getTime()
      : 0;
  const base = Math.max(now, currentExpiry);
  const newExpiry = new Date(base + months * 30 * 24 * 60 * 60 * 1000);

  await admin
    .from("profiles")
    .update({
      plan_active: true,
      plan_expires_at: newExpiry.toISOString(),
    })
    .eq("id", userId);

  await admin
    .from("payments")
    .update({ status: "PAID", paid_at: new Date().toISOString() })
    .eq("transaction_id", transactionId);
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const transactionId = searchParams.get("transactionId");
    if (!transactionId) {
      return NextResponse.json(
        { error: "transactionId obrigatório" },
        { status: 400 }
      );
    }

    const admin = createServiceClient();
    const { data: payment } = await admin
      .from("payments")
      .select("*")
      .eq("transaction_id", transactionId)
      .eq("user_id", user.id)
      .single();

    if (!payment) {
      return NextResponse.json(
        { error: "Pagamento não encontrado" },
        { status: 404 }
      );
    }

    if (payment.status === "PAID") {
      return NextResponse.json({ status: "PAID", already: true });
    }

    const status = await getSaleStatus(transactionId);
    const st = status.data?.status || "PENDING";

    if (st === "PAID") {
      await activatePlan(user.id, payment.months, transactionId);
      return NextResponse.json({ status: "PAID" });
    }

    if (st === "CANCELLED" || st === "REFUNDED") {
      await admin
        .from("payments")
        .update({ status: st })
        .eq("transaction_id", transactionId);
    }

    return NextResponse.json({ status: st });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
