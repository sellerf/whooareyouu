/** IP lookup — max public metadata from free APIs */

const IP_REGEX =
  /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}|(?:[a-fA-F0-9:]+))$/;

export function isValidIp(value) {
  const v = value.trim();
  if (!v) return false;
  if (v.includes(":") && !v.includes(".")) {
    return /^[a-fA-F0-9:]+$/.test(v) && v.includes(":");
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(v)) {
    return v.split(".").every((o) => Number(o) >= 0 && Number(o) <= 255);
  }
  return IP_REGEX.test(v);
}

async function fetchJson(url, timeout = 10000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/** Current public IPs (v4 / v6 when available) */
export async function getMyIps() {
  const result = { ipv4: null, ipv6: null, primary: null };

  const tasks = [
    fetchJson("https://api.ipify.org?format=json")
      .then((d) => {
        if (d?.ip) result.ipv4 = d.ip;
      })
      .catch(() => {}),
    fetchJson("https://api64.ipify.org?format=json")
      .then((d) => {
        if (d?.ip?.includes(":")) result.ipv6 = d.ip;
        else if (d?.ip && !result.ipv4) result.ipv4 = d.ip;
      })
      .catch(() => {}),
  ];

  await Promise.all(tasks);

  if (!result.ipv4 && !result.ipv6) {
    try {
      const d = await fetchJson("https://ipwho.is/");
      if (d?.success && d.ip) {
        if (d.ip.includes(":")) result.ipv6 = d.ip;
        else result.ipv4 = d.ip;
      }
    } catch {
      /* ignore */
    }
  }

  result.primary = result.ipv4 || result.ipv6;
  return result;
}

function normalizeIpwho(data) {
  if (!data || data.success === false) {
    throw new Error(data?.message || "IP não encontrado");
  }

  const conn = data.connection || {};
  const tz = data.timezone || {};
  const cur = data.currency || {};
  const sec = data.security || {};
  const flag = data.flag || {};

  return {
    source: "ipwho.is",
    ip: data.ip,
    type: data.type || (data.ip?.includes(":") ? "IPv6" : "IPv4"),
    continent: data.continent || "—",
    continentCode: data.continent_code || "—",
    country: data.country || "—",
    countryCode: data.country_code || "—",
    region: data.region || "—",
    regionCode: data.region_code || "—",
    city: data.city || "—",
    postal: data.postal || "—",
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    isEu: Boolean(data.is_eu),
    callingCode: data.calling_code ? `+${data.calling_code}` : "—",
    capital: data.capital || "—",
    borders: data.borders || "—",
    flagEmoji: flag.emoji || "",
    flagImg: flag.img || "",
    asn: conn.asn != null ? String(conn.asn) : "—",
    org: conn.org || "—",
    isp: conn.isp || "—",
    domain: conn.domain || "—",
    timezoneId: tz.id || "—",
    timezoneAbbr: tz.abbr || "—",
    timezoneUtc: tz.utc || "—",
    timezoneOffset: tz.offset ?? null,
    timezoneDst: tz.is_dst,
    currentTime: tz.current_time || "—",
    currencyName: cur.name || "—",
    currencyCode: cur.code || "—",
    currencySymbol: cur.symbol || "—",
    security: {
      anonymous: Boolean(sec.anonymous),
      proxy: Boolean(sec.proxy),
      vpn: Boolean(sec.vpn),
      tor: Boolean(sec.tor),
      hosting: Boolean(sec.hosting),
    },
    raw: data,
  };
}

function normalizeIpapi(data) {
  if (!data || data.error) {
    throw new Error(data?.reason || "Falha no ipapi.co");
  }

  return {
    source: "ipapi.co",
    ip: data.ip,
    type: data.version || (data.ip?.includes(":") ? "IPv6" : "IPv4"),
    continent: data.continent_name || "—",
    continentCode: data.continent_code || "—",
    country: data.country_name || "—",
    countryCode: data.country_code || "—",
    region: data.region || "—",
    regionCode: data.region_code || "—",
    city: data.city || "—",
    postal: data.postal || "—",
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    isEu: Boolean(data.in_eu),
    callingCode: data.country_calling_code || "—",
    capital: data.country_capital || "—",
    borders: Array.isArray(data.country_borders)
      ? data.country_borders.join(",")
      : "—",
    flagEmoji: "",
    flagImg: data.country_code
      ? `https://cdn.ipwhois.io/flags/${String(data.country_code).toLowerCase()}.svg`
      : "",
    asn: data.asn || "—",
    org: data.org || "—",
    isp: data.org || "—",
    domain: "—",
    timezoneId: data.timezone || "—",
    timezoneAbbr: data.utc_offset || "—",
    timezoneUtc: data.utc_offset || "—",
    timezoneOffset: null,
    timezoneDst: null,
    currentTime: "—",
    currencyName: data.currency_name || "—",
    currencyCode: data.currency || "—",
    currencySymbol: "—",
    security: {
      anonymous: false,
      proxy: false,
      vpn: false,
      tor: false,
      hosting: false,
    },
    raw: data,
  };
}

/** Enrich with secondary sources when fields are missing */
async function enrich(info) {
  const tasks = [];

  if (info.ip) {
    tasks.push(
      fetchJson(`https://ipapi.co/${encodeURIComponent(info.ip)}/json/`)
        .then((d) => {
          if (d?.error) return;
          if ((!info.latitude || !info.longitude) && d.latitude && d.longitude) {
            info.latitude = d.latitude;
            info.longitude = d.longitude;
          }
          if (info.postal === "—" && d.postal) info.postal = d.postal;
          if (info.asn === "—" && d.asn) info.asn = d.asn;
          if ((info.org === "—" || !info.org) && d.org) {
            info.org = d.org;
            info.isp = d.org;
          }
          if (info.callingCode === "—" && d.country_calling_code) {
            info.callingCode = d.country_calling_code;
          }
          if (info.currencyName === "—" && d.currency_name) {
            info.currencyName = d.currency_name;
            info.currencyCode = d.currency || info.currencyCode;
          }
          info.languages = d.languages || info.languages;
          info.countryArea = d.country_area ?? null;
          info.countryPopulation = d.country_population ?? null;
          info.network = d.network || "—";
        })
        .catch(() => {})
    );

    // proxy / hosting (free HTTP endpoint — works on localhost & HTTP hosts)
    tasks.push(
      fetchJson(
        `http://ip-api.com/json/${encodeURIComponent(info.ip)}?fields=status,message,proxy,hosting,mobile,query,isp,org,as,reverse`
      )
        .then((d) => {
          if (d?.status !== "success") return;
          if (d.proxy) info.security.proxy = true;
          if (d.hosting) info.security.hosting = true;
          if (d.mobile != null) info.mobile = Boolean(d.mobile);
          if (d.reverse) info.reverseDns = d.reverse;
          if ((info.asn === "—" || !info.asn) && d.as) {
            info.asn = String(d.as).replace(/^AS/i, "").split(" ")[0];
          }
          if (info.isp === "—" && d.isp) info.isp = d.isp;
          if (info.org === "—" && d.org) info.org = d.org;
        })
        .catch(() => {})
    );
  }

  await Promise.all(tasks);
  applyHostingHeuristics(info);
  return info;
}

const HOSTING_HINTS =
  /\b(vpn|proxy|hosting|cloud|amazon|aws|google cloud|microsoft|azure|digitalocean|linode|vultr|ovh|hetzner|contabo|scaleway|oracle cloud|alibaba|cloudflare|fastly|akamai|datacenter|data center|colocation|vps|dedicated)\b/i;

function applyHostingHeuristics(info) {
  const blob = `${info.org} ${info.isp} ${info.domain}`.toLowerCase();
  if (HOSTING_HINTS.test(blob)) {
    info.security.hosting = true;
  }
  if (/\bvpn\b/i.test(blob)) {
    info.security.vpn = true;
  }
  if (/\bproxy\b/i.test(blob)) {
    info.security.proxy = true;
  }
}

export async function lookupIp(ip) {
  const target = (ip || "").trim();
  const path = target ? encodeURIComponent(target) : "";

  let info;
  try {
    const data = await fetchJson(`https://ipwho.is/${path}`);
    info = normalizeIpwho(data);
  } catch (err) {
    try {
      const url = target
        ? `https://ipapi.co/${encodeURIComponent(target)}/json/`
        : "https://ipapi.co/json/";
      const data = await fetchJson(url);
      info = normalizeIpapi(data);
    } catch {
      throw new Error(err?.message || "Não foi possível consultar este IP.");
    }
  }

  return enrich(info);
}

export function buildReportText(info, dualIps = {}) {
  const s = info.security || {};
  const lines = [
    `Linarc Geolocalize — Relatório`,
    `IP: ${info.ip} (${info.type})`,
    dualIps.ipv4 ? `IPv4: ${dualIps.ipv4}` : null,
    dualIps.ipv6 ? `IPv6: ${dualIps.ipv6}` : null,
    `Local: ${info.city}, ${info.region}, ${info.country} (${info.countryCode})`,
    `Continente: ${info.continent} (${info.continentCode})`,
    `Coords: ${info.latitude}, ${info.longitude}`,
    `Postal: ${info.postal}`,
    `Capital: ${info.capital} · DDI: ${info.callingCode} · UE: ${info.isEu ? "sim" : "não"}`,
    `Fronteiras: ${info.borders}`,
    `ISP: ${info.isp}`,
    `ORG: ${info.org}`,
    `ASN: ${info.asn}`,
    `Domínio: ${info.domain}`,
    info.network ? `Rede: ${info.network}` : null,
    info.reverseDns ? `Reverse DNS: ${info.reverseDns}` : null,
    info.mobile != null ? `Móvel: ${info.mobile ? "sim" : "não"}` : null,
    `Timezone: ${info.timezoneId} (${info.timezoneAbbr}) ${info.timezoneUtc}`,
    `Hora local: ${info.currentTime}`,
    `Moeda: ${info.currencyName} (${info.currencyCode} ${info.currencySymbol})`,
    `Segurança — VPN: ${s.vpn} · Proxy: ${s.proxy} · Tor: ${s.tor} · Hosting: ${s.hosting} · Anônimo: ${s.anonymous}`,
    `Fonte: ${info.source}`,
  ].filter(Boolean);

  return lines.join("\n");
}
