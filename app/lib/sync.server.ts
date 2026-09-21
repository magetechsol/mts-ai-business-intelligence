import prisma from "../db.server";
import { fetchOrders, fetchProducts, fetchCustomers } from "./shopify-api.server";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function syncAllData(admin: any, shopId: string) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const errors: string[] = [];
  let ordersData: any[] = [];
  let productsData: any[] = [];
  let customersData: any[] = [];

  try {
    ordersData = await fetchOrders(admin, thirtyDaysAgo, now, shopId);
  } catch (e: any) {
    const msg = e?.message || "Failed to fetch orders";
    console.error(`[Sync] Orders fetch failed: ${msg}`);
    errors.push(`Orders: ${msg}`);
  }

  await delay(1000);

  try {
    productsData = await fetchProducts(admin, shopId);
  } catch (e: any) {
    const msg = e?.message || "Failed to fetch products";
    console.error(`[Sync] Products fetch failed: ${msg}`);
    errors.push(`Products: ${msg}`);
  }

  await delay(1000);

  try {
    customersData = await fetchCustomers(admin, shopId);
  } catch (e: any) {
    const msg = e?.message || "Failed to fetch customers";
    console.error(`[Sync] Customers fetch failed: ${msg}`);
    errors.push(`Customers: ${msg}`);
  }

  if (ordersData.length > 0) {
    const result = await syncOrders(ordersData, shopId);
    errors.push(...result.errors);
  }

  if (productsData.length > 0) {
    const result = await syncProducts(productsData, shopId);
    errors.push(...result.errors);
  }

  if (customersData.length > 0) {
    const result = await syncCustomers(customersData, shopId);
    errors.push(...result.errors);
  }

  await prisma.appSettings.upsert({
    where: { shopId },
    update: { lastSyncAt: now },
    create: { shopId, lastSyncAt: now },
  });

  return {
    orders: ordersData.length,
    products: productsData.length,
    customers: customersData.length,
    errors: errors.length > 0 ? errors : undefined,
  };
}

async function syncOrders(
  orders: any[],
  shopId: string
): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = [];
  let syncedCount = 0;

  for (const order of orders) {
    const { lineItems, ...orderData } = order;
    try {
      await prisma.syncedOrder.upsert({
        where: { id: orderData.id },
        update: {
          shopId,
          name: orderData.name,
          email: orderData.email,
          createdAt: orderData.createdAt,
          processedAt: orderData.processedAt,
          financialStatus: orderData.financialStatus,
          fulfillmentStatus: orderData.fulfillmentStatus,
          totalPrice: orderData.totalPrice,
          subtotalPrice: orderData.subtotalPrice,
          totalTax: orderData.totalTax,
          totalDiscounts: orderData.totalDiscounts,
          currency: orderData.currency,
          lineItemCount: orderData.lineItemCount,
          customerEmail: orderData.customerEmail,
          tags: orderData.tags,
          syncedAt: new Date(),
        },
        create: {
          id: orderData.id,
          shopId: orderData.shopId,
          name: orderData.name,
          email: orderData.email,
          createdAt: orderData.createdAt,
          processedAt: orderData.processedAt,
          financialStatus: orderData.financialStatus,
          fulfillmentStatus: orderData.fulfillmentStatus,
          totalPrice: orderData.totalPrice,
          subtotalPrice: orderData.subtotalPrice,
          totalTax: orderData.totalTax,
          totalDiscounts: orderData.totalDiscounts,
          currency: orderData.currency,
          lineItemCount: orderData.lineItemCount,
          customerEmail: orderData.customerEmail,
          tags: orderData.tags,
        },
      });

      if (lineItems && lineItems.length > 0) {
        await prisma.$transaction([
          prisma.syncedOrderItem.deleteMany({ where: { orderId: orderData.id } }),
          prisma.syncedOrderItem.createMany({
            data: lineItems.map((item: any) => ({
              orderId: orderData.id,
              productId: item.productId,
              productTitle: item.productTitle,
              variantId: item.variantId,
              variantTitle: item.variantTitle,
              sku: item.sku,
              quantity: item.quantity,
              price: item.price,
            })),
          }),
        ]);
      }

      syncedCount++;
    } catch (e: any) {
      const msg = e?.message || "Unknown error";
      console.error(`[Sync] Order ${orderData.name || orderData.id} sync failed: ${msg}`);
      errors.push(`Order ${orderData.name || orderData.id}: ${msg}`);
    }
  }

  return { synced: syncedCount, errors };
}

async function syncProducts(
  products: any[],
  shopId: string
): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = [];
  let syncedCount = 0;

  for (const product of products) {
    const { variants, ...productData } = product;
    try {
      await prisma.syncedProduct.upsert({
        where: { id: productData.id },
        update: {
          shopId,
          title: productData.title,
          vendor: productData.vendor,
          productType: productData.productType,
          status: productData.status,
          createdAt: productData.createdAt,
          updatedAt: productData.updatedAt,
          tags: productData.tags,
          totalVariants: productData.totalVariants,
          imageCount: productData.imageCount,
          syncedAt: new Date(),
        },
        create: {
          id: productData.id,
          shopId,
          title: productData.title,
          vendor: productData.vendor,
          productType: productData.productType,
          status: productData.status,
          createdAt: productData.createdAt,
          updatedAt: productData.updatedAt,
          tags: productData.tags,
          totalVariants: productData.totalVariants,
          imageCount: productData.imageCount,
        },
      });

      for (const variant of variants || []) {
        await prisma.syncedProductVariant.upsert({
          where: { id: variant.id },
          update: {
            title: variant.title,
            sku: variant.sku,
            price: variant.price,
            inventory: variant.inventory,
            syncedAt: new Date(),
          },
          create: {
            id: variant.id,
            productId: productData.id,
            title: variant.title,
            sku: variant.sku,
            price: variant.price,
            inventory: variant.inventory,
          },
        });
      }

      syncedCount++;
    } catch (e: any) {
      const msg = e?.message || "Unknown error";
      console.error(`[Sync] Product ${productData.title || productData.id} sync failed: ${msg}`);
      errors.push(`Product ${productData.title || productData.id}: ${msg}`);
    }
  }

  return { synced: syncedCount, errors };
}

async function syncCustomers(
  customers: any[],
  shopId: string
): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = [];
  let syncedCount = 0;

  for (const customer of customers) {
    try {
      await prisma.syncedCustomer.upsert({
        where: { id: customer.id },
        update: {
          shopId,
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          ordersCount: customer.ordersCount,
          totalSpent: customer.totalSpent,
          createdAt: customer.createdAt,
          updatedAt: customer.updatedAt,
          tags: customer.tags,
          syncedAt: new Date(),
        },
        create: {
          id: customer.id,
          shopId,
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          ordersCount: customer.ordersCount,
          totalSpent: customer.totalSpent,
          createdAt: customer.createdAt,
          updatedAt: customer.updatedAt,
          tags: customer.tags,
        },
      });

      syncedCount++;
    } catch (e: any) {
      const msg = e?.message || "Unknown error";
      console.error(`[Sync] Customer ${customer.email || customer.id} sync failed: ${msg}`);
      errors.push(`Customer ${customer.email || customer.id}: ${msg}`);
    }
  }

  return { synced: syncedCount, errors };
}