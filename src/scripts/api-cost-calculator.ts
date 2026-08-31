import { defaultModelIds, families, getModel, isAllowlisted } from "../lib/catalog";
import { renderCostCompare, relabelUsdNodes, type CompareRow } from "../lib/compare-view";
import { DAYS_PER_MONTH, costForMonthlyUsage } from "../lib/cost";
import { readSessionHandoff, readTokenHandoff, writeSessionHandoff } from "../lib/handoff";
import {
  getUsdToInr,
  readStoredCurrency,
  storeCurrency,
  type Currency,
} from "../lib/fx";
import { formatCount } from "../lib/format";
import type { FamilyId } from "../lib/types";

let activeCurrency: Currency = "USD";

function requireEl<T extends Element>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Missing element ${selector}`);
  return el;
}

const form = requireEl<HTMLFormElement>("#api-cost-form");
const inputEl = requireEl<HTMLInputElement>("#input-tokens");
const outputEl = requireEl<HTMLInputElement>("#output-tokens");
const requestsEl = requireEl<HTMLInputElement>("#requests-per-day");
const usersEl = requireEl<HTMLInputElement>("#users");
const daysEl = requireEl<HTMLInputElement>("#days-per-month");
const usageError = requireEl<HTMLElement>("#usage-error");
const statsRegion = requireEl<HTMLElement>("#usage-stats");
const resultsBlock = requireEl<HTMLElement>("#monthly-results");
const resultsRegion = requireEl<HTMLElement>("#compare-results");

const usageFields: { el: HTMLInputElement; hintId: string }[] = [
  { el: inputEl, hintId: "input-hint" },
  { el: outputEl, hintId: "output-hint" },
  { el: requestsEl, hintId: "requests-hint" },
  { el: usersEl, hintId: "users-hint" },
  { el: daysEl, hintId: "days-hint" },
];

function fieldIsEmpty(el: HTMLInputElement): boolean {
  return el.value.trim() === "";
}

function parseNonNeg(el: HTMLInputElement): number | null {
  const parsed = Number.parseInt(el.value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function setFieldInvalid(el: HTMLInputElement, hintId: string, invalid: boolean) {
  el.setAttribute("aria-invalid", invalid ? "true" : "false");
  el.setAttribute("aria-describedby", invalid ? `${hintId} usage-error` : hintId);
}

function fieldIsValid(el: HTMLInputElement): boolean {
  if (fieldIsEmpty(el)) return false;
  const parsed = parseNonNeg(el);
  if (parsed == null) return false;
  if (el === daysEl) return parsed >= 1 && parsed <= 31;
  return true;
}

function validateUsage(): boolean {
  let ok = true;
  for (const { el, hintId } of usageFields) {
    const valid = fieldIsValid(el);
    setFieldInvalid(el, hintId, !valid);
    if (!valid) ok = false;
  }
  usageError.hidden = ok;
  return ok;
}

function selectedModelId(family: FamilyId): string {
  const compare = form.querySelector<HTMLSelectElement>(`#compare-${family}`);
  const value = compare?.value;
  if (value && isAllowlisted(value)) return value;
  return defaultModelIds[family];
}

function usageFromForm() {
  const days = parseNonNeg(daysEl) ?? DAYS_PER_MONTH;
  return {
    inputTokens: parseNonNeg(inputEl) ?? 0,
    outputTokens: parseNonNeg(outputEl) ?? 0,
    requestsPerDay: parseNonNeg(requestsEl) ?? 0,
    users: parseNonNeg(usersEl) ?? 0,
    daysPerMonth: days > 0 ? days : DAYS_PER_MONTH,
  };
}

function renderStats(callsPerMonth: number, days: number) {
  statsRegion.replaceChildren();
  const items: [string, string][] = [
    ["Calls per month", formatCount(callsPerMonth)],
    ["Days in this month", formatCount(days)],
  ];
  for (const [label, value] of items) {
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    statsRegion.append(dt, dd);
  }
}

function renderResults() {
  const usage = usageFromForm();
  const rows: CompareRow[] = [];
  let callsPerMonth = 0;

  for (const family of families) {
    const model = getModel(selectedModelId(family.id));
    if (!model) continue;

    const priced = costForMonthlyUsage(usage, model.price);
    callsPerMonth = priced.callsPerMonth;
    rows.push({
      family: family.label,
      label: model.label,
      totalUsd: priced.monthly.totalUsd,
    });
  }

  renderStats(callsPerMonth, usage.daysPerMonth);
  renderCostCompare(resultsRegion, rows, activeCurrency, {
    yLabel: "Monthly cost",
  });

  resultsBlock.hidden = false;
  resultsRegion.hidden = false;
  statsRegion.hidden = false;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!validateUsage()) {
    const firstInvalid = form.querySelector<HTMLInputElement>('[aria-invalid="true"]');
    firstInvalid?.focus();
    return;
  }
  renderResults();
  resultsRegion.focus();
});

for (const { el, hintId } of usageFields) {
  el.addEventListener("input", () => {
    if (fieldIsValid(el)) setFieldInvalid(el, hintId, false);
    if (usageFields.every(({ el: field }) => fieldIsValid(field))) {
      usageError.hidden = true;
    }
  });
}

function syncFxHint() {
  const hint = document.querySelector<HTMLElement>("#fx-hint");
  if (hint) hint.hidden = activeCurrency !== "INR";
}

function initCurrencyToggle() {
  const radios = document.querySelectorAll<HTMLInputElement>('input[name="currency"]');
  if (radios.length === 0) return;

  activeCurrency = readStoredCurrency();
  if (activeCurrency === "INR" && getUsdToInr() == null) {
    activeCurrency = "USD";
  }

  for (const radio of radios) {
    radio.checked = radio.value === activeCurrency;
    radio.addEventListener("change", () => {
      if (!radio.checked) return;
      const next = radio.value === "INR" ? "INR" : "USD";
      activeCurrency = storeCurrency(next);
      if (activeCurrency !== next) {
        radio.checked = false;
        const usdRadio = document.querySelector<HTMLInputElement>(
          'input[name="currency"][value="USD"]',
        );
        if (usdRadio) usdRadio.checked = true;
      }
      relabelUsdNodes(resultsRegion, activeCurrency);
      syncFxHint();
    });
  }

  syncFxHint();
}

initCurrencyToggle();

function applyHandoff(handoff: ReturnType<typeof readTokenHandoff>) {
  if (!handoff) return;

  inputEl.value = String(handoff.inputTokens);
  outputEl.value = String(handoff.outputTokens);
  if (fieldIsEmpty(requestsEl)) requestsEl.value = "10";
  if (fieldIsEmpty(usersEl)) usersEl.value = "1";
  if (fieldIsEmpty(daysEl)) daysEl.value = String(DAYS_PER_MONTH);

  for (const family of families) {
    const id = handoff.models[family.id];
    const select = form.querySelector<HTMLSelectElement>(`#compare-${family.id}`);
    if (select && id) select.value = id;
  }

  const hint = document.querySelector<HTMLElement>("#handoff-hint");
  if (hint) hint.hidden = false;

  for (const { el, hintId } of usageFields) {
    setFieldInvalid(el, hintId, false);
  }
  usageError.hidden = true;

  renderResults();
}

function restoreHandoff() {
  const fromUrl = readTokenHandoff(window.location.search);
  if (fromUrl) {
    writeSessionHandoff(fromUrl);
    applyHandoff(fromUrl);
    return;
  }

  applyHandoff(readSessionHandoff());
}

restoreHandoff();
