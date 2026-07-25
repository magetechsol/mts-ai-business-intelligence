import type { Route } from "./+types/debug";
import prisma from "~/db.server";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const ua = request.headers.get("User-Agent") || "none";
  const authHeader = request.headers.get("Authorization") || "none";
  const shop = url.searchParams.get("shop") || "none";

  const sessions = await prisma.session.findMany({
    select: { id: true, shop: true, isOnline: true, scope: true, createdAt: true, expiresAt: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const settings = await prisma.appSettings.findFirst({
    select: { id: true, shopId: true, plan: true, billingStatus: true },
    take: 1,
  });

  let authResult: any = "not attempted";
  try {
    const { authenticate } = await import("~/shopify.server");
    const { session } = await authenticate.admin(request);
    authResult = { success: true, shop: session.shop, accessToken: session.accessToken?.substring(0, 10) + "..." };
  } catch (err: any) {
    authResult = {
      success: false,
      type: err?.constructor?.name || typeof err,
      status: err?.status || "none",
      statusText: err?.statusText || "none",
      message: err?.message || String(err),
      isRedirect: err instanceof Response && (err.status === 302 || err.status === 303),
      location: err instanceof Response ? err.headers.get("Location") : undefined,
    };
  }

  return {
    request: { ua: ua.substring(0, 200), authHeader: authHeader.substring(0, 50), shop, url: url.pathname + url.search },
    sessions,
    settings,
    authResult,
    timestamp: new Date().toISOString(),
  };
}

export default function Debug() {
  return null;
}
