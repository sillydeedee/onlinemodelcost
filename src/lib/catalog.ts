import modelsFile from "../data/models.json";
import pricesFile from "../data/prices.json";
import type {
  CatalogEntry,
  Family,
  FamilyId,
  Model,
  ModelsFile,
  PriceRate,
  PricesFile,
} from "./types";

const modelsData = modelsFile as ModelsFile;
const pricesData = pricesFile as PricesFile;

const allowlist = new Map<string, CatalogEntry>();

for (const model of modelsData.models) {
  const price = pricesData.rates[model.id];
  if (!price) {
    throw new Error(`prices.json is missing a rate for allowlisted model ${model.id}`);
  }
  allowlist.set(model.id, { ...model, price });
}

export const families: Family[] = modelsData.families;
export const defaultModelIds: Record<FamilyId, string> = modelsData.defaults;
export const fetchedAt = pricesData.fetched_at;
export const priceNotes = pricesData.notes;

export function getAllowlistedModels(): CatalogEntry[] {
  return [...allowlist.values()];
}

export function getModelsByFamily(family: FamilyId): CatalogEntry[] {
  return getAllowlistedModels().filter((model) => model.family === family);
}

export function getModel(id: string): CatalogEntry | undefined {
  return allowlist.get(id);
}

export function getPrice(id: string): PriceRate | undefined {
  return allowlist.get(id)?.price;
}

export function isAllowlisted(id: string): boolean {
  return allowlist.has(id);
}

export function getFamily(id: FamilyId): Family | undefined {
  return families.find((family) => family.id === id);
}

export function familyOf(model: Model): Family {
  const family = getFamily(model.family);
  if (!family) {
    throw new Error(`Unknown family ${model.family}`);
  }
  return family;
}
