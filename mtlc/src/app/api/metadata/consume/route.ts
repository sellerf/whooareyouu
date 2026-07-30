import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const fileName = body.fileName as string | undefined;
    const fileType = body.fileType as string | undefined;

    const admin = createServiceClient();
    const { data, error } = await admin.rpc("consume_query", {
      p_user_id: user.id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = data as {
      ok: boolean;
      error?: string;
      unlimited?: boolean;
      remaining?: number;
    };

    if (!result?.ok) {
      return NextResponse.json(
        { ok: false, error: result?.error || "Consulta não permitida" },
        { status: 403 }
      );
    }

    await admin.from("query_logs").insert({
      user_id: user.id,
      file_name: fileName || null,
      file_type: fileType || null,
    });

    return NextResponse.json({
      ok: true,
      unlimited: !!result.unlimited,
      remaining: result.remaining ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
