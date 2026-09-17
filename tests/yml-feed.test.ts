import { describe, expect, it } from "vitest";
import { parseYmlCatalog } from "../src/sources/yml/yml-feed.source.js";

const feed = `<?xml version="1.0" encoding="UTF-8"?>
<yml_catalog date="2026-09-17 12:00">
  <shop>
    <name>Открытый магазин</name>
    <currencies><currency id="RUB" rate="1"/></currencies>
    <offers>
      <offer id="1" available="true">
        <name>Apple iPhone 16 Pro 256GB Black</name>
        <url>https://shop.example/iphone-16-pro</url>
        <price>89990</price>
        <currencyId>RUB</currencyId>
        <delivery-options><option cost="500" days="1-2"/></delivery-options>
      </offer>
      <offer id="2" available="false">
        <typePrefix>Смартфон</typePrefix><vendor>Samsung</vendor><model>Galaxy S25 256GB</model>
        <url>/galaxy-s25</url><price>74990.40</price><currencyId>RUR</currencyId>
      </offer>
    </offers>
  </shop>
</yml_catalog>`;

describe("YML feed", () => {
  it("разбирает цену, доставку, наличие и относительные ссылки", () => {
    const offers = parseYmlCatalog(feed, { sourceName: "YML Test", feedUrl: "https://shop.example/feed.xml" });
    expect(offers).toHaveLength(2);
    expect(offers[0]).toMatchObject({
      seller: "Открытый магазин",
      price: 89_990,
      deliveryPrice: 500,
      deliveryKnown: true,
      availability: "in_stock",
    });
    expect(offers[1]).toMatchObject({
      title: "Смартфон Samsung Galaxy S25 256GB",
      price: 74_990,
      deliveryKnown: false,
      availability: "out_of_stock",
      currency: "RUB",
      url: "https://shop.example/galaxy-s25",
    });
  });

  it("отклоняет DTD и внешние сущности", () => {
    expect(() => parseYmlCatalog('<!DOCTYPE x [<!ENTITY x SYSTEM "file:///etc/passwd">]><x/>', {
      sourceName: "Unsafe",
      feedUrl: "https://shop.example/feed.xml",
    })).toThrow(/DOCTYPE/);
  });
});
