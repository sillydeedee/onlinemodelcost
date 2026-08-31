import type { CallCost, PriceRate } from "./types";

const MILLION = 1_000_000;

/** Display month used when the form does not override days. */
export const DAYS_PER_MONTH = 30;

export function costForTokens(
  inputTokens: number,
  outputTokens: number,
  rate: PriceRate,
): CallCost {
  const safeInput = Math.max(0, inputTokens);
  const safeOutput = Math.max(0, outputTokens);
  const inputUsd = (safeInput / MILLION) * rate.input;
  const outputUsd = (safeOutput / MILLION) * rate.output;
  return {
    inputUsd,
    outputUsd,
    totalUsd: inputUsd + outputUsd,
  };
}

export type UsageInputs = {
  inputTokens: number;
  outputTokens: number;
  requestsPerDay: number;
  users: number;
  daysPerMonth?: number;
};

export type UsageCost = {
  callsPerMonth: number;
  perCall: CallCost;
  monthly: CallCost;
};

export function costForMonthlyUsage(
  usage: UsageInputs,
  rate: PriceRate,
): UsageCost {
  const days = usage.daysPerMonth ?? DAYS_PER_MONTH;
  const callsPerMonth =
    Math.max(0, usage.requestsPerDay) *
    Math.max(0, usage.users) *
    Math.max(0, days);
  const perCall = costForTokens(usage.inputTokens, usage.outputTokens, rate);
  return {
    callsPerMonth,
    perCall,
    monthly: {
      inputUsd: perCall.inputUsd * callsPerMonth,
      outputUsd: perCall.outputUsd * callsPerMonth,
      totalUsd: perCall.totalUsd * callsPerMonth,
    },
  };
}
