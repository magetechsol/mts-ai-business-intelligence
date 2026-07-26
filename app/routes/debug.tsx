export async function loader({ request }: any) {
  const url = new URL(request.url);
  const ua = request.headers.get("User-Agent") || "none";
  const auth = request.headers.get("Authorization") || "none";
  const shop = url.searchParams.get("shop") || "none";
  const idToken = url.searchParams.get("id_token") || "none";
  const embedded = url.searchParams.get("embedded") || "none";
  const host = url.searchParams.get("host") || "none";

  const info: Record<string, any> = {
    timestamp: new Date().toISOString(),
    ua: ua.substring(0, 200),
    auth: auth.substring(0, 100),
    shop,
    embedded,
    host: host.substring(0, 50),
    hasIdToken: idToken !== "none",
    idTokenLength: idToken.length,
    method: request.method,
    url: url.pathname,
  };

  try {
    const { default: prisma } = await import("~/db.server");
    const sessions = await prisma.session.findMany({
      select: { id: true, shop: true, isOnline: true },
      take: 5,
    });
    info.sessions = sessions;

    const settings = await prisma.appSettings.findMany({
      select: { id: true, shopId: true, plan: true },
      take: 5,
    });
    info.settings = settings;
  } catch (e: any) {
    info.dbError = e?.message || String(e);
  }

  try {
    const { authenticate } = await import("~/shopify.server");
    const { session } = await authenticate.admin(request);
    info.authResult = { success: true, shop: session.shop };
  } catch (err: any) {
    info.authResult = {
      success: false,
      constructorName: err?.constructor?.name || "unknown",
      status: err?.status,
      statusText: err?.statusText,
      message: err?.message || null,
      isResponse: err instanceof Response,
      isRedirect: err instanceof Response ? (err.status === 302 || err.status === 303) : false,
      location: err instanceof Response ? err.headers.get("Location") : undefined,
    };
  }

  return new Response(JSON.stringify(info, null, 2), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export default function Debug() {
  return null;
}
