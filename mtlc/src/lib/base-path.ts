/** Deve bater com `basePath` em next.config.ts */
export const BASE_PATH = "/mtlc";

/** Prefixa paths absolutos com o basePath (ex.: `/api/x` → `/mtlc/api/x`). */
export function withBasePath(path: string): string {
  if (!path.startsWith("/")) path = `/${path}`;
  if (BASE_PATH && path.startsWith(BASE_PATH + "/")) return path;
  if (BASE_PATH && path === BASE_PATH) return path;
  if (path === "/") return BASE_PATH || "/";
  return `${BASE_PATH}${path}`;
}

/** Remove o basePath do pathname (útil no middleware). */
export function stripBasePath(pathname: string): string {
  if (!BASE_PATH) return pathname;
  if (pathname === BASE_PATH) return "/";
  if (pathname.startsWith(BASE_PATH + "/")) {
    return pathname.slice(BASE_PATH.length) || "/";
  }
  return pathname;
}
