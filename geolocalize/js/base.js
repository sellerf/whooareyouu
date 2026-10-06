const path = window.location.pathname || "/";
const base = document.createElement("base");
base.href = path === "/geolocalize" || path.startsWith("/geolocalize/")
  ? "/geolocalize/"
  : "/";
document.head.insertBefore(base, document.head.firstChild);
