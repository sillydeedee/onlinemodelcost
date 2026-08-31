import type { APIRoute } from "astro";
import { absoluteUrl, FALLBACK_ORIGIN } from "../lib/site";

const paths = [
  "/",
  "/token-calculator/",
  "/api-cost-calculator/",
  "/rates/",
  "/about/",
  "/privacy/",
  "/terms/",
  "/contact/",
];

export const GET: APIRoute = ({ site }) => {
  const origin = site ?? new URL(FALLBACK_ORIGIN);
  const urls = paths
    .map((path) => `  <url><loc>${absoluteUrl(path, origin)}</loc></url>`)
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
};
