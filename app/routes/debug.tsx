export async function loader({ request }: any) {
  const url = new URL(request.url);
  const ua = request.headers.get("User-Agent") || "none";

  try {
    const { default: prisma } = await import("~/db.server");

    const sessions = await prisma.session.findMany({
      select: { id: true, shop: true, isOnline: true, scope: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const settings = await prisma.appSettings.findMany({
      select: { id: true, shopId: true, plan: true, billingStatus: true },
      take: 5,
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

    return new Response(JSON.stringify({
      request: { ua: ua.substring(0, 200), shop: url.searchParams.get("shop"), url: url.pathname + url.search },
      sessions,
      settings,
      authResult,
      timestamp: new Date().toISOString(),
    }, null, 2), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (dbErr: any) {
    return new Response(JSON.stringify({
      error: "DB connection failed",
      message: dbErr?.message || String(dbErr),
      timestamp: new Date().toISOString(),
    }, null, 2), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export default function Debug() {
  return null;
}
