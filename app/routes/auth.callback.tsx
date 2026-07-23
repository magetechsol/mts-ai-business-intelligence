import type { Route } from "./+types/auth.callback";

export async function loader({ request }: Route.LoaderArgs) {
  const { shopify } = await import("~/shopify.server");
  const callback = await shopify.callback(request);
  return callback.redirectToShopifyOrAppRoot();
}
