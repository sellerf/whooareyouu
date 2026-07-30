"use client";

import { useState } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/consulta": "Consulta",
  "/planos": "Planos",
  "/config": "Configurações",
  "/perfil": "Perfil",
  "/admin": "Admin",
};

export function PanelShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const title = TITLES[pathname] || "MTLC";
  const [open, setOpen] = useState(false);

  return (
    <AuthProvider>
      <ThemeProvider>
        <div className="flex min-h-screen bg-[var(--mtlc-bg)] text-[var(--mtlc-text)]">
          <div className="hidden md:block">
            <Sidebar />
          </div>

          {open && (
            <div className="fixed inset-0 z-50 flex md:hidden">
              <div
                className="absolute inset-0 bg-black/60"
                onClick={() => setOpen(false)}
              />
              <div className="relative z-10" onClick={() => setOpen(false)}>
                <Sidebar />
              </div>
            </div>
          )}

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-2 border-b border-[var(--mtlc-border)] md:border-0">
              <button
                type="button"
                className="ml-3 rounded-xl border border-[var(--mtlc-border)] p-2 md:hidden"
                onClick={() => setOpen(true)}
                aria-label="Abrir menu"
              >
                {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
              <div className="min-w-0 flex-1">
                <TopBar title={title} />
              </div>
            </div>
            <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
          </div>
        </div>
      </ThemeProvider>
    </AuthProvider>
  );
}
