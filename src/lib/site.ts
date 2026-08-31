export const SITE_NAME = "Model Cost";
export const FALLBACK_ORIGIN = "https://onlinemodelcost.com";

export function absoluteUrl(pathname: string, site?: URL): string {
  const origin = site ?? new URL(FALLBACK_ORIGIN);
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return new URL(path, origin).href;
}
