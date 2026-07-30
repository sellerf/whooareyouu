"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { THEME_LIST, type ThemeId } from "@/lib/themes";
import { Check } from "lucide-react";

function ConfigInner() {
  const { refreshProfile } = useAuth();
  const { themeId, setTheme } = useTheme();

  const select = async (id: ThemeId) => {
    await setTheme(id);
    await refreshProfile();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold">Configurações</h2>
        <p className="text-sm text-[var(--mtlc-text-muted)]">
          Temas salvos na sua conta — aplicados automaticamente ao logar
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {THEME_LIST.map((t) => {
          const active = themeId === t.id;
          return (
            <button
              key={t.id}
              onClick={() => select(t.id)}
              className={`rounded-2xl border p-5 text-left transition ${
                active
                  ? "border-[var(--mtlc-accent)] bg-[var(--mtlc-accent-soft)] shadow-[0_0_24px_var(--mtlc-accent-glow)]"
                  : "border-[var(--mtlc-border)] bg-[var(--mtlc-bg-card)] hover:border-white/20"
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className="h-8 w-8 rounded-full border border-white/10"
                  style={{
                    background: `linear-gradient(135deg, ${t.bg}, ${t.accent})`,
                  }}
                />
                {active && (
                  <Check className="h-5 w-5 text-[var(--mtlc-accent)]" />
                )}
              </div>
              <p className="mt-4 text-lg font-semibold">{t.name}</p>
              <p className="mt-1 text-sm text-[var(--mtlc-text-muted)]">
                {t.description}
              </p>
              <div className="mt-4 flex gap-2">
                {[t.bg, t.bgCard, t.accent].map((c) => (
                  <span
                    key={c}
                    className="h-4 w-4 rounded-full border border-white/10"
                    style={{ background: c }}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ConfigPage() {
  return <ConfigInner />;
}
