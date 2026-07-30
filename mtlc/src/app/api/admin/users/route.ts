import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };

  const admin = createServiceClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return { error: NextResponse.json({ error: "Acesso negado" }, { status: 403 }) };
  }

  return { user, admin, profile };
}

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  let query = auth.admin!
    .from("profiles")
    .select(
      "id, username, email, theme, is_admin, plan_active, plan_expires_at, free_queries_used, free_queries_date, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (q) {
    query = query.or(`username.ilike.%${q}%,email.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: data });
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const body = await req.json();
  const userId = body.userId as string;
  if (!userId) {
    return NextResponse.json({ error: "userId obrigatório" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (body.action === "grant") {
    const expiresAt = body.expiresAt as string;
    if (!expiresAt) {
      return NextResponse.json(
        { error: "expiresAt obrigatório" },
        { status: 400 }
      );
    }
    updates.plan_active = true;
    updates.plan_expires_at = new Date(expiresAt).toISOString();
  } else if (body.action === "revoke") {
    updates.plan_active = false;
    updates.plan_expires_at = null;
  } else if (body.action === "set_expiry") {
    const expiresAt = body.expiresAt as string;
    if (!expiresAt) {
      return NextResponse.json(
        { error: "expiresAt obrigatório" },
        { status: 400 }
      );
    }
    updates.plan_active = true;
    updates.plan_expires_at = new Date(expiresAt).toISOString();
  } else {
    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  }

  const { data, error } = await auth.admin!
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, user: data });
}
