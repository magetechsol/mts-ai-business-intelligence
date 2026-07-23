import prisma from "../db.server";
import { fetchOrders, fetchProducts, fetchCustomers } from "./shopify-api.server";

export async function syncAllData(request: any, shopId: string) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [ordersData, productsData, customersData] = await Promise.all([
    fetchOrders(request, thirtyDaysAgo, now, shopId).catch((e) => {
      console.error("Failed to fetch orders:", e);
      return [];
    }),
    fetchProducts(request, shopId).catch((e) => {
      console.error("Failed to fetch products:", e);
      return [];
    }),
    fetchCustomers(request, shopId).catch((e) => {
      console.error("Failed to fetch customers:", e);
      return [];
    }),
  ]);

  await Promise.all([
    syncOrders(ordersData, shopId),
    syncProducts(productsData, shopId),
    syncCustomers(customersData, shopId),
  ]);

  await prisma.appSettings.upsert({
    where: { shopId },
    update: { lastSyncAt: now },
    create: { shopId, lastSyncAt: now },
  });

  return {
    orders: ordersData.length,
    products: productsData.length,
    customers: customersData.length,
  };
}

async function syncOrders(orders: any[], shopId: string) {
  for (const order of orders) {
    const { lineItems, ...orderData } = order;
    await prisma.syncedOrder.upsert({
      where: { id: order.id },
      update: {
        financialStatus: orderData.financialStatus,
        fulfillmentStatus: orderData.fulfillmentStatus,
        totalPrice: orderData.totalPrice,
        subtotalPrice: orderData.subtotalPrice,
        totalTax: orderData.totalTax,
        totalDiscounts: orderData.totalDiscounts,
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
      await prisma.syncedOrderItem.deleteMany({ where: { orderId: order.id } });
      for (const item of lineItems) {
        await prisma.syncedOrderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            productTitle: item.productTitle,
            variantId: item.variantId,
            variantTitle: item.variantTitle,
            sku: item.sku,
            quantity: item.quantity,
            price: item.price,
          },
        });
      }
    }
  }
}

async function syncProducts(products: any[], shopId: string) {
  for (const product of products) {
    const { variants, ...productData } = product;

    await prisma.syncedProduct.upsert({
      where: { id: productData.id },
      update: {
        title: productData.title,
        vendor: productData.vendor,
        productType: productData.productType,
        status: productData.status,
        updatedAt: productData.updatedAt,
        tags: productData.tags,
        totalVariants: productData.totalVariants,
        imageCount: productData.imageCount,
        syncedAt: new Date(),
      },
      create: {
        ...productData,
        shopId,
      },
    });

    for (const variant of variants) {
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
  }
}

async function syncCustomers(customers: any[], shopId: string) {
  for (const customer of customers) {
    await prisma.syncedCustomer.upsert({
      where: { id: customer.id },
      update: {
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        ordersCount: customer.ordersCount,
        totalSpent: customer.totalSpent,
        updatedAt: customer.updatedAt,
        tags: customer.tags,
        syncedAt: new Date(),
      },
      create: {
        ...customer,
        shopId,
      },
    });
  }
}
