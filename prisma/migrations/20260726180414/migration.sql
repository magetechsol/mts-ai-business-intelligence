-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN NOT NULL DEFAULT false,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" BIGSERIAL NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncedOrder" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "financialStatus" TEXT,
    "fulfillmentStatus" TEXT,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "subtotalPrice" DOUBLE PRECISION NOT NULL,
    "totalTax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDiscounts" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "lineItemCount" INTEGER NOT NULL DEFAULT 0,
    "customerEmail" TEXT,
    "tags" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncedOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncedOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "productTitle" TEXT,
    "variantId" TEXT,
    "variantTitle" TEXT,
    "sku" TEXT,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncedOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncedProduct" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "vendor" TEXT,
    "productType" TEXT,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "totalVariants" INTEGER NOT NULL DEFAULT 0,
    "imageCount" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncedProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncedProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sku" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "inventory" INTEGER NOT NULL DEFAULT 0,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncedProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncedCustomer" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "email" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "ordersCount" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tags" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncedCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "snapshotType" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "metricValue" DOUBLE PRECISION NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiInsight" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "insightType" TEXT NOT NULL,
    "question" TEXT,
    "answer" TEXT NOT NULL,
    "data" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "openaiKey" TEXT,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "plan" TEXT NOT NULL DEFAULT 'free',
    "billingStatus" TEXT NOT NULL DEFAULT 'active',
    "subscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SyncedOrder_shopId_createdAt_idx" ON "SyncedOrder"("shopId", "createdAt");

-- CreateIndex
CREATE INDEX "SyncedOrder_shopId_financialStatus_idx" ON "SyncedOrder"("shopId", "financialStatus");

-- CreateIndex
CREATE INDEX "SyncedOrderItem_orderId_idx" ON "SyncedOrderItem"("orderId");

-- CreateIndex
CREATE INDEX "SyncedOrderItem_productId_idx" ON "SyncedOrderItem"("productId");

-- CreateIndex
CREATE INDEX "SyncedProduct_shopId_idx" ON "SyncedProduct"("shopId");

-- CreateIndex
CREATE INDEX "SyncedCustomer_shopId_idx" ON "SyncedCustomer"("shopId");

-- CreateIndex
CREATE INDEX "SyncedCustomer_shopId_totalSpent_idx" ON "SyncedCustomer"("shopId", "totalSpent");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_shopId_snapshotType_period_metricName_idx" ON "AnalyticsSnapshot"("shopId", "snapshotType", "period", "metricName");

-- CreateIndex
CREATE INDEX "AiInsight_shopId_insightType_idx" ON "AiInsight"("shopId", "insightType");

-- CreateIndex
CREATE UNIQUE INDEX "AppSettings_shopId_key" ON "AppSettings"("shopId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncedOrderItem" ADD CONSTRAINT "SyncedOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SyncedOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncedProductVariant" ADD CONSTRAINT "SyncedProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "SyncedProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
