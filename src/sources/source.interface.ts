import type { ProductQuery } from "../normalizer/normalizer.js";

export interface Offer {
  source: string;
  seller: string;
  title: string;
  price: number;
  deliveryPrice: number;
  /** false означает, что источник не передал стоимость доставки. */
  deliveryKnown?: boolean;
  mandatoryFees?: number;
  currency: "RUB" | string;
  availability: "in_stock" | "out_of_stock" | "preorder" | string;
  url: string;
}

export interface SourceAdapter {
  readonly name: string;
  search(query: ProductQuery): Promise<Offer[]>;
}
