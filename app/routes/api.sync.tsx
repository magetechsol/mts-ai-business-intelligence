import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "~/shopify.server";
import { syncAllData } from "~/lib/sync.server";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { session, admin } = await authenticate.admin(request);
    const shopId = session.shop;

    const result = await syncAllData(admin, shopId);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ error: "Sync failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
