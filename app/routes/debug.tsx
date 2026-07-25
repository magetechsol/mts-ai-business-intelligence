import type { LoaderFunctionArgs } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const debug: Record<string, any> = {};
  const logs: string[] = [];
  const log = (msg: string) => { logs.push(msg); };

  log("=== Debug Start ===");

  debug.env = {
    SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY || "MISSING",
    SHOPIFY_API_SECRET_length: process.env.SHOPIFY_API_SECRET?.length || 0,
    SHOPIFY_API_SECRET_prefix: process.env.SHOPIFY_API_SECRET?.substring(0, 6) || "MISSING",
    SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL || "MISSING",
    SCOPES: process.env.SCOPES || "MISSING",
    NODE_ENV: process.env.NODE_ENV || "MISSING",
  };

  try {
    const { default: prisma } = await import("~/db.server");
    await prisma.$queryRaw`SELECT 1`;
    log("DB connected");

    const sessions = await prisma.session.findMany({ take: 5 });
    debug.sessions = sessions.map((s: any) => ({
      id: s.id, shop: s.shop, isOnline: s.isOnline, scope: s.scope,
      accessToken_length: s.accessToken?.length || 0,
      expires: s.expires?.toISOString() || "never",
    }));
    log(`Found ${sessions.length} sessions`);
  } catch (e: any) {
    debug.dbError = e?.message;
    log("DB FAILED: " + e?.message);
  }

  const { ApiVersion, shopifyApi, Session } = await import("@shopify/shopify-api");
  log("Shopify API imported");

  debug.availableApiVersions = Object.entries(ApiVersion).map(([k, v]) => `${k}=${v}`);

  const secret = process.env.SHOPIFY_API_SECRET || "";
  const key = process.env.SHOPIFY_API_KEY || "";

  let api: ReturnType<typeof shopifyApi>;
  try {
    api = shopifyApi({
      apiKey: key,
      apiSecretKey: secret,
      scopes: (process.env.SCOPES || "").split(","),
      hostName: new URL(process.env.SHOPIFY_APP_URL || "http://localhost:3000").host,
      hostScheme: "https",
      isEmbeddedApp: true,
      apiVersion: ApiVersion.July26,
    });
    log("API instance created OK");
    debug.apiCreated = true;
    debug.apiVersion = api.config.apiVersion;
    debug.apiClientId = api.config.apiKey;
  } catch (e: any) {
    debug.apiError = e?.message;
    log("API creation FAILED: " + e?.message);
    return Response.json({ debug, logs }, { status: 200 });
  }

  try {
    const { PrismaSessionStorage } = await import("@shopify/shopify-app-session-storage-prisma");
    const { default: prismaClient } = await import("~/db.server");
    const store = new PrismaSessionStorage(prismaClient);

    const offlineId = api.session.getOfflineId("mts-ai-bi-test.myshopify.com");
    log(`Looking for session: ${offlineId}`);

    const session = await store.loadSession(offlineId);
    if (session) {
      log("Session found!");
      debug.loadedSession = {
        id: session.id, shop: session.shop, isOnline: session.isOnline,
        scope: session.scope, hasAccessToken: !!session.accessToken,
        accessTokenLength: session.accessToken?.length || 0,
        expires: session.expires?.toISOString() || "never",
        isActive: session.isActive(),
      };
    } else {
      log("Session NOT found!");
      debug.loadedSession = null;
    }
  } catch (e: any) {
    debug.sessionLoadError = e?.message;
    log("Session load FAILED: " + e?.message);
  }

  const idToken = url.searchParams.get("id_token");
  if (idToken) {
    log("Testing JWT decode with configured secret...");
    try {
      const payload = await api.session.decodeSessionToken(idToken, { checkAudience: true });
      log("JWT decoded SUCCESSFULLY - secret matches!");
      debug.jwtDecode = {
        success: true,
        iss: payload.iss,
        dest: payload.dest,
        aud: payload.aud,
        sub: payload.sub,
        exp: payload.exp,
        expDate: new Date(payload.exp * 1000).toISOString(),
        isExpired: payload.exp * 1000 < Date.now(),
      };
    } catch (e: any) {
      log("JWT decode FAILED: " + e?.message);
      debug.jwtDecode = { success: false, error: e?.message, errorName: e?.constructor?.name };
    }
  }

  debug.logs = logs;
  return Response.json(debug, { status: 200 });
}
