import type { MaxKeyboard } from "./types.js";

export const mainMenuKeyboard = (): MaxKeyboard => [
  [
    { type: "callback", text: "🔎 Найти товар", payload: "menu:search", intent: "positive" },
    { type: "callback", text: "📉 Мои отслеживания", payload: "menu:alerts" },
  ],
  [
    { type: "callback", text: "📊 История цен", payload: "menu:history" },
    { type: "callback", text: "⭐ Избранное", payload: "menu:favorites" },
  ],
  [{ type: "callback", text: "👤 Профиль", payload: "menu:profile" }],
];

export function productKeyboard(
  productId: string,
  offerLinks: Array<{ seller: string; url: string }>,
): MaxKeyboard {
  const offerRows: MaxKeyboard = offerLinks.slice(0, 3).map((offer, index) => [
    { type: "link", text: `🛒 ${index + 1}. ${offer.seller}`.slice(0, 128), url: offer.url },
  ]);
  return [
    ...offerRows,
    [
      { type: "callback", text: "📉 Следить", payload: `product:track:${productId}`, intent: "positive" },
      { type: "callback", text: "⭐ Избранное", payload: `product:favorite:${productId}` },
    ],
    [{ type: "callback", text: "📊 История цены", payload: `product:history:${productId}` }],
    [{ type: "callback", text: "🏠 Главное меню", payload: "menu:home" }],
  ];
}

export const backToMenuKeyboard = (): MaxKeyboard => [
  [{ type: "callback", text: "🏠 Главное меню", payload: "menu:home" }],
];
