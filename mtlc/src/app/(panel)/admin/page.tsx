"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Search, ShieldOff, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/types";
import { hasActivePlan } from "@/lib/types";
import { withBasePath } from "@/lib/base-path";

function AdminInner() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expiryDraft, setExpiryDraft] = useState<Record<string, string>>({});

  const load = useCallback(async (query = "") => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        withBasePath(`/api/admin/users?q=${encodeURIComponent(query)}`)
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao carregar");
      setUsers(data.users || []);
      const drafts: Record<string, string> = {};
      for (const u of data.users || []) {
        if (u.plan_expires_at) {
          drafts[u.id] = new Date(u.plan_expires_at).toISOString().slice(0, 16);
        } else {
          const d = new Date();
          d.setDate(d.getDate() + 30);
          drafts[u.id] = d.toISOString().slice(0, 16);
        }
      }
      setExpiryDraft(drafts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!profile?.is_admin) {
      router.replace("/dashboard");
      return;
    }
    load();
  }, [profile, authLoading, router, load]);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    load(q);
  };

  const patch = async (
    userId: string,
    body: Record<string, unknown>
  ) => {
    setBusyId(userId);
    try {
      const res = await fetch(withBasePath("/api/admin/users"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha");
      await load(q);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusyId(null);
    }
  };

  if (authLoading || !profile?.is_admin) {
    return (
      <div className="flex h-40 items-center justify-center text-[var(--mtlc-text-muted)]">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold">Painel Admin</h2>
        <p className="text-sm text-[var(--mtlc-text-muted)]">
          Gerencie planos, validade e veja tema de cada conta
        </p>
      </div>

      <form onSubmit={onSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--mtlc-text-muted)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar username ou e-mail..."
            className="w-full rounded-xl border border-[var(--mtlc-border)] bg-[var(--mtlc-bg-card)] py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[var(--mtlc-accent)]/40"
          />
        </div>
        <button
          type="submit"
          className="rounded-xl bg-[var(--mtlc-accent)] px-5 py-2.5 text-sm font-semibold text-black"
        >
          Buscar
        </button>
      </form>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-[var(--mtlc-border)]">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-[var(--mtlc-bg-elevated)] text-xs uppercase tracking-wider text-[var(--mtlc-text-muted)]">
            <tr>
              <th className="px-4 py-3">Conta</th>
              <th className="px-4 py-3">Tema</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Validade</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[var(--mtlc-text-muted)]">
                  Carregando...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[var(--mtlc-text-muted)]">
                  Nenhum usuário
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const active = hasActivePlan(u);
                return (
                  <tr
                    key={u.id}
                    className="border-t border-[var(--mtlc-border)] bg-[var(--mtlc-bg-card)]"
                  >
                    <td className="px-4 py-4">
                      <p className="font-semibold">{u.username}</p>
                      <p className="text-xs text-[var(--mtlc-text-muted)]">
                        {u.email}
                      </p>
                      {u.is_admin && (
                        <span className="mt-1 inline-block rounded bg-[var(--mtlc-accent-soft)] px-2 py-0.5 text-[10px] text-[var(--mtlc-accent)]">
                          ADMIN
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 capitalize">{u.theme}</td>
                    <td className="px-4 py-4">
                      {active ? (
                        <span className="text-[var(--mtlc-accent)]">Premium</span>
                      ) : (
                        <span className="text-[var(--mtlc-text-muted)]">Free</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <input
                        type="datetime-local"
                        value={expiryDraft[u.id] || ""}
                        onChange={(e) =>
                          setExpiryDraft((d) => ({
                            ...d,
                            [u.id]: e.target.value,
                          }))
                        }
                        className="rounded-lg border border-[var(--mtlc-border)] bg-[var(--mtlc-bg)] px-2 py-1.5 text-xs"
                      />
                      {u.plan_expires_at && (
                        <p className="mt-1 text-[10px] text-[var(--mtlc-text-muted)]">
                          Atual:{" "}
                          {format(new Date(u.plan_expires_at), "dd/MM/yy HH:mm", {
                            locale: ptBR,
                          })}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          disabled={busyId === u.id}
                          onClick={() =>
                            patch(u.id, {
                              action: "grant",
                              expiresAt: expiryDraft[u.id],
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-[var(--mtlc-accent)] px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-50"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Ativar
                        </button>
                        <button
                          disabled={busyId === u.id}
                          onClick={() =>
                            patch(u.id, { action: "revoke" })
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-red-500/40 px-3 py-1.5 text-xs text-red-300 disabled:opacity-50"
                        >
                          <ShieldOff className="h-3.5 w-3.5" />
                          Remover
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return <AdminInner />;
}
