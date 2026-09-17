-- Preserve whether a source supplied delivery cost. Existing offers predate
-- this distinction and came from sources with a known delivery value.
ALTER TABLE "Offer"
ADD COLUMN "deliveryKnown" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "PriceHistory"
ADD COLUMN "deliveryKnown" BOOLEAN NOT NULL DEFAULT true;
