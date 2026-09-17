import type { ProductQuery } from "../../normalizer/normalizer.js";
import type { Offer, SourceAdapter } from "../source.interface.js";

interface DemoCatalogItem {
  matches: (query: ProductQuery) => boolean;
  offers: Offer[];
}

const demoCatalog: DemoCatalogItem[] = [
  {
    matches: (query) => query.brand === "Apple" && query.model === "iPhone 16 Pro" && query.storage === "256GB",
    offers: [
      {
        source: "DemoSource",
        seller: "Демо-магазин А",
        title: "Apple iPhone 16 Pro 256GB",
        price: 89_990,
        deliveryPrice: 0,
        currency: "RUB",
        availability: "in_stock",
        url: "https://example.com/pricehunter-demo/iphone-16-pro-256-a",
      },
      {
        source: "DemoSource",
        seller: "Демо-магазин Б",
        title: "iPhone 16 Pro 256 ГБ Apple",
        price: 91_490,
        deliveryPrice: 500,
        currency: "RUB",
        availability: "in_stock",
        url: "https://example.com/pricehunter-demo/iphone-16-pro-256-b",
      },
      {
        source: "DemoSource",
        seller: "Демо-магазин В",
        title: "Apple 16 Pro 256GB",
        price: 92_990,
        deliveryPrice: 0,
        currency: "RUB",
        availability: "in_stock",
        url: "https://example.com/pricehunter-demo/iphone-16-pro-256-c",
      },
    ],
  },
  {
    matches: (query) => query.brand === "Samsung" && query.model === "Galaxy S25" && query.storage === "256GB",
    offers: [
      {
        source: "DemoSource",
        seller: "Демо-магазин А",
        title: "Samsung Galaxy S25 256GB",
        price: 74_990,
        deliveryPrice: 0,
        currency: "RUB",
        availability: "in_stock",
        url: "https://example.com/pricehunter-demo/galaxy-s25-256-a",
      },
      {
        source: "DemoSource",
        seller: "Демо-магазин Б",
        title: "Galaxy S25 256 ГБ Samsung",
        price: 76_490,
        deliveryPrice: 0,
        currency: "RUB",
        availability: "in_stock",
        url: "https://example.com/pricehunter-demo/galaxy-s25-256-b",
      },
    ],
  },
];

export class DemoSource implements SourceAdapter {
  readonly name = "DemoSource";

  async search(query: ProductQuery): Promise<Offer[]> {
    return demoCatalog.find((item) => item.matches(query))?.offers.map((offer) => ({ ...offer })) ?? [];
  }
}
