/** IP lookup — max public metadata from free APIs */

const LOOKUP_CACHE_TTL_MS = 10 * 60 * 1000;
const lookupCache = new Map();
const COUNTRY_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const countryCache = new Map();

const CONTINENTS = {
  AF: "África",
  AN: "Antártida",
  AS: "Ásia",
  EU: "Europa",
  NA: "América do Norte",
  OC: "Oceania",
  SA: "América do Sul",
};

const EU_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE",
]);

function normalizeContinent(value, code = "—") {
  const candidate = String(value || "—");
  const inferredCode = String(code || (/^[A-Z]{2}$/.test(candidate) ? candidate : "—")).toUpperCase();
  return {
    continent: CONTINENTS[inferredCode] || candidate,
    continentCode: inferredCode,
  };
}

function countryIsEu(countryCode) {
  return EU_COUNTRIES.has(String(countryCode || "").toUpperCase());
}

export function isValidIp(value) {
  const v = String(value ?? "").trim();
  if (!v || v.length > 45) return false;
  if (/^[0-9.]+$/.test(v)) {
    const octets = v.split(".");
    return octets.length === 4 && octets.every((octet) =>
      /^(0|[1-9]\d{0,2})$/.test(octet) && Number(octet) <= 255
    );
  }
  if (!/^[a-fA-F0-9:.]+$/.test(v) || !v.includes(":")) return false;
  try {
    return new URL(`http://[${v}]/`).hostname.length > 2;
  } catch {
    return false;
  }
}

async function fetchJson(url, timeout = 10000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) {
      const error = new Error(`HTTP ${res.status}`);
      error.status = res.status;
      error.retryAfter = res.headers?.get?.("Retry-After") || null;
      throw error;
    }
    return await res.json();
  } finally {
    clearTimeout(t);
  }
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
  const continent = normalizeContinent(data.continent, data.continent_code);

  return {
    source: "ipwho.is",
    ip: data.ip,
    type: data.type || (data.ip?.includes(":") ? "IPv6" : "IPv4"),
    ...continent,
    country: data.country || "—",
    countryCode: data.country_code || "—",
    region: data.region || "—",
    regionCode: data.region_code || "—",
    city: data.city || "—",
    postal: data.postal || "—",
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    isEu: typeof data.is_eu === "boolean" ? data.is_eu : null,
    callingCode: data.calling_code ? `+${data.calling_code}` : "—",
    capital: data.capital || "—",
    borders: data.borders || "—",
    countryPopulation: null,
    flagEmoji: flag.emoji || "",
    flagImg: /^[A-Za-z]{2}$/.test(data.country_code || "")
      ? `https://cdn.ipwhois.io/flags/${data.country_code.toLowerCase()}.svg`
      : "",
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
      available: Object.keys(sec).length > 0,
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

  const continent = normalizeContinent(data.continent_name, data.continent_code);

  return {
    source: "ipapi.co",
    ip: data.ip,
    type: data.version || (data.ip?.includes(":") ? "IPv6" : "IPv4"),
    ...continent,
    country: data.country_name || "—",
    countryCode: data.country_code || "—",
    region: data.region || "—",
    regionCode: data.region_code || "—",
    city: data.city || "—",
    postal: data.postal || "—",
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    isEu: typeof data.in_eu === "boolean" ? data.in_eu : null,
    callingCode: data.country_calling_code || "—",
    capital: data.country_capital || "—",
    borders: Array.isArray(data.country_borders)
      ? data.country_borders.join(",")
      : "—",
    countryPopulation: null,
    flagEmoji: "",
    flagImg: /^[A-Za-z]{2}$/.test(data.country_code || "")
      ? `https://cdn.ipwhois.io/flags/${data.country_code.toLowerCase()}.svg`
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
      available: false,
      anonymous: false,
      proxy: false,
      vpn: false,
      tor: false,
      hosting: false,
    },
    raw: data,
  };
}

function normalizeIpapiIs(data) {
  if (!data || data.error || !isValidIp(data.ip)) {
    throw new Error(data?.message || "Resposta inválida do serviço de geolocalização.");
  }

  const location = data.location || {};
  const company = data.company;
  const companyName = typeof company === "string" ? company : company?.name;
  const timezone = location.timezone || data.timezone || "—";
  const locationField = (key, fallback) => location[key] ?? data[key] ?? fallback;
  const flagsAvailable = ["is_vpn", "is_proxy", "is_tor", "is_datacenter"].some(
    (key) => typeof data[key] === "boolean"
  );
  const continentValue = locationField("continent", "—");
  const continent = normalizeContinent(
    continentValue,
    locationField("continent_code", continentValue)
  );

  return {
    source: "ipapi.is",
    ip: data.ip,
    type: data.ip.includes(":") ? "IPv6" : "IPv4",
    ...continent,
    country: locationField("country", "—"),
    countryCode: locationField("country_code", "—"),
    region: locationField("region", "—"),
    regionCode: locationField("region_code", "—"),
    city: locationField("city", "—"),
    postal: locationField("zip", "—"),
    latitude: locationField("latitude", locationField("lat", null)),
    longitude: locationField("longitude", locationField("lon", null)),
    isEu: typeof location.is_eu_member === "boolean" ? location.is_eu_member : null,
    callingCode: location.calling_code || "—",
    capital: "—",
    borders: "—",
    countryPopulation: null,
    flagEmoji: "",
    flagImg: /^[A-Za-z]{2}$/.test(locationField("country_code", ""))
      ? `https://cdn.ipwhois.io/flags/${locationField("country_code", "").toLowerCase()}.svg`
      : "",
    asn: data.asn || "—",
    org: companyName || data.asn || "—",
    isp: companyName || "—",
    domain: "—",
    timezoneId: timezone,
    timezoneAbbr: "—",
    timezoneUtc: location.utcoffset || "—",
    timezoneOffset: null,
    timezoneDst: location.is_dst ?? null,
    currentTime: location.local_time || "—",
    currencyName: "—",
    currencyCode: location.currency_code || "—",
    currencySymbol: "—",
    security: {
      available: flagsAvailable,
      anonymous: Boolean(data.is_abuser),
      proxy: Boolean(data.is_proxy),
      vpn: Boolean(data.is_vpn),
      tor: Boolean(data.is_tor),
      hosting: Boolean(data.is_datacenter),
    },
    raw: data,
  };
}

function normalizeFreeIpApi(data) {
  if (!data || !isValidIp(data.ipAddress)) {
    throw new Error("Resposta inválida do serviço alternativo de geolocalização.");
  }
  const continent = normalizeContinent(data.continent, data.continentCode);
  return {
    source: "freeipapi.com",
    ip: data.ipAddress,
    type: data.ipVersion === 6 ? "IPv6" : "IPv4",
    ...continent,
    country: data.countryName || "—",
    countryCode: data.countryCode || "—",
    region: data.regionName || "—",
    regionCode: data.regionCode || "—",
    city: data.cityName || "—",
    postal: data.zipCode || "—",
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    isEu: null,
    callingCode: Array.isArray(data.phoneCodes) && data.phoneCodes.length
      ? `+${data.phoneCodes[0]}`
      : "—",
    capital: data.capital || "—",
    borders: "—",
    countryPopulation: null,
    flagEmoji: "",
    flagImg: /^[A-Za-z]{2}$/.test(data.countryCode || "")
      ? `https://cdn.ipwhois.io/flags/${data.countryCode.toLowerCase()}.svg`
      : "",
    asn: data.asn ? String(data.asn) : "—",
    org: data.asnOrganization || "—",
    isp: data.asnOrganization || "—",
    domain: "—",
    timezoneId: Array.isArray(data.timeZones) ? (data.timeZones[0] || "—") : "—",
    timezoneAbbr: "—",
    timezoneUtc: "—",
    timezoneOffset: null,
    timezoneDst: null,
    currentTime: "—",
    currencyName: "—",
    currencyCode: Array.isArray(data.currencies) ? (data.currencies[0] || "—") : "—",
    currencySymbol: "—",
    security: {
      available: typeof data.isProxy === "boolean",
      anonymous: false,
      proxy: Boolean(data.isProxy),
      vpn: false,
      tor: false,
      hosting: false,
    },
    raw: data,
  };
}

async function getCountryDetails(countryCode) {
  const code = String(countryCode || "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;

  const cached = countryCache.get(code);
  if (cached && Date.now() - cached.at < COUNTRY_CACHE_TTL_MS) return cached.data;

  try {
    const fields = "capital,region,subregion,population,borders,callingCodes,regionalBlocs";
    const details = await fetchJson(
      `https://countries.dev/alpha/${code}?fields=${fields}`,
      5000
    );
    if (!details || details.alpha2Code?.toUpperCase() !== code) return null;
    countryCache.set(code, { at: Date.now(), data: details });
    return details;
  } catch {
    return null;
  }
}

function enrichCountryInfo(info, details) {
  if (details) {
    if (info.capital === "—" && details.capital) info.capital = details.capital;
    if (info.borders === "—" && Array.isArray(details.borders)) {
      info.borders = details.borders.length ? details.borders.join(", ") : "Nenhuma fronteira terrestre";
    }
    if (info.callingCode === "—" && Array.isArray(details.callingCodes) && details.callingCodes.length) {
      info.callingCode = `+${details.callingCodes[0]}`;
    }
    if (info.countryPopulation == null && Number.isFinite(Number(details.population))) {
      info.countryPopulation = Number(details.population);
    }
    if (info.continent === "—") {
      const continentName = details.subregion || details.region;
      const match = Object.entries(CONTINENTS).find(([, name]) => name === continentName);
      if (continentName) {
        info.continent = continentName;
        if (match) info.continentCode = match[0];
      }
    }
    if (typeof info.isEu !== "boolean") {
      const blocMembership = Array.isArray(details.regionalBlocs) && details.regionalBlocs.some(
        (bloc) => String(bloc.acronym || bloc.code || "").toUpperCase() === "EU"
      );
      info.isEu = blocMembership || countryIsEu(info.countryCode);
    }
  } else if (typeof info.isEu !== "boolean" && info.countryCode && info.countryCode !== "—") {
    info.isEu = countryIsEu(info.countryCode);
  }
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

export async function lookupIp(ip, { preferSecurity = false } = {}) {
  const target = String(ip ?? "").trim();
  if (!isValidIp(target)) throw new Error("Digite um endereço IPv4 ou IPv6 válido.");
  const path = encodeURIComponent(target);

  const cacheKey = `${preferSecurity ? "security" : "location"}:${target}`;
  const cached = lookupCache.get(cacheKey);
  if (cached && Date.now() - cached.at < LOOKUP_CACHE_TTL_MS) return cached.info;

  const providers = preferSecurity
    ? [
        [() => fetchJson(`https://ipwho.is/${path}`), normalizeIpwho],
        [() => fetchJson(`https://api.ipapi.is/?q=${path}`), normalizeIpapiIs],
        [() => fetchJson(`https://ipapi.co/${path}/json/`), normalizeIpapi],
      ]
    : [
        [() => fetchJson(`https://api.ipapi.is/?q=${path}`), normalizeIpapiIs],
        [() => fetchJson(`https://ipwho.is/${path}`), normalizeIpwho],
        [() => fetchJson(`https://ipapi.co/${path}/json/`), normalizeIpapi],
        [() => fetchJson(`https://free.freeipapi.com/api/v1/json/${path}`), normalizeFreeIpApi],
      ];

  const errors = [];
  for (const [request, normalize] of providers) {
    try {
      const data = await request();
      const info = normalize(data);
      if (info.ip !== target && !isValidIp(info.ip)) {
        throw new Error("O serviço retornou um endereço inválido.");
      }
      if (!preferSecurity) {
        const needsCountryDetails = info.capital === "—" || info.borders === "—" || info.countryPopulation == null || typeof info.isEu !== "boolean";
        const countryDetails = needsCountryDetails ? await getCountryDetails(info.countryCode) : null;
        enrichCountryInfo(info, countryDetails);
      }
      applyHostingHeuristics(info);
      lookupCache.set(cacheKey, { at: Date.now(), info });
      return info;
    } catch (error) {
      errors.push(error);
    }
  }

  const wasRateLimited = errors.some((error) => error?.status === 429);
  throw new Error(wasRateLimited
    ? "Os serviços de consulta estão temporariamente limitando as requisições. Aguarde alguns minutos e tente novamente."
    : "Não foi possível alcançar os serviços de geolocalização. Verifique sua conexão e tente novamente.");
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
