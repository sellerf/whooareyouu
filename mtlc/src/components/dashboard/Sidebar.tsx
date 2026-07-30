"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileSearch,
  CreditCard,
  Settings,
  User,
  Shield,
  LogOut,
  Wallet,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import clsx from "clsx";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, group: "PRINCIPAL" },
  { href: "/consulta", label: "Consulta", icon: FileSearch, group: "PRINCIPAL" },
  { href: "/planos", label: "Planos", icon: CreditCard, group: "PRINCIPAL" },
  { href: "/config", label: "Configurações", icon: Settings, group: "CONTA" },
  { href: "/perfil", label: "Perfil", icon: User, group: "CONTA" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut, isPlanActive } = useAuth();

  const groups = ["PRINCIPAL", "CONTA"] as const;
  const adminItem = {
    href: "/admin",
    label: "Admin",
    icon: Shield,
    group: "ADMIN",
  };

  const handleLogout = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <aside className="flex h-screen w-[250px] shrink-0 flex-col border-r border-[var(--mtlc-border)] bg-[var(--mtlc-bg-elevated)]">
      <div className="flex items-center gap-3 border-b border-[var(--mtlc-border)] px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--mtlc-accent-soft)] text-sm font-bold text-[var(--mtlc-accent)] shadow-[0_0_20px_var(--mtlc-accent-glow)]">
          M
        </div>
        <div>
          <p className="text-sm font-semibold tracking-wide text-[var(--mtlc-text)]">
            MTLC
          </p>
          <a
            href="https://linarcteam.site/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-[var(--mtlc-text-muted)] hover:text-[var(--mtlc-accent)]"
          >
            Linarc Team <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <div key={group} className="mb-5">
            <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.2em] text-[var(--mtlc-text-muted)]">
              {group}
            </p>
            <ul className="space-y-1">
              {NAV.filter((n) => n.group === group).map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={clsx(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                        active
                          ? "border border-[var(--mtlc-accent)]/40 bg-[var(--mtlc-accent-soft)] text-[var(--mtlc-accent)] shadow-[0_0_18px_var(--mtlc-accent-glow)]"
                          : "text-[var(--mtlc-text-muted)] hover:bg-white/5 hover:text-[var(--mtlc-text)]"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {profile?.is_admin && (
          <div className="mb-5">
            <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.2em] text-[var(--mtlc-text-muted)]">
              ADMIN
            </p>
            <Link
              href={adminItem.href}
              className={clsx(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                pathname === "/admin"
                  ? "border border-[var(--mtlc-accent)]/40 bg-[var(--mtlc-accent-soft)] text-[var(--mtlc-accent)]"
                  : "text-[var(--mtlc-text-muted)] hover:bg-white/5 hover:text-[var(--mtlc-text)]"
              )}
            >
              <Shield className="h-4 w-4" />
              {adminItem.label}
            </Link>
          </div>
        )}
      </nav>

      <div className="border-t border-[var(--mtlc-border)] p-4">
        <p className="mb-3 px-1 text-[10px] font-semibold tracking-[0.2em] text-[var(--mtlc-text-muted)]">
          MINHA CONTA
        </p>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => router.push("/perfil")}
            className="flex flex-col items-center gap-1 rounded-xl bg-white/5 px-2 py-3 text-[10px] text-[var(--mtlc-text-muted)] hover:bg-[var(--mtlc-accent-soft)] hover:text-[var(--mtlc-accent)]"
          >
            <User className="h-4 w-4" />
            Perfil
          </button>
          <button
            onClick={() => router.push("/planos")}
            className="flex flex-col items-center gap-1 rounded-xl bg-white/5 px-2 py-3 text-[10px] text-[var(--mtlc-text-muted)] hover:bg-[var(--mtlc-accent-soft)] hover:text-[var(--mtlc-accent)]"
          >
            <Wallet className="h-4 w-4" />
            {isPlanActive ? "Premium" : "Free"}
          </button>
          <button
            onClick={handleLogout}
            className="flex flex-col items-center gap-1 rounded-xl bg-white/5 px-2 py-3 text-[10px] text-[var(--mtlc-text-muted)] hover:bg-red-500/15 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </div>
    </aside>
  );
}
