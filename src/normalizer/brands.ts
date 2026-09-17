const brandAliases: ReadonlyArray<[RegExp, string]> = [
  [/(?<![a-zа-я0-9])(?:apple|эппл|iphone)(?![a-zа-я0-9])/iu, "Apple"],
  [/(?<![a-zа-я0-9])(?:samsung|самсунг|galaxy)(?![a-zа-я0-9])/iu, "Samsung"],
  [/(?<![a-zа-я0-9])(?:bosch|бош)(?![a-zа-я0-9])/iu, "Bosch"],
  [/(?<![a-zа-я0-9])(?:xiaomi|сяоми|redmi|poco)(?![a-zа-я0-9])/iu, "Xiaomi"],
  [/(?<![a-zа-я0-9])lg(?![a-zа-я0-9])/iu, "LG"],
  [/(?<![a-zа-я0-9])(?:haier|хайер)(?![a-zа-я0-9])/iu, "Haier"],
];

export function detectBrand(input: string): string {
  for (const [pattern, brand] of brandAliases) {
    if (pattern.test(input)) return brand;
  }
  return "Unknown";
}
