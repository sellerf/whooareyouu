import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";

async function activatePlan(userId: string, months: number, transactionId: string) {
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

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const event = payload.event || payload.type;
    const transactionId = payload.transactionId;
    const status = payload.status;

    if (!transactionId) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const admin = createServiceClient();
    const { data: payment } = await admin
      .from("payments")
      .select("*")
      .eq("transaction_id", transactionId)
      .maybeSingle();

    if (!payment) {
      return NextResponse.json({ ok: true, unknown: true });
    }

    if (payment.status === "PAID") {
      return NextResponse.json({ ok: true, already: true });
    }

    const paid =
      event === "transaction.paid" ||
      status === "PAID" ||
      String(status).toUpperCase() === "PAID";

    if (paid) {
      await activatePlan(payment.user_id, payment.months, transactionId);
      return NextResponse.json({ ok: true, activated: true });
    }

    if (
      event === "transaction.failed" ||
      status === "CANCELLED" ||
      status === "FAILED"
    ) {
      await admin
        .from("payments")
        .update({ status: "CANCELLED" })
        .eq("transaction_id", transactionId);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
