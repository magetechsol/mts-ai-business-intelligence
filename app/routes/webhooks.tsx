import type { ActionFunctionArgs } from "react-router";

export async function action({ request }: ActionFunctionArgs) {
  const { authenticate } = await import("~/shopify.server");
  const { default: prisma } = await import("~/db.server");

  try {
    const { session, topic } = await authenticate.webhook(request);

    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const shopId = session.shop;
    const body = await request.json();
    const topicHeader = request.headers.get("X-Shopify-Topic") || topic || "";

    if (topicHeader.includes("orders/")) {
      await handleOrderWebhook(shopId, body, topicHeader, prisma);
    } else if (topicHeader.includes("products/")) {
      await handleProductWebhook(shopId, body, topicHeader, prisma);
    } else if (topicHeader.includes("customers/")) {
      await handleCustomerWebhook(shopId, body, topicHeader, prisma);
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Error", { status: 500 });
  }
}

async function handleOrderWebhook(shopId: string, body: any, topic: string, prisma: any) {
  const order = body;
  if (!order?.id) return;

  const orderId = String(order.id);

  if (topic.includes("create")) {
    await prisma.syncedOrder.upsert({
      where: { id: orderId },
      update: {
        financialStatus: order.financial_status,
        fulfillmentStatus: order.fulfillment_status,
        totalPrice: parseFloat(order.total_price || "0"),
        subtotalPrice: parseFloat(order.subtotal_price || "0"),
        totalTax: parseFloat(order.total_tax || "0"),
        totalDiscounts: parseFloat(order.total_discounts || "0"),
        tags: order.tags?.join(",") || null,
        syncedAt: new Date(),
      },
      create: {
        id: orderId,
        shopId,
        name: order.name || `#${order.order_number}`,
        email: order.email || null,
        createdAt: new Date(order.created_at || new Date()),
        processedAt: order.processed_at ? new Date(order.processed_at) : null,
        financialStatus: order.financial_status,
        fulfillmentStatus: order.fulfillment_status,
        totalPrice: parseFloat(order.total_price || "0"),
        subtotalPrice: parseFloat(order.subtotal_price || "0"),
        totalTax: parseFloat(order.total_tax || "0"),
        totalDiscounts: parseFloat(order.total_discounts || "0"),
        currency: order.currency || "USD",
        lineItemCount: order.line_items?.length || 0,
        customerEmail: order.customer?.email || null,
        tags: order.tags?.join(",") || null,
      },
    });
  } else if (topic.includes("update")) {
    await prisma.syncedOrder.updateMany({
      where: { id: orderId, shopId },
      data: {
        financialStatus: order.financial_status,
        fulfillmentStatus: order.fulfillment_status,
        totalPrice: parseFloat(order.total_price || "0"),
        tags: order.tags?.join(",") || null,
        syncedAt: new Date(),
      },
    });
  }
}

async function handleProductWebhook(shopId: string, body: any, topic: string, prisma: any) {
  const product = body;
  if (!product?.id) return;

  const productId = String(product.id);

  if (topic.includes("delete")) {
    await prisma.syncedProduct.deleteMany({ where: { id: productId, shopId } });
    return;
  }

  await prisma.syncedProduct.upsert({
    where: { id: productId },
    update: {
      title: product.title,
      vendor: product.vendor,
      productType: product.product_type,
      status: product.status,
      updatedAt: new Date(product.updated_at || new Date()),
      tags: product.tags?.join(",") || null,
      totalVariants: product.variants?.length || 0,
      imageCount: product.images?.length || 0,
      syncedAt: new Date(),
    },
    create: {
      id: productId,
      shopId,
      title: product.title,
      vendor: product.vendor,
      productType: product.product_type,
      status: product.status,
      createdAt: new Date(product.created_at || new Date()),
      updatedAt: new Date(product.updated_at || new Date()),
      tags: product.tags?.join(",") || null,
      totalVariants: product.variants?.length || 0,
      imageCount: product.images?.length || 0,
    },
  });

  for (const variant of product.variants || []) {
    await prisma.syncedProductVariant.upsert({
      where: { id: String(variant.id) },
      update: {
        title: variant.title,
        sku: variant.sku,
        price: parseFloat(variant.price || "0"),
        inventory: variant.inventory_quantity || 0,
        syncedAt: new Date(),
      },
      create: {
        id: String(variant.id),
        productId,
        title: variant.title,
        sku: variant.sku,
        price: parseFloat(variant.price || "0"),
        inventory: variant.inventory_quantity || 0,
      },
    });
  }
}

async function handleCustomerWebhook(shopId: string, body: any, topic: string, prisma: any) {
  const customer = body;
  if (!customer?.id) return;

  const customerId = String(customer.id);

  await prisma.syncedCustomer.upsert({
    where: { id: customerId },
    update: {
      email: customer.email,
      firstName: customer.first_name,
      lastName: customer.last_name,
      ordersCount: customer.orders_count || 0,
      totalSpent: parseFloat(customer.total_spent || "0"),
      updatedAt: new Date(customer.updated_at || new Date()),
      tags: customer.tags?.join(",") || null,
      syncedAt: new Date(),
    },
    create: {
      id: customerId,
      shopId,
      email: customer.email,
      firstName: customer.first_name,
      lastName: customer.last_name,
      ordersCount: customer.orders_count || 0,
      totalSpent: parseFloat(customer.total_spent || "0"),
      createdAt: new Date(customer.created_at || new Date()),
      updatedAt: new Date(customer.updated_at || new Date()),
      tags: customer.tags?.join(",") || null,
    },
  });
}
