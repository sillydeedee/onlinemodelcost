/**
 * Fetch the public OpenRouter catalog once and rewrite src/data/prices.json
 * only when allowlisted input/output/cache rates change.
 *
 * Usage: node scripts/sync-openrouter-prices.mjs
 * Optional env: DISCORD_WEBHOOK_URL — ping only if a featured model's rates change.
 */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MODELS_PATH = join(ROOT, "src/data/models.json");
const PRICES_PATH = join(ROOT, "src/data/prices.json");
const CATALOG_URL = "https://openrouter.ai/api/v1/models";
const SOURCE = "openrouter";
const SOURCE_LABEL = "OpenRouter catalog";
const NOTES =
  "Catalog rates from OpenRouter (public model list). Not a notarized vendor price sheet.";
const UNIT = "usd_per_million_tokens";

const modelsFile = JSON.parse(await readFile(MODELS_PATH, "utf8"));
const previousPrices = JSON.parse(await readFile(PRICES_PATH, "utf8"));

const allowlist = modelsFile.models;
if (!Array.isArray(allowlist) || allowlist.length === 0) {
  throw new Error("models.json has no allowlisted models");
}

const missingMap = allowlist.filter((model) => !model.openrouter_id);
if (missingMap.length > 0) {
  throw new Error(
    `Add openrouter_id on: ${missingMap.map((model) => model.id).join(", ")}`,
  );
}

const catalog = await fetchCatalog();
const byId = new Map(catalog.map((entry) => [entry.id, entry]));

const missingCatalog = [];
const nextRates = {};

for (const model of allowlist) {
  const entry = byId.get(model.openrouter_id);
  if (!entry) {
    missingCatalog.push(`${model.id} → ${model.openrouter_id}`);
    continue;
  }
  nextRates[model.id] = rateFromCatalog(entry);
}

if (missingCatalog.length > 0) {
  throw new Error(
    `OpenRouter catalog is missing mapped ids:\n${missingCatalog.join("\n")}`,
  );
}

const changedIds = allowlist
  .map((model) => model.id)
  .filter((id) => !sameRate(previousPrices.rates?.[id], nextRates[id]));

if (changedIds.length === 0) {
  console.log("Rates unchanged; leaving prices.json");
  process.exit(0);
}

const nextPrices = {
  fetched_at: new Date().toISOString(),
  unit: UNIT,
  source: SOURCE,
  notes: NOTES,
  rates: nextRates,
};

await writeFile(PRICES_PATH, `${JSON.stringify(nextPrices, null, 2)}\n`);
console.log(`Updated ${changedIds.length} rate(s): ${changedIds.join(", ")}`);

const featuredChanges = allowlist
  .filter((model) => model.featured && changedIds.includes(model.id))
  .map((model) => ({
    label: model.label,
    id: model.id,
    before: previousPrices.rates?.[model.id],
    after: nextRates[model.id],
  }));

if (featuredChanges.length > 0) {
  await pingDiscord(featuredChanges);
}

function rateFromCatalog(entry) {
  const pricing = entry.pricing ?? {};
  const input = perMillion(pricing.prompt, `${entry.id} prompt`);
  const output = perMillion(pricing.completion, `${entry.id} completion`);
  const cacheRead = optionalPerMillion(pricing.input_cache_read);
  const cacheWrite = optionalPerMillion(pricing.input_cache_write);
  const rate = { input, output };
  if (cacheRead !== undefined) rate.cache_read = cacheRead;
  if (cacheWrite !== undefined) rate.cache_write = cacheWrite;
  rate.source = SOURCE;
  rate.source_label = SOURCE_LABEL;
  return rate;
}

function perMillion(value, label) {
  const parsed = optionalPerMillion(value);
  if (parsed === undefined) {
    throw new Error(`Missing or invalid ${label} price`);
  }
  return parsed;
}

function optionalPerMillion(value) {
  if (value == null || value === "") return undefined;
  const number = Number(value);
  if (!Number.isFinite(number)) return undefined;
  return Number((number * 1_000_000).toFixed(6));
}

function sameRate(left, right) {
  return JSON.stringify(rateFingerprint(left)) === JSON.stringify(rateFingerprint(right));
}

function rateFingerprint(rate) {
  if (!rate) return null;
  return {
    input: Number(rate.input),
    output: Number(rate.output),
    cache_read: rate.cache_read ?? null,
    cache_write: rate.cache_write ?? null,
  };
}

async function fetchCatalog() {
  const response = await fetch(CATALOG_URL, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`OpenRouter catalog HTTP ${response.status}`);
  }
  const body = await response.json();
  if (!Array.isArray(body?.data)) {
    throw new Error("OpenRouter catalog response has no data array");
  }
  console.log(`Fetched ${body.data.length} catalog rows`);
  return body.data;
}

function formatPair(rate) {
  if (!rate) return "(none)";
  return `$${rate.input}/$${rate.output} per 1M`;
}

async function pingDiscord(changes) {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) {
    console.log("Featured rates changed; DISCORD_WEBHOOK_URL not set, skipping ping");
    return;
  }

  const lines = [
    "Featured OpenRouter catalog rates changed:",
    ...changes.map(
      (change) =>
        `• ${change.label} (${change.id}): ${formatPair(change.before)} → ${formatPair(change.after)}`,
    ),
  ];

  const response = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: lines.join("\n") }),
  });

  if (!response.ok) {
    console.warn(`Discord ping failed with HTTP ${response.status}`);
    return;
  }
  console.log(`Discord ping sent for ${changes.length} featured model(s)`);
}
