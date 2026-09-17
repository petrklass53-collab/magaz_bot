export type ProductCategory =
  | "smartphone"
  | "washing_machine"
  | "refrigerator"
  | "television"
  | "laptop"
  | "other";

export function detectCategory(input: string): ProductCategory {
  const value = input.toLowerCase();
  if (/iphone|galaxy|смартфон|телефон|redmi|poco/.test(value)) return "smartphone";
  if (/apple.*\b\d{1,2}\s*(?:pro|max|plus|mini)/i.test(value)) return "smartphone";
  if (/стирал|washing\s*machine/.test(value)) return "washing_machine";
  if (/холодиль|refrigerator|fridge/.test(value)) return "refrigerator";
  if (/телевизор|\btv\b|television/.test(value)) return "television";
  if (/ноутбук|laptop|macbook/.test(value)) return "laptop";
  return "other";
}
