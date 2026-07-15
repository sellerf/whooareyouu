/** Leaflet map helpers — grayscale tiles for P&B look */

let map = null;
let marker = null;
let circle = null;

const TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

export function initMap(containerId = "map") {
  if (map) return map;

  const el = document.getElementById(containerId);
  if (!el || typeof L === "undefined") return null;

  map = L.map(el, {
    zoomControl: true,
    attributionControl: true,
    scrollWheelZoom: false,
  }).setView([20, 0], 2);

  L.tileLayer(TILE_URL, {
    attribution: TILE_ATTR,
    maxZoom: 18,
    subdomains: "abcd",
  }).addTo(map);

  // Enable wheel zoom after focus/click (Tesla-clean UX)
  el.addEventListener("click", () => map.scrollWheelZoom.enable());
  el.addEventListener("mouseleave", () => map.scrollWheelZoom.disable());

  setTimeout(() => map.invalidateSize(), 100);
  return map;
}

function makeIcon() {
  return L.divIcon({
    className: "",
    html: '<div class="linarc-marker" style="width:14px;height:14px;"></div>',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export function updateMap(lat, lng, label = "") {
  if (!map) initMap();
  if (!map || lat == null || lng == null || Number.isNaN(Number(lat))) return;

  const la = Number(lat);
  const lo = Number(lng);

  if (marker) map.removeLayer(marker);
  if (circle) map.removeLayer(circle);

  marker = L.marker([la, lo], { icon: makeIcon() }).addTo(map);
  if (label) marker.bindPopup(label).openPopup();

  circle = L.circle([la, lo], {
    radius: 25000,
    color: "#fff",
    weight: 1,
    fillColor: "#fff",
    fillOpacity: 0.06,
  }).addTo(map);

  map.flyTo([la, lo], 10, { duration: 1.4, easeLinearity: 0.25 });

  const mapEl = document.getElementById("map");
  if (mapEl) mapEl.classList.add("active");

  setTimeout(() => map?.invalidateSize(), 300);
}

export function resetMap() {
  if (!map) return;
  if (marker) {
    map.removeLayer(marker);
    marker = null;
  }
  if (circle) {
    map.removeLayer(circle);
    circle = null;
  }
  map.setView([20, 0], 2);
  document.getElementById("map")?.classList.remove("active");
}

export function invalidateMap() {
  map?.invalidateSize();
}
