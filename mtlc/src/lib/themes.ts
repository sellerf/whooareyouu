export type ThemeId = "lua" | "royal" | "crimson" | "emerald" | "azure" | "amber";

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  description: string;
  accent: string;
  accentSoft: string;
  accentGlow: string;
  bg: string;
  bgElevated: string;
  bgCard: string;
  border: string;
  text: string;
  textMuted: string;
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  lua: {
    id: "lua",
    name: "Lua",
    description: "Preto e branco clássico",
    accent: "#f5f5f5",
    accentSoft: "rgba(245,245,245,0.12)",
    accentGlow: "rgba(245,245,245,0.25)",
    bg: "#050505",
    bgElevated: "#0c0c0c",
    bgCard: "#111111",
    border: "rgba(255,255,255,0.08)",
    text: "#ffffff",
    textMuted: "#a3a3a3",
  },
  royal: {
    id: "royal",
    name: "Royal",
    description: "Roxo e preto premium",
    accent: "#a855f7",
    accentSoft: "rgba(168,85,247,0.14)",
    accentGlow: "rgba(168,85,247,0.35)",
    bg: "#07050c",
    bgElevated: "#100a18",
    bgCard: "#15101f",
    border: "rgba(168,85,247,0.18)",
    text: "#ffffff",
    textMuted: "#b6a6c9",
  },
  crimson: {
    id: "crimson",
    name: "Crimson",
    description: "Vermelho intenso",
    accent: "#ef4444",
    accentSoft: "rgba(239,68,68,0.14)",
    accentGlow: "rgba(239,68,68,0.35)",
    bg: "#090505",
    bgElevated: "#140a0a",
    bgCard: "#1a0f0f",
    border: "rgba(239,68,68,0.18)",
    text: "#ffffff",
    textMuted: "#c9a6a6",
  },
  emerald: {
    id: "emerald",
    name: "Emerald",
    description: "Verde neon (estilo Uork)",
    accent: "#00ff80",
    accentSoft: "rgba(0,255,128,0.12)",
    accentGlow: "rgba(0,255,128,0.35)",
    bg: "#050805",
    bgElevated: "#0a100c",
    bgCard: "#0f1612",
    border: "rgba(0,255,128,0.16)",
    text: "#ffffff",
    textMuted: "#9eb5a6",
  },
  azure: {
    id: "azure",
    name: "Azure",
    description: "Azul elétrico",
    accent: "#38bdf8",
    accentSoft: "rgba(56,189,248,0.14)",
    accentGlow: "rgba(56,189,248,0.35)",
    bg: "#04080c",
    bgElevated: "#0a1218",
    bgCard: "#0f1820",
    border: "rgba(56,189,248,0.18)",
    text: "#ffffff",
    textMuted: "#a6b8c9",
  },
  amber: {
    id: "amber",
    name: "Amber",
    description: "Âmbar dourado",
    accent: "#f59e0b",
    accentSoft: "rgba(245,158,11,0.14)",
    accentGlow: "rgba(245,158,11,0.35)",
    bg: "#0a0804",
    bgElevated: "#14100a",
    bgCard: "#1a150f",
    border: "rgba(245,158,11,0.18)",
    text: "#ffffff",
    textMuted: "#c9b8a6",
  },
};

export const THEME_LIST = Object.values(THEMES);

export function isThemeId(value: string): value is ThemeId {
  return value in THEMES;
}
