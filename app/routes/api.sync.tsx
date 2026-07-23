import type { ActionFunctionArgs } from "react-router";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { authenticate } = await import("~/shopify.server");
  const { syncAllData } = await import("~/lib/sync.server");

  try {
    const { session } = await authenticate.admin(request);
    const shopId = session.shop;

    const result = await syncAllData(request, shopId);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ error: "Sync failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
