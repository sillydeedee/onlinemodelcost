import { getModel, isAllowlisted } from "./catalog";
import type { FamilyId } from "./types";

export type TokenHandoff = {
  inputTokens: number;
  outputTokens: number;
  models: Partial<Record<FamilyId, string>>;
};

export const TOKEN_HANDOFF_SESSION_KEY = "model-cost-token-handoff";

const FAMILIES = ["claude", "gpt", "gemini", "grok"] as const;

function nonNegIntParam(raw: string | null): number | null {
  if (raw == null || raw === "") return null;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function sanitizeHandoff(data: TokenHandoff): TokenHandoff {
  const models: TokenHandoff["models"] = {};
  for (const family of FAMILIES) {
    const id = data.models[family];
    if (!id || !isAllowlisted(id)) continue;
    if (getModel(id)?.family !== family) continue;
    models[family] = id;
  }
  return {
    inputTokens: Math.max(0, Math.round(data.inputTokens)),
    outputTokens: Math.max(0, Math.round(data.outputTokens)),
    models,
  };
}

export function tokenHandoffSearch(data: TokenHandoff): string {
  const clean = sanitizeHandoff(data);
  const params = new URLSearchParams();
  params.set("input", String(clean.inputTokens));
  params.set("output", String(clean.outputTokens));
  for (const [family, id] of Object.entries(clean.models)) {
    if (id) params.set(family, id);
  }
  return params.toString();
}

export function monthlyCalculatorHref(data: TokenHandoff): string {
  return `/api-cost-calculator?${tokenHandoffSearch(data)}`;
}

export function writeSessionHandoff(data: TokenHandoff) {
  try {
    sessionStorage.setItem(TOKEN_HANDOFF_SESSION_KEY, JSON.stringify(sanitizeHandoff(data)));
  } catch {
    // fail-soft: private mode or blocked storage
  }
}

export function readSessionHandoff(): TokenHandoff | null {
  try {
    const raw = sessionStorage.getItem(TOKEN_HANDOFF_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TokenHandoff>;
    const inputTokens = Number(parsed.inputTokens);
    if (!Number.isFinite(inputTokens) || inputTokens < 0) return null;
    const outputTokens = Number(parsed.outputTokens);
    return sanitizeHandoff({
      inputTokens,
      outputTokens: Number.isFinite(outputTokens) && outputTokens >= 0 ? outputTokens : 0,
      models: parsed.models ?? {},
    });
  } catch {
    return null;
  }
}

export function readTokenHandoff(search: string): TokenHandoff | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const inputTokens = nonNegIntParam(params.get("input"));
  if (inputTokens == null) return null;

  const models: TokenHandoff["models"] = {};
  for (const family of FAMILIES) {
    const id = params.get(family);
    if (id) models[family] = id;
  }

  return sanitizeHandoff({
    inputTokens,
    outputTokens: nonNegIntParam(params.get("output")) ?? 0,
    models,
  });
}
