import { toDisplayAmount, type Currency } from "./fx";

export function formatUsd(amount: number): string {
  return formatMoney(amount, "USD");
}

export function formatMoney(usdAmount: number, currency: Currency): string {
  const { amount, currency: active } = toDisplayAmount(usdAmount, currency);
  const symbol = active === "INR" ? "₹" : "$";
  if (!Number.isFinite(amount) || amount === 0) return `${symbol}0.00`;
  if (amount < 0.0001) {
    return `${symbol}${amount.toFixed(8).replace(/0+$/, "").replace(/\.$/, "")}`;
  }
  if (amount < 0.01) return `${symbol}${amount.toFixed(6)}`;
  if (amount < 1) return `${symbol}${amount.toFixed(4)}`;
  return new Intl.NumberFormat(active === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency: active,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount);
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatVerifiedDate(isoDate: string): string {
  const date = isoDate.includes("T")
    ? new Date(isoDate)
    : new Date(`${isoDate}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatRate(usdPerMillion: number, currency: Currency = "USD"): string {
  const { amount, currency: active } = toDisplayAmount(usdPerMillion, currency);
  const symbol = active === "INR" ? "₹" : "$";
  const formatted = Number.isInteger(amount) ? amount.toFixed(0) : String(Number(amount.toFixed(4)));
  return `${symbol}${formatted} / 1M`;
}
