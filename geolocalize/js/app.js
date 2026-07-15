import {
  isValidIp,
  getMyIps,
  lookupIp,
  buildReportText,
} from "./api.js";
import { initMap, updateMap, invalidateMap } from "./map.js";
import { runVpnTest } from "./vpn.js";

const HISTORY_KEY = "linarc-geolocalize-history";
const MAX_HISTORY = 12;

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const els = {
  header: $("#siteHeader"),
  menuToggle: $("#menuToggle"),
  mobileNav: $("#mobileNav"),
  form: $("#lookupForm"),
  ipInput: $("#ipInput"),
  btnLookup: $("#btnLookup"),
  btnMyIp: $("#btnMyIp"),
  btnGoVpn: $("#btnGoVpn"),
  statusLine: $("#statusLine"),
  ipBlock: $("#ipBlock"),
  dataGrid: $("#dataGrid"),
  mapMeta: $("#mapMeta"),
  exposureBadge: $("#exposureBadge"),
  btnCopyReport: $("#btnCopyReport"),
  extraPanels: $("#extraPanels"),
  connectionKv: $("#connectionKv"),
  timezoneKv: $("#timezoneKv"),
  securityKv: $("#securityKv"),
  geoKv: $("#geoKv"),
  btnRunVpn: $("#btnRunVpn"),
  vpnStatus: $("#vpnStatus"),
  vpnScore: $("#vpnScore"),
  scoreValue: $("#scoreValue"),
  scoreLabel: $("#scoreLabel"),
  scoreSummary: $("#scoreSummary"),
  ringFg: $("#ringFg"),
  historyList: $("#historyList"),
  btnClearHistory: $("#btnClearHistory"),
  toast: $("#toast"),
  loader: $("#loader"),
  loaderText: $("#loaderText"),
  idlePanel: $("#idlePanel"),
  resultsBody: $("#resultsBody"),
  results: $("#results"),
};

let lastInfo = null;
let lastDualIps = {};
let toastTimer = null;

/* —— UI helpers —— */
function showToast(msg) {
  els.toast.hidden = false;
  els.toast.textContent = msg;
  requestAnimationFrame(() => els.toast.classList.add("show"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    els.toast.classList.remove("show");
    setTimeout(() => {
      els.toast.hidden = true;
    }, 300);
  }, 2600);
}

function setLoading(on, text = "Consultando…", dark = false) {
  if (!els.loader) return;
  els.loader.classList.toggle("is-active", on);
  els.loader.hidden = !on;
  els.loader.setAttribute("aria-hidden", on ? "false" : "true");
  if (els.loaderText) els.loaderText.textContent = text;
  els.loader.classList.toggle("on-dark", dark);
  if (els.btnLookup) els.btnLookup.disabled = on;
  if (els.btnMyIp) els.btnMyIp.disabled = on;
}

function setStatus(text) {
  els.statusLine.style.opacity = "0";
  setTimeout(() => {
    els.statusLine.textContent = text;
    els.statusLine.style.opacity = "1";
  }, 180);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("Copiado");
  } catch {
    showToast("Não foi possível copiar");
  }
}

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* —— Header / nav —— */
function setupChrome() {
  const onScroll = () => {
    els.header.classList.toggle("scrolled", window.scrollY > 24);
    const darkSections = $$(".section-dark");
    const y = window.scrollY + els.header.offsetHeight + 8;
    let onDark = false;
    for (const sec of darkSections) {
      const r = sec.getBoundingClientRect();
      const top = r.top + window.scrollY;
      const bottom = top + r.height;
      if (y >= top && y < bottom) {
        onDark = true;
        break;
      }
    }
    els.header.classList.toggle("on-dark", onDark);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  els.menuToggle?.addEventListener("click", () => {
    const open = els.menuToggle.getAttribute("aria-expanded") === "true";
    els.menuToggle.setAttribute("aria-expanded", String(!open));
    els.mobileNav.hidden = open;
  });

  els.mobileNav?.addEventListener("click", (e) => {
    if (e.target.tagName === "A") {
      els.mobileNav.hidden = true;
      els.menuToggle.setAttribute("aria-expanded", "false");
    }
  });

  $("#btnThemeHint")?.addEventListener("click", () => {
    showToast("Tema P&B híbrido — hero claro · resultados escuros");
  });
}

/* —— History —— */
function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveHistory(list) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY)));
}

function pushHistory(info) {
  const list = loadHistory().filter((h) => h.ip !== info.ip);
  list.unshift({
    ip: info.ip,
    city: info.city,
    country: info.country,
    at: Date.now(),
  });
  saveHistory(list);
  renderHistory();
}

function renderHistory() {
  const list = loadHistory();
  if (!list.length) {
    els.historyList.innerHTML =
      '<li class="history-empty">Nenhuma consulta nesta sessão.</li>';
    return;
  }

  els.historyList.innerHTML = list
    .map(
      (h) => `
    <li>
      <button type="button" class="history-item" data-ip="${escapeAttr(h.ip)}">
        <div>
          <div class="ip">${escapeHtml(h.ip)}</div>
          <div class="meta">${escapeHtml(h.city)}, ${escapeHtml(h.country)}</div>
        </div>
        <span class="time">${formatTime(h.at)}</span>
      </button>
    </li>`
    )
    .join("");
}

function formatTime(ts) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(ts));
  } catch {
    return "";
  }
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

/* —— Render results —— */
function showResultsShell() {
  els.results?.classList.remove("is-idle");
  if (els.idlePanel) els.idlePanel.hidden = true;
  if (els.resultsBody) els.resultsBody.hidden = false;
}

function renderIpBlock(info, dual = {}) {
  const rows = [];

  if (dual.ipv6 || (info.type === "IPv6" && info.ip)) {
    const v6 = dual.ipv6 || info.ip;
    rows.push(ipRow(v6, "IPv6"));
  }
  if (dual.ipv4 || (info.type === "IPv4" && info.ip)) {
    const v4 = dual.ipv4 || (info.type === "IPv4" ? info.ip : null);
    if (v4) rows.push(ipRow(v4, "IPv4"));
  }
  if (!rows.length) rows.push(ipRow(info.ip, info.type || "IP"));

  const flag = info.flagImg
    ? `<img class="flag" src="${escapeAttr(info.flagImg)}" alt="" width="22" height="16" />`
    : info.flagEmoji
      ? `<span>${info.flagEmoji}</span>`
      : "";

  els.ipBlock.classList.remove("empty-state");
  els.ipBlock.innerHTML = `
    ${rows.join("")}
    <p class="ip-loc">${flag} ${escapeHtml(info.city)}, ${escapeHtml(info.region)} · ${escapeHtml(info.country)}</p>
  `;

  $$(".copy-btn", els.ipBlock).forEach((btn) => {
    btn.addEventListener("click", () => copyText(btn.dataset.copy));
  });
}

function ipRow(ip, label) {
  return `
    <div class="ip-row">
      <div class="ip-main">${escapeHtml(ip)}</div>
      <span class="ip-chip">${escapeHtml(label)}</span>
      <button type="button" class="copy-btn" data-copy="${escapeAttr(ip)}" title="Copiar" aria-label="Copiar IP">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      </button>
    </div>`;
}

function renderDataGrid(info) {
  const cards = [
    { label: "País", value: info.country, flag: info.flagImg },
    { label: "Região", value: info.region },
    { label: "Cidade", value: info.city },
    { label: "ORG / ISP", value: info.org !== "—" ? info.org : info.isp },
    {
      label: "Tipo de rede",
      value: info.mobile
        ? "Mobile"
        : info.security?.hosting
          ? "Hosting / DC"
          : info.security?.vpn
            ? "VPN / Proxy"
            : "ISP",
    },
    {
      label: "ASN",
      value:
        !info.asn || info.asn === "—"
          ? "—"
          : info.asn.startsWith("AS")
            ? info.asn
            : `AS${info.asn}`,
    },
    { label: "Fuso", value: `${info.timezoneUtc} (${info.timezoneAbbr})` },
    { label: "CEP", value: info.postal },
  ];

  els.dataGrid.innerHTML = cards
    .map(
      (c, i) => `
    <div class="data-card" style="animation-delay:${i * 0.06}s">
      <span class="label">${c.label}</span>
      <span class="value">
        ${c.flag ? `<img class="flag" src="${escapeAttr(c.flag)}" alt="" />` : ""}
        ${escapeHtml(c.value)}
      </span>
    </div>`
    )
    .join("");

  requestAnimationFrame(() => {
    $$(".data-card", els.dataGrid).forEach((el) => el.classList.add("visible"));
  });
}

function renderKv(container, pairs) {
  container.innerHTML = pairs
    .map(
      ([k, v]) => `
    <div>
      <dt>${escapeHtml(k)}</dt>
      <dd>${escapeHtml(v)}</dd>
    </div>`
    )
    .join("");
}

function renderExtra(info) {
  const s = info.security || {};
  renderKv(els.connectionKv, [
    ["ISP", info.isp],
    ["Organização", info.org],
    ["ASN", info.asn],
    ["Domínio", info.domain],
    ["Rede", info.network || "—"],
    ["Reverse DNS", info.reverseDns || "—"],
    ["Móvel", info.mobile == null ? "—" : info.mobile ? "sim" : "não"],
    ["Tipo", info.type],
  ]);
  renderKv(els.timezoneKv, [
    ["ID", info.timezoneId],
    ["Abreviação", info.timezoneAbbr],
    ["UTC", info.timezoneUtc],
    ["DST", info.timezoneDst == null ? "—" : info.timezoneDst ? "sim" : "não"],
    ["Hora local", info.currentTime],
    ["Moeda", `${info.currencyName} (${info.currencyCode}) ${info.currencySymbol}`],
  ]);
  renderKv(els.securityKv, [
    ["VPN", yn(s.vpn)],
    ["Proxy", yn(s.proxy)],
    ["Tor", yn(s.tor)],
    ["Hosting", yn(s.hosting)],
    ["Anônimo", yn(s.anonymous)],
    ["Fonte", info.source],
  ]);
  renderKv(els.geoKv, [
    ["Continente", `${info.continent} (${info.continentCode})`],
    ["Capital", info.capital],
    ["DDI", info.callingCode],
    ["União Europeia", info.isEu ? "sim" : "não"],
    ["Fronteiras", info.borders],
    [
      "População",
      info.countryPopulation != null
        ? Number(info.countryPopulation).toLocaleString("pt-BR")
        : "—",
    ],
  ]);

  els.extraPanels.hidden = false;
  $$(".panel", els.extraPanels).forEach((p, i) => {
    p.classList.remove("visible");
    p.style.animationDelay = `${0.08 * i}s`;
    requestAnimationFrame(() => p.classList.add("visible"));
  });
}

function yn(v) {
  return v ? "sim" : "não";
}

function updateBadge(info) {
  const s = info.security || {};
  els.exposureBadge.hidden = false;
  if (s.vpn || s.proxy || s.tor || s.anonymous) {
    els.exposureBadge.textContent = s.vpn ? "VPN" : s.tor ? "TOR" : "PROXY";
    els.exposureBadge.classList.add("safe");
  } else {
    els.exposureBadge.textContent = "Exposed";
    els.exposureBadge.classList.remove("safe");
  }
}

/* —— Core lookup —— */
async function performLookup(ip, dualIps = {}) {
  setLoading(true, "Consultando geolocalização…");
  setStatus(`Buscando ${ip || "seu IP"}…`);
  showResultsShell();
  els.dataGrid.innerHTML = Array.from({ length: 8 })
    .map(() => '<div class="data-card placeholder"></div>')
    .join("");
  initMap();

  try {
    const info = await lookupIp(ip);
    lastInfo = info;
    lastDualIps = dualIps;

    if (!dualIps.ipv4 && !dualIps.ipv6) {
      if (info.type === "IPv4") lastDualIps.ipv4 = info.ip;
      else lastDualIps.ipv6 = info.ip;
    }

    renderIpBlock(info, lastDualIps);
    renderDataGrid(info);
    renderExtra(info);
    updateBadge(info);

    if (info.latitude != null && info.longitude != null) {
      els.mapMeta.textContent = `${Number(info.latitude).toFixed(5)}, ${Number(info.longitude).toFixed(5)}`;
      updateMap(
        info.latitude,
        info.longitude,
        `${info.city}, ${info.country}<br/><code>${info.ip}</code>`
      );
    } else {
      els.mapMeta.textContent = "Sem coordenadas para este IP";
    }

    els.btnCopyReport.disabled = false;
    pushHistory(info);
    setStatus(`Pronto — ${info.ip} · ${info.city}, ${info.country}`);
    showToast("Geolocalização concluída");
    scrollToId("results");
    setTimeout(invalidateMap, 400);
  } catch (err) {
    setStatus(err.message || "Falha na consulta");
    showToast(err.message || "Erro ao consultar IP");
    els.ipBlock.innerHTML =
      '<p class="empty-msg">Não foi possível carregar os dados. Tente outro IP.</p>';
    els.dataGrid.innerHTML = "";
  } finally {
    setLoading(false);
  }
}

/* —— VPN UI —— */
function setCheck(id, state, label, detail) {
  const card = $(`.check-card[data-check="${id}"]`);
  if (!card) return;
  card.classList.remove("pass", "warn", "fail", "updating");
  card.classList.add("updating", state);
  $(".check-state", card).textContent = label;
  $(".check-detail", card).textContent = detail;
}

async function performVpnTest() {
  els.btnRunVpn.disabled = true;
  els.vpnStatus.textContent = "Iniciando análise…";
  els.vpnScore.hidden = true;
  setLoading(true, "Testando VPN…", true);

  $$(".check-card").forEach((c) => {
    c.classList.remove("pass", "warn", "fail");
    $(".check-state", c).textContent = "…";
    $(".check-detail", c).textContent = "Analisando…";
  });

  try {
    const result = await runVpnTest((msg) => {
      els.vpnStatus.textContent = msg;
    });

    for (const c of result.checks) {
      setCheck(c.id, c.state, c.label, c.detail);
    }

    els.vpnScore.hidden = false;
    els.scoreValue.textContent = String(result.score);
    els.scoreLabel.textContent = "VPN score";
    els.scoreSummary.innerHTML = `<strong>${escapeHtml(result.verdict)}</strong>${escapeHtml(result.verdictDetail)}`;

    const circumference = 2 * Math.PI * 52;
    const offset = circumference - (result.score / 100) * circumference;
    els.ringFg.style.strokeDasharray = String(circumference);
    els.ringFg.style.strokeDashoffset = String(circumference);
    requestAnimationFrame(() => {
      els.ringFg.style.strokeDashoffset = String(offset);
    });

    els.vpnStatus.textContent = `Concluído · IP ${result.myIps.primary}`;

    showResultsShell();
    lastInfo = result.info;
    lastDualIps = {
      ipv4: result.myIps.ipv4,
      ipv6: result.myIps.ipv6,
    };
    renderIpBlock(result.info, lastDualIps);
    renderDataGrid(result.info);
    renderExtra(result.info);
    updateBadge(result.info);
    els.btnCopyReport.disabled = false;
    if (result.info.latitude != null) {
      els.mapMeta.textContent = `${Number(result.info.latitude).toFixed(5)}, ${Number(result.info.longitude).toFixed(5)}`;
      updateMap(result.info.latitude, result.info.longitude, result.info.ip);
    }
    pushHistory(result.info);
    showToast("Teste de VPN concluído");
  } catch (err) {
    els.vpnStatus.textContent = err.message || "Falha no teste";
    showToast(err.message || "Erro no teste de VPN");
  } finally {
    setLoading(false);
    els.btnRunVpn.disabled = false;
  }
}

/* —— Events —— */
function setupEvents() {
  els.form.addEventListener("submit", (e) => {
    e.preventDefault();
    const raw = els.ipInput.value.trim();
    if (!raw) {
      showToast("Digite um IP ou use What’s my IP");
      return;
    }
    if (!isValidIp(raw)) {
      showToast("IP inválido");
      return;
    }
    performLookup(raw);
  });

  els.btnMyIp.addEventListener("click", async () => {
    setLoading(true, "Detectando seu IP…");
    setStatus("Descobrindo seu IP público…");
    try {
      const ips = await getMyIps();
      if (!ips.primary) throw new Error("Não foi possível detectar seu IP");
      els.ipInput.value = ips.primary;
      setLoading(false);
      await performLookup(ips.primary, { ipv4: ips.ipv4, ipv6: ips.ipv6 });
    } catch (err) {
      setLoading(false);
      setStatus(err.message);
      showToast(err.message);
    }
  });

  els.btnGoVpn.addEventListener("click", () => {
    scrollToId("vpn");
    setTimeout(() => performVpnTest(), 450);
  });

  els.btnRunVpn.addEventListener("click", () => performVpnTest());

  els.btnCopyReport.addEventListener("click", () => {
    if (!lastInfo) return;
    copyText(buildReportText(lastInfo, lastDualIps));
  });

  els.btnClearHistory.addEventListener("click", () => {
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
    showToast("Histórico limpo");
  });

  els.historyList.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-ip]");
    if (!btn) return;
    const ip = btn.getAttribute("data-ip");
    els.ipInput.value = ip;
    performLookup(ip);
  });
}

/* —— Boot —— */
function boot() {
  // Ensure loader never sticks on first paint
  setLoading(false);
  setupChrome();
  setupEvents();
  renderHistory();
  setStatus("Pronto para consultar qualquer IP público.");
}

boot();
