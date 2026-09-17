import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import { matchOfferTitle } from "../../core/matching.service.js";
import type { ProductQuery } from "../../normalizer/normalizer.js";
import type { Offer, SourceAdapter } from "../source.interface.js";

type UnknownRecord = Record<string, unknown>;

export interface YmlFeedSourceOptions {
  name: string;
  url: string;
  timeoutMs: number;
  cacheTtlMs: number;
  maxBytes: number;
  maxSearchOffers: number;
}

export interface ParseYmlOptions {
  sourceName: string;
  feedUrl: string;
}

function record(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function list(value: unknown): unknown[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function text(value: unknown): string {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value).trim();
  const object = record(value);
  return object ? text(object["#text"] ?? "") : "";
}

function amount(value: unknown): number | null {
  const parsed = Number(text(value).replace(/\s+/g, "").replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null;
}

function absoluteHttpUrl(value: unknown, baseUrl: string): string | null {
  try {
    const url = new URL(text(value), baseUrl);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function minimumDeliveryCost(offer: UnknownRecord, shop: UnknownRecord): number | null {
  const offerOptions = record(offer["delivery-options"])?.option;
  const shopOptions = record(shop["delivery-options"])?.option;
  const costs = list(offerOptions ?? shopOptions)
    .map((option) => amount(record(option)?.["@_cost"]))
    .filter((cost): cost is number => cost !== null);
  return costs.length ? Math.min(...costs) : null;
}

function offerTitle(offer: UnknownRecord): string {
  const explicitName = text(offer.name);
  if (explicitName) return explicitName;
  return [offer.typePrefix, offer.vendor, offer.model].map(text).filter(Boolean).join(" ");
}

/** Разбирает стандартную YML-ленту без выполнения внешних сущностей. */
export function parseYmlCatalog(xml: string, options: ParseYmlOptions): Offer[] {
  if (/<!DOCTYPE|<!ENTITY/iu.test(xml)) throw new Error("DOCTYPE и ENTITY в YML не поддерживаются");

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseTagValue: false,
    processEntities: false,
    trimValues: true,
  });
  const document = record(parser.parse(xml));
  const catalog = record(document?.yml_catalog);
  const shop = record(catalog?.shop);
  if (!shop) throw new Error("В YML отсутствует yml_catalog/shop");

  const seller = text(shop.name) || options.sourceName;
  const rawOffers = list(record(shop.offers)?.offer);
  const offers: Offer[] = [];

  for (const rawOffer of rawOffers) {
    const item = record(rawOffer);
    if (!item) continue;
    const title = offerTitle(item);
    const price = amount(item.price);
    const url = absoluteHttpUrl(item.url, options.feedUrl);
    const rawCurrency = text(item.currencyId).toUpperCase();
    const currency = rawCurrency === "RUR" ? "RUB" : rawCurrency;
    if (!title || price === null || price <= 0 || !url || currency !== "RUB") continue;

    const deliveryPrice = minimumDeliveryCost(item, shop);
    const available = text(item["@_available"]).toLowerCase();
    offers.push({
      source: options.sourceName,
      seller,
      title,
      price,
      deliveryPrice: deliveryPrice ?? 0,
      deliveryKnown: deliveryPrice !== null,
      mandatoryFees: 0,
      currency: "RUB",
      availability: ["false", "0", "no"].includes(available) ? "out_of_stock" : "in_stock",
      url,
    });
  }

  return offers;
}

export class YmlFeedSource implements SourceAdapter {
  readonly name: string;
  private cachedAt = 0;
  private cachedOffers: Offer[] = [];
  private refreshInFlight: Promise<Offer[]> | undefined;

  constructor(private readonly options: YmlFeedSourceOptions) {
    this.name = options.name;
    const protocol = new URL(options.url).protocol;
    if (!['http:', 'https:'].includes(protocol)) throw new Error(`Недопустимый URL источника ${options.name}`);
  }

  async search(query: ProductQuery): Promise<Offer[]> {
    const catalog = await this.catalog();
    return catalog
      .filter((offer) => offer.availability === "in_stock" && matchOfferTitle(query, offer.title).matches)
      .slice(0, this.options.maxSearchOffers)
      .map((offer) => ({ ...offer }));
  }

  private async catalog(): Promise<Offer[]> {
    if (this.cachedOffers.length && Date.now() - this.cachedAt < this.options.cacheTtlMs) return this.cachedOffers;
    if (this.refreshInFlight) return this.refreshInFlight;

    this.refreshInFlight = this.fetchCatalog().finally(() => {
      this.refreshInFlight = undefined;
    });
    return this.refreshInFlight;
  }

  private async fetchCatalog(): Promise<Offer[]> {
    const response = await axios.get<string>(this.options.url, {
      responseType: "text",
      timeout: this.options.timeoutMs,
      maxContentLength: this.options.maxBytes,
      maxBodyLength: this.options.maxBytes,
      maxRedirects: 3,
      headers: { Accept: "application/xml,text/xml;q=0.9", "User-Agent": "PriceHunter/0.2 (+MAX bot)" },
      transformResponse: [(value) => value],
    });
    if (typeof response.data !== "string") throw new Error(`Источник ${this.name} вернул не XML`);
    const offers = parseYmlCatalog(response.data, { sourceName: this.name, feedUrl: this.options.url });
    this.cachedOffers = offers;
    this.cachedAt = Date.now();
    return offers;
  }
}
