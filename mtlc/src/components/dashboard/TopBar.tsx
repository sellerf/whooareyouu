"use client";

import { Bell, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function TopBar({ title }: { title?: string }) {
  const { profile } = useAuth();
  const initial = (profile?.username || "U").charAt(0).toUpperCase();

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-[var(--mtlc-border)] bg-[var(--mtlc-bg)]/80 px-6 backdrop-blur">
      <div className="flex flex-1 items-center gap-4">
        {title && (
          <h1 className="hidden text-lg font-semibold text-[var(--mtlc-text)] md:block">
            {title}
          </h1>
        )}
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--mtlc-text-muted)]" />
          <input
            type="search"
            placeholder="Pesquisar..."
            className="w-full rounded-xl border border-[var(--mtlc-border)] bg-[var(--mtlc-bg-card)] py-2.5 pl-10 pr-4 text-sm text-[var(--mtlc-text)] outline-none placeholder:text-[var(--mtlc-text-muted)] focus:border-[var(--mtlc-accent)]/50"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="rounded-xl border border-[var(--mtlc-border)] p-2.5 text-[var(--mtlc-text-muted)] hover:text-[var(--mtlc-accent)]">
          <Bell className="h-4 w-4" />
        </button>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--mtlc-accent)] text-sm font-bold text-black shadow-[0_0_16px_var(--mtlc-accent-glow)]">
          {initial}
        </div>
      </div>
    </header>
  );
}
