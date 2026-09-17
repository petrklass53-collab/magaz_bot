CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELED');
CREATE TYPE "UserState" AS ENUM ('IDLE', 'WAITING_FOR_SEARCH', 'WAITING_FOR_TARGET_PRICE', 'WAITING_FOR_CITY');

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "maxUserId" BIGINT NOT NULL,
    "username" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "trialUntil" TIMESTAMP(3) NOT NULL,
    "subscriptionUntil" TIMESTAMP(3),
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "city" TEXT,
    "state" "UserState" NOT NULL DEFAULT 'IDLE',
    "stateData" JSONB,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "variant" TEXT,
    "storage" TEXT,
    "color" TEXT,
    "normalizedName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "seller" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "deliveryPrice" INTEGER NOT NULL DEFAULT 0,
    "mandatoryFees" INTEGER NOT NULL DEFAULT 0,
    "totalPrice" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "availability" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "deliveryPrice" INTEGER NOT NULL DEFAULT 0,
    "mandatoryFees" INTEGER NOT NULL DEFAULT 0,
    "totalPrice" INTEGER NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PriceAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "targetPrice" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastNotifiedPrice" INTEGER,
    "lastNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PriceAlert_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Search" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Search_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProcessedUpdate" (
    "id" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProcessedUpdate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_maxUserId_key" ON "User"("maxUserId");
CREATE UNIQUE INDEX "Product_normalizedName_key" ON "Product"("normalizedName");
CREATE INDEX "Product_brand_model_idx" ON "Product"("brand", "model");
CREATE INDEX "Product_category_idx" ON "Product"("category");
CREATE UNIQUE INDEX "Offer_source_url_key" ON "Offer"("source", "url");
CREATE INDEX "Offer_productId_totalPrice_idx" ON "Offer"("productId", "totalPrice");
CREATE INDEX "PriceHistory_offerId_recordedAt_idx" ON "PriceHistory"("offerId", "recordedAt");
CREATE UNIQUE INDEX "PriceAlert_userId_productId_key" ON "PriceAlert"("userId", "productId");
CREATE INDEX "PriceAlert_active_updatedAt_idx" ON "PriceAlert"("active", "updatedAt");
CREATE UNIQUE INDEX "Favorite_userId_productId_key" ON "Favorite"("userId", "productId");
CREATE INDEX "Favorite_userId_createdAt_idx" ON "Favorite"("userId", "createdAt");
CREATE INDEX "Search_userId_createdAt_idx" ON "Search"("userId", "createdAt");
CREATE INDEX "ProcessedUpdate_processedAt_idx" ON "ProcessedUpdate"("processedAt");

ALTER TABLE "Offer" ADD CONSTRAINT "Offer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PriceAlert" ADD CONSTRAINT "PriceAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PriceAlert" ADD CONSTRAINT "PriceAlert_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Search" ADD CONSTRAINT "Search_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
