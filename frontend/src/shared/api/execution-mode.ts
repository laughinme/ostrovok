import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";

export type ApiMode = "live" | "demo";
export const DEMO_COOKIE = "okno-design-demo";
let clientMode: ApiMode | undefined;

export function modeFromCookie(cookie: string): ApiMode {
  return cookie.split(";").some((part) => part.trim() === `${DEMO_COOKIE}=1`) ? "demo" : "live";
}

export const getApiMode = createIsomorphicFn()
  .server((): ApiMode => {
    try {
      return getCookie(DEMO_COOKIE) === "1" ? "demo" : "live";
    } catch {
      return "live";
    }
  })
  .client((): ApiMode => (clientMode ??= modeFromCookie(document.cookie)));

export function setApiMode(mode: ApiMode) {
  clientMode = mode;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${DEMO_COOKIE}=${mode === "demo" ? "1" : ""}; Path=/; Max-Age=${mode === "demo" ? 2592000 : 0}; SameSite=Lax${secure}`;
}
