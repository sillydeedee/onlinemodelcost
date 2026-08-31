import fxFile from "../data/fx.json";

export type Currency = "USD" | "INR";

const STORAGE_KEY = "model-cost-currency";

type FxFile = {
  usd_to_inr: number;
  as_of: string;
  source: string;
  notes: string;
};

const fx = fxFile as FxFile;

export const fxAsOf = fx.as_of;
export const fxNotes = fx.notes;

export function getUsdToInr(): number | null {
  const rate = Number(fx.usd_to_inr);
  if (!Number.isFinite(rate) || rate <= 0) return null;
  return rate;
}

export function readStoredCurrency(): Currency {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "INR" && getUsdToInr() != null) return "INR";
    if (stored === "USD") return "USD";
  } catch {
    // fail-soft: private mode or blocked storage
  }
  return "USD";
}

export function storeCurrency(currency: Currency): Currency {
  const next = currency === "INR" && getUsdToInr() == null ? "USD" : currency;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // fail-soft
  }
  return next;
}

export function toDisplayAmount(usdAmount: number, currency: Currency): {
  amount: number;
  currency: Currency;
} {
  if (currency === "INR") {
    const rate = getUsdToInr();
    if (rate == null) return { amount: usdAmount, currency: "USD" };
    return { amount: usdAmount * rate, currency: "INR" };
  }
  return { amount: usdAmount, currency: "USD" };
}
