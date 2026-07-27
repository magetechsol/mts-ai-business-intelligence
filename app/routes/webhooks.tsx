import type { ActionFunctionArgs } from "react-router";
import crypto from "crypto";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const hmacHeader = request.headers.get("X-Shopify-Hmac-Sha256");
  const topicHeader = request.headers.get("X-Shopify-Topic") || "";
  const shopHeader = request.headers.get("X-Shopify-Shop-Domain") || "";

  if (!hmacHeader) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const body = await request.text();
    const secret = process.env.SHOPIFY_API_SECRET || "";
    const generatedHmac = crypto
      .createHmac("sha256", secret)
      .update(body, "utf8")
      .digest("base64");

    if (generatedHmac !== hmacHeader) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { authenticate } = await import("~/shopify.server");
    const { default: prisma } = await import("~/db.server");

    let session: any = null;
    try {
      const authResult = await authenticate.webhook(request);
      session = authResult.session;
    } catch {
      session = null;
    }

    if (!session && shopHeader) {
      session = await prisma.session.findFirst({ where: { shop: shopHeader } });
    }

    if (!session) {
      return new Response("OK", { status: 200 });
    }

    const shopId = session.shop;
    const bodyJson = JSON.parse(body);

    if (topicHeader === "shop/redact") {
      await handleShopRedact(shopId, bodyJson, prisma);
    } else if (topicHeader === "customers/data_request") {
      await handleCustomerDataRequest(shopId, bodyJson);
    } else if (topicHeader === "customers/redact") {
      await handleCustomerRedact(shopId, bodyJson, prisma);
    } else if (topicHeader === "app_subscriptions/update") {
      await handleSubscriptionUpdate(shopId, bodyJson, prisma);
    } else if (topicHeader.includes("orders/")) {
      await handleOrderWebhook(shopId, bodyJson, topicHeader, prisma);
    } else if (topicHeader.includes("products/")) {
      await handleProductWebhook(shopId, bodyJson, topicHeader, prisma);
    } else if (topicHeader.includes("customers/")) {
      await handleCustomerWebhook(shopId, bodyJson, topicHeader, prisma);
    }

    return new Response("OK", { status: 200 });
  } catch (error: any) {
    console.error("Webhook error:", error?.message || error);
    return new Response("OK", { status: 200 });
  }
}

async function handleShopRedact(shopId: string, body: any, prisma: any) {
  try {
    await prisma.aiInsight.deleteMany({ where: { shopId } });
    await prisma.appSettings.deleteMany({ where: { shopId } });
    await prisma.syncedOrderItem.deleteMany({
      where: { orderId: { in: (await prisma.syncedOrder.findMany({ where: { shopId }, select: { id: true } })).map((o: any) => o.id) } },
    });
    await prisma.syncedOrder.deleteMany({ where: { shopId } });
    await prisma.syncedProductVariant.deleteMany({
      where: { productId: { in: (await prisma.syncedProduct.findMany({ where: { shopId }, select: { id: true } })).map((p: any) => p.id) } },
    });
    await prisma.syncedProduct.deleteMany({ where: { shopId } });
    await prisma.syncedCustomer.deleteMany({ where: { shopId } });
    await prisma.session.deleteMany({ where: { shop: shopId } });
    console.log(`[GDPR] Shop data redacted: ${shopId}`);
  } catch (error) {
    console.error("[GDPR] Shop redact error:", error);
  }
}

async function handleCustomerDataRequest(shopId: string, body: any) {
  try {
    const { customer } = body;
    if (customer?.email) {
      console.log(`[GDPR] Customer data request: ${customer.email} from ${shopId}`);
    }
  } catch (error) {
    console.error("[GDPR] Customer data request error:", error);
  }
}

async function handleCustomerRedact(shopId: string, body: any, prisma: any) {
  try {
    const { customer } = body;
    if (customer?.id) {
      const customerId = String(customer.id);
      await prisma.syncedOrder.deleteMany({ where: { customerEmail: customer.email, shopId } });
      await prisma.syncedCustomer.deleteMany({ where: { id: customerId, shopId } });
    }
    if (customer?.email) {
      await prisma.syncedCustomer.deleteMany({ where: { email: customer.email, shopId } });
    }
    console.log(`[GDPR] Customer data redacted from ${shopId}`);
  } catch (error) {
    console.error("[GDPR] Customer redact error:", error);
  }
}

async function handleSubscriptionUpdate(shopId: string, body: any, prisma: any) {
  try {
    const subscription = body.app_subscription;
    if (subscription) {
      const planName = subscription.name || "free";
      console.log(`[Billing] Subscription updated: ${shopId} -> ${planName} (${subscription.status})`);
      await prisma.appSettings.upsert({
        where: { shopId },
        update: { plan: planName, billingStatus: subscription.status },
        create: { shopId, plan: planName, billingStatus: subscription.status },
      });
    }
  } catch (error) {
    console.error("[Billing] Subscription update error:", error);
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
    await prisma.syncedProductVariant.deleteMany({ where: { productId } });
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
