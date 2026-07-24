import type { LoaderFunctionArgs } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
  const results: Record<string, any> = {};

  results.env = {
    SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY ? "set" : "MISSING",
    SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET ? "set" : "MISSING",
    SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL || "MISSING",
    SCOPES: process.env.SCOPES ? "set" : "MISSING",
    DATABASE_URL: process.env.DATABASE_URL ? "set" : "MISSING",
  };

  try {
    const { default: prisma } = await import("~/db.server");
    await prisma.$queryRaw`SELECT 1`;
    results.db = "connected";

    const sessions = await prisma.session.findMany({
      select: { id: true, shop: true, isOnline: true, expires: true, scope: true },
      take: 10,
    });
    results.sessions = sessions.length;
    results.sessionDetails = sessions.map((s: any) => ({
      id: s.id,
      shop: s.shop,
      isOnline: s.isOnline,
      expires: s.expires?.toISOString() || "never",
      scope: s.scope || "none",
    }));

    const orderCount = await prisma.syncedOrder.count();
    results.orders = orderCount;
    const productCount = await prisma.syncedProduct.count();
    results.products = productCount;
    const customerCount = await prisma.syncedCustomer.count();
    results.customers = customerCount;
  } catch (e: any) {
    results.db = "FAILED: " + (e?.message || String(e));
  }

  return Response.json(results, { status: 200 });
}
