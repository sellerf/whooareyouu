export interface Profile {
  id: string;
  username: string;
  email: string;
  theme: string;
  is_admin: boolean;
  plan_active: boolean;
  plan_expires_at: string | null;
  free_queries_used: number;
  free_queries_date: string | null;
  created_at: string;
  updated_at: string;
}

export function hasActivePlan(profile: Profile | null | undefined): boolean {
  if (!profile?.plan_active || !profile.plan_expires_at) return false;
  return new Date(profile.plan_expires_at).getTime() > Date.now();
}

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function daysLeftInPlan(profile: Profile | null | undefined): number {
  if (!hasActivePlan(profile) || !profile?.plan_expires_at) return 0;
  const ms = new Date(profile.plan_expires_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function planUsagePercent(profile: Profile | null | undefined): number {
  if (!hasActivePlan(profile) || !profile?.plan_expires_at) return 0;
  const expires = new Date(profile.plan_expires_at).getTime();
  // Assume ciclo de 30 dias para visualização; se renovação antecipada, usa janela restante
  const start = expires - 30 * 24 * 60 * 60 * 1000;
  const total = expires - start;
  const used = Date.now() - start;
  return Math.min(100, Math.max(0, Math.round((used / total) * 100)));
}
