import { detectBrand } from "./brands.js";
import { detectCategory, type ProductCategory } from "./categories.js";
import { detectRam, detectStorage } from "./storage.js";

export interface ProductQuery {
  originalQuery: string;
  brand: string;
  model: string;
  category: ProductCategory;
  storage: string | null;
  ram: string | null;
  color: string | null;
  variant: string | null;
  normalizedName: string;
}

const colors: ReadonlyArray<[RegExp, string]> = [
  [/(?<![a-zа-я])(?:black|черн(?:ый|ая|ое))(?![a-zа-я])/iu, "black"],
  [/(?<![a-zа-я])(?:white|бел(?:ый|ая|ое))(?![a-zа-я])/iu, "white"],
  [/(?<![a-zа-я])(?:blue|син(?:ий|яя|ее))(?![a-zа-я])/iu, "blue"],
  [/(?<![a-zа-я])(?:natural\s+titanium|натуральн(?:ый|ого)\s+титан)(?![a-zа-я])/iu, "natural titanium"],
];

function clean(input: string): string {
  return input
    .normalize("NFKC")
    .replace(/ё/g, "е")
    .replace(/[,_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectColor(input: string): string | null {
  for (const [pattern, color] of colors) {
    if (pattern.test(input)) return color;
  }
  return null;
}

function titleWords(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      if (/^\d+$/.test(word)) return word;
      if (/^(pro|max|plus|mini|ultra|air|fe)$/i.test(word)) return word[0]!.toUpperCase() + word.slice(1).toLowerCase();
      return word[0]!.toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function detectModel(input: string, brand: string, category: ProductCategory): string {
  const lower = input.toLowerCase();

  const iphone = lower.match(
    brand === "Apple"
      ? /(?:\biphone\s*)?\b(\d{1,2})(?:\s*(pro))?(?:\s*(max))?(?:\s*(plus|mini))?/i
      : /\biphone\s*(\d{1,2})(?:\s*(pro))?(?:\s*(max))?(?:\s*(plus|mini))?/i,
  );
  if (iphone) {
    return ["iPhone", iphone[1], iphone[2], iphone[3], iphone[4]]
      .filter(Boolean)
      .map((part, index) => (index < 2 ? part : titleWords(part!)))
      .join(" ");
  }

  const galaxy = lower.match(
    brand === "Samsung"
      ? /(?:\bgalaxy\s*)?\b([a-z]\s*\d{1,3})(?:\s*(ultra|plus|fe|\+))?/i
      : /\bgalaxy\s*([a-z]\s*\d{1,3})(?:\s*(ultra|plus|fe|\+))?/i,
  );
  if (galaxy) {
    const code = galaxy[1]!.replace(/\s+/g, "").toUpperCase();
    const suffix = galaxy[2] === "+" ? "Plus" : galaxy[2] ? titleWords(galaxy[2]) : null;
    return ["Galaxy", code, suffix].filter(Boolean).join(" ");
  }

  let value = lower
    .replace(new RegExp(brand, "ig"), " ")
    .replace(/\b(\d{2,4})\s*(?:gb|гб|гбайт|g)(?![a-zа-я])/giu, " ")
    .replace(/(?:ram|озу)\s*[:\-]?\s*\d{1,3}\s*(?:gb|гб)?/gi, " ")
    .replace(/(?<![a-zа-я])(black|white|blue|черный|черная|белый|белая|синий|синяя)(?![a-zа-я])/giu, " ")
    .replace(/(?<![a-zа-я])(смартфон|телефон|стиральная|машина|холодильник|телевизор|ноутбук)(?![a-zа-я])/giu, " ")
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:кг|kg)(?![a-zа-я])/giu, " ")
    .replace(/[^a-zа-я0-9+\- ]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!value) {
    if (category === "washing_machine") return "Washing Machine";
    return "Unknown Model";
  }

  value = titleWords(value);
  return value;
}

function detectVariant(input: string): string | null {
  const capacity = input.match(/\b(\d+(?:[.,]\d+)?)\s*(?:кг|kg)(?![a-zа-я])/iu);
  return capacity?.[1] ? `${capacity[1].replace(",", ".")}kg` : null;
}

export function normalizeProductQuery(rawQuery: string): ProductQuery {
  const originalQuery = clean(rawQuery);
  const brand = detectBrand(originalQuery);
  const category = detectCategory(originalQuery);
  const storage = detectStorage(originalQuery);
  const ram = detectRam(originalQuery);
  const color = detectColor(originalQuery);
  const variant = detectVariant(originalQuery);
  const model = detectModel(originalQuery, brand, category);

  const normalizedName = [
    brand.toLowerCase(),
    model.toLowerCase(),
    category,
    storage?.toLowerCase() ?? "",
    ram?.toLowerCase() ?? "",
    variant ?? "",
    color ?? "",
  ].join("|");

  return { originalQuery, brand, model, category, storage, ram, color, variant, normalizedName };
}

export function productDisplayName(query: ProductQuery): string {
  return [query.brand === "Unknown" ? null : query.brand, query.model, query.storage, query.ram ? `RAM ${query.ram}` : null]
    .filter(Boolean)
    .join(" ");
}
