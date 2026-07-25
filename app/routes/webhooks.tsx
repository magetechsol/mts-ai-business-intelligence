import type { ActionFunctionArgs } from "react-router";

export async function action({ request }: ActionFunctionArgs) {
  const { authenticate } = await import("~/shopify.server");
  const { default: prisma } = await import("~/db.server");

  const topicHeader = request.headers.get("X-Shopify-Topic") || "";

  if (topicHeader === "shop/redact") {
    return handleShopRedact(request, prisma);
  }
  if (topicHeader === "customers/data_request") {
    return handleCustomerDataRequest(request);
  }
  if (topicHeader === "customers/redact") {
    return handleCustomerRedact(request, prisma);
  }
  if (topicHeader === "app_subscriptions/update") {
    return handleSubscriptionUpdate(request, prisma);
  }

  try {
    const { session, topic } = await authenticate.webhook(request);
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const shopId = session.shop;
    const body = await request.json();

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

async function handleShopRedact(request: Request, prisma: any) {
  try {
    const body = await request.json();
    const shopDomain = body.shop_domain;
    if (shopDomain) {
      await prisma.aiInsight.deleteMany({ where: { shopId: shopDomain } });
      await prisma.appSettings.deleteMany({ where: { shopId: shopDomain } });
      await prisma.syncedOrder.deleteMany({ where: { shopId: shopDomain } });
      await prisma.syncedProduct.deleteMany({ where: { shopId: shopDomain } });
      await prisma.syncedCustomer.deleteMany({ where: { shopId: shopDomain } });
      await prisma.session.deleteMany({ where: { shop: shopDomain } });
      console.log(`[GDPR] Shop data redacted: ${shopDomain}`);
    }
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("[GDPR] Shop redact error:", error);
    return new Response("OK", { status: 200 });
  }
}

async function handleCustomerDataRequest(request: Request) {
  try {
    const body = await request.json();
    const { customer } = body;
    if (customer?.email) {
      console.log(`[GDPR] Customer data request: ${customer.email} from ${body.shop_domain}`);
    }
    return new Response("OK", { status: 200 });
  } catch {
    return new Response("OK", { status: 200 });
  }
}

async function handleCustomerRedact(request: Request, prisma: any) {
  try {
    const body = await request.json();
    const { customer } = body;
    if (customer?.email) {
      await prisma.syncedCustomer.deleteMany({
        where: { email: customer.email, shopId: body.shop_domain },
      });
      console.log(`[GDPR] Customer data redacted: ${customer.email}`);
    }
    return new Response("OK", { status: 200 });
  } catch {
    return new Response("OK", { status: 200 });
  }
}

async function handleSubscriptionUpdate(request: Request, prisma: any) {
  try {
    const body = await request.json();
    const shopDomain = body.shop_domain;
    const subscription = body.app_subscription;

    if (shopDomain && subscription) {
      const isActive = subscription.status === "active";
      const planName = subscription.name || "free";

      console.log(`[Billing] Subscription updated: ${shopDomain} -> ${planName} (${subscription.status})`);

      await prisma.appSettings.upsert({
        where: { shopId: shopDomain },
        update: { plan: planName, billingStatus: subscription.status },
        create: { shopId: shopDomain, plan: planName, billingStatus: subscription.status },
      });
    }
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("[Billing] Subscription update error:", error);
    return new Response("OK", { status: 200 });
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
