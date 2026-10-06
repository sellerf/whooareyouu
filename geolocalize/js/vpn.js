/** Privacy signals inferred from public metadata about the selected IP. */

import { isValidIp, lookupIp } from "./api.js";

export async function runVpnTest(targetIp, onProgress) {
  const target = String(targetIp ?? "").trim();
  if (!isValidIp(target)) {
    throw new Error("Digite um IP válido no campo de consulta antes de analisar.");
  }

  onProgress?.(`Consultando sinais públicos do IP ${target}…`);
  const info = await lookupIp(target, { preferSecurity: true });
  const security = info.security || {};
  const flagsAvailable = security.available !== false;
  const flagged = Boolean(
    security.vpn || security.proxy || security.tor || security.anonymous
  );

  const checks = [
    {
      id: "public",
      state: "pass",
      label: "CONSULTADO",
      detail: `${info.ip} · ${info.city}, ${info.country}`,
    },
    {
      id: "flags",
      state: flagged ? "pass" : "warn",
      label: flagged ? "DETECTADO" : !flagsAvailable ? "NÃO DISPONÍVEL" : "SEM SINAL",
      detail: flagged
        ? `Sinais detectados · VPN: ${yn(security.vpn)} · Proxy: ${yn(security.proxy)} · Tor: ${yn(security.tor)}`
        : !flagsAvailable
        ? "O provedor disponível não retornou dados de detecção para este IP."
        : `VPN: ${yn(security.vpn)} · Proxy: ${yn(security.proxy)} · Tor: ${yn(security.tor)} · Anônimo: ${yn(security.anonymous)}`,
    },
    {
      id: "hosting",
      state: security.hosting ? "pass" : "warn",
      label: security.hosting ? "DATACENTER" : !flagsAvailable ? "NÃO DISPONÍVEL" : "SEM SINAL",
      detail: security.hosting
        ? "O IP aparece associado a hosting/datacenter, algo comum em alguns serviços de VPN."
        : !flagsAvailable
        ? "Não há dados de hosting disponíveis para este IP."
        : `ISP/organização: ${info.isp || info.org || "não informado"}`,
    },
    ...["webrtc", "timezone", "dns"].map((id) => ({
      id,
      state: "warn",
      label: "NÃO APLICÁVEL",
      detail:
        "Esse sinal depende do navegador/dispositivo que usa o IP e não pode ser consultado remotamente.",
    })),
  ];

  let score = 0;
  if (security.vpn) score += 45;
  if (security.proxy) score += 25;
  if (security.tor) score += 35;
  if (security.hosting) score += 20;
  if (security.anonymous) score += 15;
  score = Math.min(score, 100);

  let verdict = flagsAvailable ? "Sem sinal público forte de VPN" : "Detecção de VPN indisponível";
  let verdictDetail = "As fontes consultadas não marcaram este IP como VPN, proxy ou Tor. Isso não comprova que o endereço seja residencial.";
  if (security.tor || security.vpn || security.proxy) {
    verdict = "Sinais de VPN, proxy ou Tor";
    verdictDetail = "Metadados públicos associam este IP a um serviço de anonimização.";
  } else if (!flagsAvailable) {
    verdictDetail = "A localização foi consultada, mas o provedor não retornou flags de VPN/proxy para este IP.";
  } else if (security.hosting) {
    verdict = "IP associado a hosting";
    verdictDetail = "Um endereço de datacenter pode ser usado por VPN, mas esse dado sozinho não confirma isso.";
  }

  onProgress?.(`Análise concluída para ${info.ip}.`);
  return { targetIp: info.ip, info, checks, score, verdict, verdictDetail };
}

function yn(value) {
  return value ? "sim" : "não";
}
