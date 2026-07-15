/** VPN / anonymity checks using public signals */

import { getMyIps, lookupIp } from "./api.js";

/**
 * Collect candidate local/private IPs via WebRTC.
 * A leak means the VPN did not fully conceal the real interface address.
 */
export function detectWebRtcIps() {
  return new Promise((resolve) => {
    const ips = new Set();
    let pc;
    let done = false;

    const finish = (list) => {
      if (done) return;
      done = true;
      clearTimeout(deadline);
      try {
        pc?.close();
      } catch {
        /* ignore */
      }
      resolve(list);
    };

    const deadline = setTimeout(() => finish(Array.from(ips)), 3500);

    try {
      const RTCPeer =
        window.RTCPeerConnection ||
        window.webkitRTCPeerConnection ||
        window.mozRTCPeerConnection;

      if (!RTCPeer) {
        finish([]);
        return;
      }

      pc = new RTCPeer({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });

      pc.createDataChannel("linarc");

      pc.onicecandidate = (e) => {
        if (!e.candidate || !e.candidate.candidate) return;
        const cand = e.candidate.candidate;
        const matches = cand.match(
          /([0-9]{1,3}(?:\.[0-9]{1,3}){3})|([a-fA-F0-9:]+)/g
        );
        if (!matches) return;
        for (const m of matches) {
          if (m === "0.0.0.0") continue;
          if (/^\d+\.\d+\.\d+\.\d+$/.test(m) || m.includes(":")) {
            ips.add(m);
          }
        }
      };

      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .catch(() => finish(Array.from(ips)));
    } catch {
      finish([]);
    }
  });
}

function isPrivateIp(ip) {
  if (!ip) return false;
  if (ip.includes(":")) {
    const lower = ip.toLowerCase();
    return (
      lower.startsWith("fc") ||
      lower.startsWith("fd") ||
      lower.startsWith("fe80") ||
      lower === "::1"
    );
  }
  const p = ip.split(".").map(Number);
  if (p.length !== 4) return false;
  if (p[0] === 10) return true;
  if (p[0] === 127) return true;
  if (p[0] === 192 && p[1] === 168) return true;
  if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
  if (p[0] === 169 && p[1] === 254) return true;
  return false;
}

function browserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown";
  } catch {
    return "unknown";
  }
}

function browserUtcOffsetMinutes() {
  return -new Date().getTimezoneOffset();
}

/**
 * Run full VPN analysis.
 * Higher score ≈ more likely that traffic is masked / VPN-like.
 * Also reports whether WebRTC leaks undermine that masking.
 */
export async function runVpnTest(onProgress) {
  const progress = (msg) => onProgress?.(msg);

  progress("Descobrindo IP público…");
  const myIps = await getMyIps();
  if (!myIps.primary) {
    throw new Error("Não foi possível obter o IP público.");
  }

  progress("Consultando metadados e flags de segurança…");
  const info = await lookupIp(myIps.primary);

  progress("Analisando WebRTC…");
  const webrtcIps = await detectWebRtcIps();
  const publicSet = new Set(
    [myIps.ipv4, myIps.ipv6, myIps.primary].filter(Boolean)
  );
  const privateLeaks = webrtcIps.filter(isPrivateIp);
  const mismatchedPublic = webrtcIps.filter(
    (ip) => !isPrivateIp(ip) && !publicSet.has(ip)
  );

  progress("Comparando fusos horários…");
  const tzBrowser = browserTimezone();
  const tzIp = info.timezoneId;
  const browserOffsetMin = browserUtcOffsetMinutes();
  let ipOffsetMin = null;
  if (typeof info.timezoneOffset === "number") {
    ipOffsetMin = info.timezoneOffset / 60;
  } else if (info.timezoneUtc && /[+-]\d{2}:\d{2}/.test(info.timezoneUtc)) {
    const m = info.timezoneUtc.match(/([+-])(\d{2}):(\d{2})/);
    if (m) {
      const sign = m[1] === "-" ? -1 : 1;
      ipOffsetMin = sign * (Number(m[2]) * 60 + Number(m[3]));
    }
  }
  const tzMismatch =
    tzIp &&
    tzIp !== "—" &&
    tzBrowser !== "unknown" &&
    tzBrowser !== tzIp &&
    (ipOffsetMin == null || Math.abs(ipOffsetMin - browserOffsetMin) > 30);

  progress("Checando consistência entre fontes…");
  let dnsNote = "Fontes alinhadas no IP atual.";
  let dnsOk = true;
  try {
    const alt = await fetch("https://api.ipify.org?format=json").then((r) =>
      r.json()
    );
    if (alt?.ip && myIps.ipv4 && alt.ip !== myIps.ipv4 && !myIps.ipv6) {
      dnsOk = false;
      dnsNote = `Divergência: ${alt.ip} ≠ ${myIps.ipv4}`;
    } else if (alt?.ip) {
      dnsNote = `Resolução estável (${alt.ip}).`;
    }
  } catch {
    dnsNote = "Não foi possível revalidar o IP (rede).";
    dnsOk = false;
  }

  const sec = info.security || {};
  const checks = [];

  // 1. Public IP
  checks.push({
    id: "public",
    state: "pass",
    label: "OK",
    detail: `IPv4 ${myIps.ipv4 || "—"} · IPv6 ${myIps.ipv6 || "—"} · ${info.city}, ${info.country}`,
  });

  // 2. VPN / Proxy / Tor flags
  const flagged = sec.vpn || sec.proxy || sec.tor || sec.anonymous;
  checks.push({
    id: "flags",
    state: flagged ? "pass" : "warn",
    label: flagged ? "DETECTADO" : "LIMPO",
    detail: `VPN: ${yn(sec.vpn)} · Proxy: ${yn(sec.proxy)} · Tor: ${yn(sec.tor)} · Anônimo: ${yn(sec.anonymous)}`,
  });

  // 3. Hosting / datacenter
  checks.push({
    id: "hosting",
    state: sec.hosting ? "pass" : "warn",
    label: sec.hosting ? "DATACENTER" : "RESIDENCIAL?",
    detail: sec.hosting
      ? "IP associado a hosting/datacenter (comum em VPN)."
      : `ISP/ORG: ${info.isp || info.org}`,
  });

  // 4. WebRTC
  let webrtcState = "pass";
  let webrtcLabel = "OK";
  let webrtcDetail = "Nenhum endereço local extraído.";
  if (mismatchedPublic.length) {
    webrtcState = "fail";
    webrtcLabel = "VAZAMENTO";
    webrtcDetail = `IP público diferente via WebRTC: ${mismatchedPublic.join(", ")}`;
  } else if (privateLeaks.length) {
    webrtcState = "warn";
    webrtcLabel = "LOCAL";
    webrtcDetail = `Interfaces locais: ${privateLeaks.join(", ")} (normal em muitos browsers).`;
  } else if (webrtcIps.length) {
    webrtcDetail = `Candidatos: ${webrtcIps.join(", ")}`;
  }
  checks.push({
    id: "webrtc",
    state: webrtcState,
    label: webrtcLabel,
    detail: webrtcDetail,
  });

  // 5. Timezone
  checks.push({
    id: "timezone",
    state: tzMismatch ? "pass" : "warn",
    label: tzMismatch ? "DIVERGE" : "ALINHADO",
    detail: `Browser: ${tzBrowser} · IP: ${tzIp || "—"}`,
  });

  // 6. DNS / resolution consistency
  checks.push({
    id: "dns",
    state: dnsOk ? "pass" : "warn",
    label: dnsOk ? "OK" : "ATENÇÃO",
    detail: dnsNote,
  });

  // Score: likelihood of VPN-like masking (0–100)
  let score = 20;
  if (sec.vpn) score += 35;
  if (sec.proxy) score += 20;
  if (sec.tor) score += 25;
  if (sec.hosting) score += 15;
  if (sec.anonymous) score += 10;
  if (tzMismatch) score += 10;
  if (mismatchedPublic.length) score -= 30; // leak undermines VPN
  score = Math.max(0, Math.min(100, score));

  let verdict;
  let verdictDetail;
  if (mismatchedPublic.length && flagged) {
    verdict = "VPN suspeita com vazamento";
    verdictDetail =
      "Flags indicam mascaramento, mas o WebRTC expôs outro IP público.";
  } else if (flagged || sec.hosting) {
    verdict = score >= 60 ? "Provável VPN / proxy ativo" : "Sinais de mascaramento";
    verdictDetail =
      "Metadados públicos sugerem tráfego via VPN, proxy ou datacenter.";
  } else if (tzMismatch) {
    verdict = "IP limpo, fuso divergente";
    verdictDetail =
      "Sem flags fortes de VPN; o fuso do browser não bate com o do IP.";
  } else {
    verdict = "Sem sinais fortes de VPN";
    verdictDetail =
      "O IP público parece residencial/ISP sem flags de anonimato.";
  }

  return {
    myIps,
    info,
    webrtcIps,
    checks,
    score,
    verdict,
    verdictDetail,
  };
}

function yn(v) {
  return v ? "sim" : "não";
}
