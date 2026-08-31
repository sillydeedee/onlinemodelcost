import { defaultModelIds, families, getModel, isAllowlisted } from "../lib/catalog";
import { renderCostCompare, relabelUsdNodes, type CompareRow } from "../lib/compare-view";
import { costForTokens } from "../lib/cost";
import { monthlyCalculatorHref, writeSessionHandoff } from "../lib/handoff";
import {
  getUsdToInr,
  readStoredCurrency,
  storeCurrency,
  type Currency,
} from "../lib/fx";
import { formatCount } from "../lib/format";
import { countCharacters, countWords } from "../lib/text-stats";
import { countModelTokens } from "../lib/tokenize";
import type { FamilyId } from "../lib/types";

const PROMPT_SESSION_KEY = "model-cost-prompt";

let activeCurrency: Currency = "USD";

function requireEl<T extends Element>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Missing element ${selector}`);
  return el;
}

const form = requireEl<HTMLFormElement>("#token-form");
const promptEl = requireEl<HTMLTextAreaElement>("#prompt");
const promptError = requireEl<HTMLElement>("#prompt-error");
const charsEl = requireEl<HTMLElement>("#stat-chars");
const wordsEl = requireEl<HTMLElement>("#stat-words");
const resultsBlock = requireEl<HTMLElement>("#one-call-results");
const resultsRegion = requireEl<HTMLElement>("#compare-results");
const monthlyNext = requireEl<HTMLElement>("#monthly-next");
const monthlyLink = requireEl<HTMLAnchorElement>("#monthly-calculator-link");

function readSessionPrompt(): string {
  try {
    return sessionStorage.getItem(PROMPT_SESSION_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeSessionPrompt(value: string) {
  try {
    sessionStorage.setItem(PROMPT_SESSION_KEY, value);
  } catch {
    // fail-soft: private mode or blocked storage
  }
}

function promptIsEmpty(value: string): boolean {
  return value.trim().length === 0;
}

function setPromptError(show: boolean) {
  promptError.hidden = !show;
  promptEl.setAttribute("aria-invalid", show ? "true" : "false");
  promptEl.setAttribute(
    "aria-describedby",
    show ? "prompt-hint prompt-error" : "prompt-hint",
  );
}

function selectedModelId(family: FamilyId): string {
  const compare = form.querySelector<HTMLSelectElement>(`#compare-${family}`);
  const value = compare?.value;
  if (value && isAllowlisted(value)) return value;
  return defaultModelIds[family];
}

function renderCharWordStats(paste: string) {
  charsEl.textContent = formatCount(countCharacters(paste));
  wordsEl.textContent = formatCount(countWords(paste));
}

async function renderResults(paste: string) {
  const rows: CompareRow[] = [];
  const models: Partial<Record<FamilyId, string>> = {};
  let inputTokens = 0;

  for (const family of families) {
    const modelId = selectedModelId(family.id);
    const model = getModel(modelId);
    if (!model) continue;

    models[family.id] = model.id;
    const counted = await countModelTokens(paste, model.tokenizer);
    if (family.id === "gpt" || inputTokens === 0) inputTokens = counted.tokens;
    const cost = costForTokens(counted.tokens, 0, model.price);
    rows.push({
      family: family.label,
      label: model.label,
      totalUsd: cost.totalUsd,
      tokens: counted.tokens,
      tokensEstimate: counted.isEstimate,
    });
  }

  renderCostCompare(resultsRegion, rows, activeCurrency, {
    yLabel: "Cost",
  });

  const handoff = {
    inputTokens,
    outputTokens: 0,
    models,
  };
  writeSessionHandoff(handoff);
  monthlyLink.href = monthlyCalculatorHref(handoff);
  monthlyNext.hidden = false;
  resultsBlock.hidden = false;
  resultsRegion.hidden = false;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const prompt = promptEl.value;
  if (promptIsEmpty(prompt)) {
    setPromptError(true);
    promptEl.focus();
    return;
  }

  setPromptError(false);
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (button) {
    button.disabled = true;
    button.textContent = "Calculating…";
  }

  try {
    renderCharWordStats(prompt);
    await renderResults(prompt);
    resultsRegion.focus();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Calculate failed.";
    resultsBlock.hidden = false;
    resultsRegion.hidden = false;
    resultsRegion.replaceChildren();
    const note = document.createElement("p");
    note.className = "privacy-note";
    note.textContent = message;
    resultsRegion.append(note);
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Calculate one-call cost";
    }
  }
});

promptEl.addEventListener("input", () => {
  writeSessionPrompt(promptEl.value);
  if (!promptIsEmpty(promptEl.value)) setPromptError(false);
  renderCharWordStats(promptEl.value);
});

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

const storedPrompt = readSessionPrompt();
if (storedPrompt) promptEl.value = storedPrompt;
renderCharWordStats(promptEl.value);
