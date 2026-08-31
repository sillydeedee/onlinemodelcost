export type FamilyId = "claude" | "gpt" | "gemini" | "grok";

export type TokenizerKind =
  | "tiktoken"
  | "estimate-claude"
  | "estimate-gemini"
  | "estimate-grok";

export type Family = {
  id: FamilyId;
  label: string;
};

export type Model = {
  id: string;
  family: FamilyId;
  label: string;
  tokenizer: TokenizerKind;
  openrouter_id: string;
  featured?: boolean;
};

export type PriceRate = {
  input: number;
  output: number;
  cache_read?: number;
  cache_write?: number;
  source: string;
  source_label: string;
};

export type ModelsFile = {
  families: Family[];
  defaults: Record<FamilyId, string>;
  models: Model[];
};

export type PricesFile = {
  fetched_at: string;
  unit: string;
  source: string;
  notes: string;
  rates: Record<string, PriceRate>;
};

export type CatalogEntry = Model & {
  price: PriceRate;
};

export type TokenCount = {
  tokens: number;
  methodLabel: string;
  isEstimate: boolean;
};

export type CallCost = {
  inputUsd: number;
  outputUsd: number;
  totalUsd: number;
};
