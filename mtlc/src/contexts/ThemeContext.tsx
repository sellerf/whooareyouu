"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { THEMES, isThemeId, type ThemeId, type ThemeConfig } from "@/lib/themes";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";

interface ThemeContextValue {
  themeId: ThemeId;
  theme: ThemeConfig;
  setTheme: (id: ThemeId) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function applyCssVars(theme: ThemeConfig) {
  const root = document.documentElement;
  root.style.setProperty("--mtlc-accent", theme.accent);
  root.style.setProperty("--mtlc-accent-soft", theme.accentSoft);
  root.style.setProperty("--mtlc-accent-glow", theme.accentGlow);
  root.style.setProperty("--mtlc-bg", theme.bg);
  root.style.setProperty("--mtlc-bg-elevated", theme.bgElevated);
  root.style.setProperty("--mtlc-bg-card", theme.bgCard);
  root.style.setProperty("--mtlc-border", theme.border);
  root.style.setProperty("--mtlc-text", theme.text);
  root.style.setProperty("--mtlc-text-muted", theme.textMuted);
  root.dataset.theme = theme.id;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { profile, user, patchProfile } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const themeId: ThemeId =
    profile?.theme && isThemeId(profile.theme) ? profile.theme : "lua";
  const theme = THEMES[themeId];

  useEffect(() => {
    applyCssVars(theme);
  }, [theme]);

  const setTheme = useCallback(
    async (id: ThemeId) => {
      applyCssVars(THEMES[id]);
      patchProfile({ theme: id });
      if (!user) return;
      const { error } = await supabase
        .from("profiles")
        .update({ theme: id })
        .eq("id", user.id);
      if (error) throw error;
    },
    [supabase, user, patchProfile]
  );

  return (
    <ThemeContext.Provider value={{ themeId, theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme deve ser usado dentro de ThemeProvider");
  return ctx;
}
