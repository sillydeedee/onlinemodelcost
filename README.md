# Model Cost

Static Astro site that prices one pasted prompt in the browser. Token math and OpenRouter catalog rates ship in the build. The paste is never sent to a server. The browser does not call OpenRouter.

## Commands

| Command | Action |
| :------ | :----- |
| `npm install` | Install dependencies |
| `npm run dev` | Local dev server |
| `npm run build` | Static production build |
| `npm run preview` | Preview the build |
| `npm run sync:prices` | Refresh `src/data/prices.json` from OpenRouter |

## Price sync

A GitHub Action fetches the public catalog once (`GET https://openrouter.ai/api/v1/models`), keeps only the 13 ids in `src/data/models.json`, and rewrites `src/data/prices.json` when input/output (and cache, if present) rates change. Unchanged rates exit without a commit.

The UI last-verified line reads `fetched_at` and `notes` from `prices.json`. Those notes label the numbers as **OpenRouter catalog rates**, not a notarized vendor PDF.

### Required secrets

| Secret | Required | Used for |
| :----- | :------- | :------- |
| `GITHUB_TOKEN` | Yes (automatic) | Commit and push `prices.json` so Cloudflare Pages / the host rebuilds. The workflow requests `contents: write` only. |
| `DISCORD_WEBHOOK_URL` | No | Ping Discord only when a **featured** model rate changes (Sonnet 5, Terra, Gemini 3.7 Flash, Grok 4.6). |

No OpenRouter API key is required. Do not put tokens in client code or in `src/`.

If the default `GITHUB_TOKEN` cannot push to the default branch, allow GitHub Actions write access for that branch (or the token will checkout but the push step will fail).

### How to map ids

Our allowlist id stays the product id (`claude-haiku-4-5`). OpenRouter slugs often differ (`anthropic/claude-haiku-4.5`). Map them on the model object:

```json
{
  "id": "claude-haiku-4-5",
  "openrouter_id": "anthropic/claude-haiku-4.5",
  "featured": true
}
```

1. Open [https://openrouter.ai/api/v1/models](https://openrouter.ai/api/v1/models) and copy the standard `id` (not `:batch` or a sibling `-pro` variant unless that is the product).
2. Set `openrouter_id` on the matching row in `src/data/models.json`.
3. Do not add a new allowlist row unless you intend to expand v1.
4. Run the sync. A missing `openrouter_id`, or a mapped id absent from the catalog, fails the job.

`featured: true` is optional. Only those models can trigger the Discord ping.

### How to run manually

- **GitHub:** Actions → **Sync OpenRouter prices** → **Run workflow**.
- **Local:** `npm run sync:prices`. If rates changed, `src/data/prices.json` is rewritten; commit that file yourself. If nothing changed, the file is left alone.

The Action schedule is every 12 hours (`17 */12 * * *`) plus `workflow_dispatch`.

## Display currency (USD / INR)

The token calculator can show costs in INR using a **fixed constant** in `src/data/fx.json` (`usd_to_inr`, currently 88 as of 2026-08-30). This is not a live FX API. If the constant is missing or invalid, the toggle fails soft and stays on USD. Set `PUBLIC_SITE_URL` at build time for canonicals, Open Graph, and `sitemap.xml`.
