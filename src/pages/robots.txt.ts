import type { APIRoute } from "astro";
import { absoluteUrl, FALLBACK_ORIGIN } from "../lib/site";

export const GET: APIRoute = ({ site }) => {
  const origin = site ?? new URL(FALLBACK_ORIGIN);
  const body = `User-agent: *
Allow: /

Sitemap: ${absoluteUrl("/sitemap.xml", origin)}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};
