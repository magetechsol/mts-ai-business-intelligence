import type { LoaderFunctionArgs } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const debug: Record<string, any> = {};

  debug.timestamp = new Date().toISOString();
  debug.requestUrl = request.url;
  debug.requestPath = url.pathname;
  debug.requestParams = Object.fromEntries(url.searchParams.entries());

  debug.env = {
    SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY || "MISSING",
    SHOPIFY_API_SECRET_length: process.env.SHOPIFY_API_SECRET?.length || 0,
    SHOPIFY_API_SECRET_prefix: process.env.SHOPIFY_API_SECRET?.substring(0, 6) || "MISSING",
    SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL || "MISSING",
    SCOPES: process.env.SCOPES || "MISSING",
    DATABASE_URL_prefix: process.env.DATABASE_URL?.substring(0, 30) || "MISSING",
    NODE_ENV: process.env.NODE_ENV || "MISSING",
    PORT: process.env.PORT || "MISSING",
  };

  try {
    const { default: prisma } = await import("~/db.server");
    await prisma.$queryRaw`SELECT 1`;
    debug.db = "connected";

    const sessions = await prisma.session.findMany({
      take: 5,
    });
    debug.sessionCount = sessions.length;
    debug.sessions = sessions.map((s: any) => ({
      id: s.id,
      shop: s.shop,
      isOnline: s.isOnline,
      scope: s.scope,
      accessToken_length: s.accessToken?.length || 0,
      expires: s.expires?.toISOString() || "never",
      userId: s.userId,
    }));
  } catch (e: any) {
    debug.dbError = e?.message || String(e);
  }

  try {
    const shopifyModule = await import("~/shopify.server");
    debug.shopifyModuleKeys = Object.keys(shopifyModule);
    debug.authenticateType = typeof shopifyModule.authenticate;
    debug.authenticateKeys = shopifyModule.authenticate ? Object.keys(shopifyModule.authenticate) : [];
  } catch (e: any) {
    debug.shopifyModuleError = e?.message || String(e);
  }

  try {
    const apiModule = await import("@shopify/shopify-api");
    debug.shopifyApiAvailable = true;
    debug.shopifyApiKeys = Object.keys(apiModule).filter((k: string) =>
      k.startsWith("Api") || k.startsWith("Shopify") || k.includes("Session")
    );
    debug.requestedTokenType = apiModule.RequestedTokenType;

    if (process.env.SHOPIFY_API_KEY && process.env.SHOPIFY_API_SECRET) {
      try {
        const api = apiModule.shopifyApi({
          apiKey: process.env.SHOPIFY_API_KEY,
          apiSecretKey: process.env.SHOPIFY_API_SECRET,
          scopes: (process.env.SCOPES || "").split(","),
          hostName: new URL(process.env.SHOPIFY_APP_URL || "http://localhost:3000").host,
          hostScheme: "https",
          isEmbeddedApp: true,
        });

        debug.shopifyApiCreated = true;

        const testShop = url.searchParams.get("shop") || "test.myshopify.com";
        const offlineId = api.session.getOfflineId(testShop);
        debug.testOfflineId = offlineId;

        try {
          const sessionStore = new (await import("@shopify/shopify-app-session-storage-prisma")).PrismaSessionStorage(
            (await import("~/db.server")).default
          );
          debug.sessionStoreType = typeof sessionStore;
          debug.sessionStoreLoadTest = typeof sessionStore.loadSession;

          const loadedSession = await sessionStore.loadSession(offlineId);
          debug.loadedTestSession = loadedSession ? "found" : "null";
        } catch (e: any) {
          debug.sessionStoreError = e?.message || String(e);
        }
      } catch (e: any) {
        debug.shopifyApiError = e?.message || String(e);
        debug.shopifyApiErrorStack = e?.stack?.substring(0, 500) || "";
      }
    }
  } catch (e: any) {
    debug.apiImportError = e?.message || String(e);
  }

  if (url.searchParams.get("shop")) {
    const shop = url.searchParams.get("shop")!;
    try {
      const { default: prisma } = await import("~/db.server");
      const shopSessions = await prisma.session.findMany({
        where: { shop },
      });
      debug.shopSessions = shopSessions.map((s: any) => ({
        id: s.id,
        shop: s.shop,
        isOnline: s.isOnline,
        scope: s.scope,
        accessToken_length: s.accessToken?.length || 0,
        expires: s.expires?.toISOString() || "never",
      }));
    } catch (e: any) {
      debug.shopSessionError = e?.message || String(e);
    }
  }

  return Response.json(debug, {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
