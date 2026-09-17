import type { Product } from "@prisma/client";
import type { SearchResult } from "../core/search.service.js";
import { productDisplayName, normalizeProductQuery } from "../normalizer/normalizer.js";
import { formatRubles } from "../utils/money.js";

export const welcomeMessage = (name?: string): string =>
  [
    `👋 ${name ? `${name}, добро пожаловать` : "Добро пожаловать"} в PriceHunter!`,
    "",
    "Я сравниваю предложения по итоговой цене: товар + доставка + обязательные сборы.",
    "",
    "Цены беру только из подключённых разрешённых API и открытых/партнёрских товарных лент.",
    "Например: iPhone 16 Pro 256GB или Samsung Galaxy S25 256GB.",
    "",
    "Нажмите «Найти товар» или сразу отправьте название.",
  ].join("\n");

export function formatSearchResult(result: SearchResult): string {
  const query = normalizeProductQuery(result.product.normalizedName.replace(/\|/g, " "));
  const title = [result.product.brand === "Unknown" ? null : result.product.brand, result.product.model, result.product.storage]
    .filter(Boolean)
    .join(" ");

  if (result.offers.length === 0) {
    return [
      `🔎 ${title || productDisplayName(query)}`,
      "",
      "Предложений пока не найдено.",
      "В подключённых источниках предложений пока нет. Попробуйте уточнить модель и модификацию.",
    ].join("\n");
  }

  const knownTotals = result.offers.filter((offer) => offer.deliveryKnown).map((offer) => offer.totalPrice);
  const pricedOffers = knownTotals.length ? knownTotals : result.offers.map((offer) => offer.totalPrice);
  const average = Math.round(pricedOffers.reduce((sum, price) => sum + price, 0) / pricedOffers.length);
  const best = result.offers[0]!;
  const medals = ["🥇", "🥈", "🥉"];
  const lines = [
    `📱 ${title}`,
    `💰 ${best.deliveryKnown ? "Итого от" : "Цена товара от"}: ${formatRubles(best.totalPrice)}`,
    `📊 ${knownTotals.length ? "Средняя итоговая цена" : "Средняя цена товара"}: ${formatRubles(average)}`,
    "━━━━━━━━━━━━━━━━",
  ];

  result.offers.slice(0, 3).forEach((offer, index) => {
    lines.push(
      `${medals[index] ?? "•"} ${formatRubles(offer.totalPrice)}`,
      `🏪 ${offer.seller}`,
      `🚚 Доставка: ${offer.deliveryKnown ? (offer.deliveryPrice === 0 ? "бесплатно" : formatRubles(offer.deliveryPrice)) : "не указана источником"}`,
      `📦 ${offer.availability === "in_stock" ? "В наличии" : offer.availability}`,
    );
    if (offer.suspiciouslyCheap) lines.push("⚠️ Цена значительно ниже остальных — проверьте продавца, комплектацию и гарантию.");
    if (index < Math.min(result.offers.length, 3) - 1) lines.push("");
  });

  const hasDemo = result.offers.some((offer) => offer.source === "DemoSource");
  lines.push(
    "━━━━━━━━━━━━━━━━",
    hasDemo
      ? "ℹ️ Предложения DemoSource являются демонстрационными."
      : "ℹ️ Перед покупкой проверьте цену, наличие и доставку на сайте продавца.",
  );
  if (result.failedSources.length) lines.push(`⚠️ Недоступны источники: ${result.failedSources.join(", ")}`);
  return lines.join("\n").slice(0, 4_000);
}

export function productTitle(product: Product): string {
  return [product.brand === "Unknown" ? null : product.brand, product.model, product.storage]
    .filter(Boolean)
    .join(" ");
}
