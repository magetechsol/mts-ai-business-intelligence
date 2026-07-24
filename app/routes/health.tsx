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

    const sessionCount = await prisma.session.count();
    results.sessions = sessionCount;
  } catch (e: any) {
    results.db = "FAILED: " + (e?.message || String(e));
  }

  return Response.json(results, { status: 200 });
}
