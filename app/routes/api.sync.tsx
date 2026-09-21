import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "~/shopify.server";
import { syncAllData } from "~/lib/sync.server";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { session, admin } = await authenticate.admin(request);

    if (!session || !admin) {
      return new Response(
        JSON.stringify({ error: "Invalid session. Please refresh and try again." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const shopId = session.shop;

    const result = await syncAllData(admin, shopId);

    if (result.errors && result.errors.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Partial sync completed. Some data may be missing.`,
          errors: result.errors,
          data: {
            orders: result.orders,
            products: result.products,
            customers: result.customers,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${result.orders} orders, ${result.products} products, ${result.customers} customers`,
        data: result,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    if (error instanceof Response) {
      return new Response(
        JSON.stringify({ error: "Session expired. Please reopen the app from your Shopify admin." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Sync error:", errorMessage);

    if (errorMessage.includes("403") || errorMessage.includes("access denied")) {
      return new Response(
        JSON.stringify({
          error: "Permission denied. Please ensure the app has the required scopes and re-install if needed.",
          details: errorMessage,
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    if (errorMessage.includes("401") || errorMessage.includes("expired")) {
      return new Response(
        JSON.stringify({
          error: "Session expired. Please refresh the page.",
          details: errorMessage,
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        error: "Sync failed. Please try again.",
        details: errorMessage,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
