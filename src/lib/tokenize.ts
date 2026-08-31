import { countTokens } from "gpt-tokenizer";
import { countWords } from "./text-stats";
import type { TokenCount, TokenizerKind } from "./types";

const METHOD: Record<TokenizerKind, { label: string; isEstimate: boolean }> = {
  tiktoken: {
    label: "tiktoken (o200k_base) — exact for GPT",
    isEstimate: false,
  },
  "estimate-claude": {
    label: "Estimate — ~3.5 characters per token, not Claude’s tokenizer",
    isEstimate: true,
  },
  "estimate-gemini": {
    label: "Estimate — ~4 characters per token, not Gemini’s tokenizer",
    isEstimate: true,
  },
  "estimate-grok": {
    label: "Estimate — word and character hybrid, not Grok’s tokenizer",
    isEstimate: true,
  },
};

export async function countModelTokens(
  text: string,
  kind: TokenizerKind,
): Promise<TokenCount> {
  const meta = METHOD[kind];
  return {
    tokens: tokensFor(text, kind),
    methodLabel: meta.label,
    isEstimate: meta.isEstimate,
  };
}

function tokensFor(text: string, kind: TokenizerKind): number {
  if (!text) return 0;

  switch (kind) {
    case "tiktoken":
      return countTokens(text);
    case "estimate-claude":
      return Math.ceil(text.length / 3.5);
    case "estimate-gemini":
      return Math.ceil(text.length / 4);
    case "estimate-grok": {
      const fromWords = Math.ceil(countWords(text) * 1.3);
      const fromChars = Math.ceil(text.length / 4.2);
      return Math.round((fromWords + fromChars) / 2);
    }
  }
}
