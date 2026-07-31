import type { Route } from "./+types/auth.callback";
import { shopify } from "~/shopify.server";

export async function loader({ request }: Route.LoaderArgs) {
  const callback = await shopify.callback(request);
  return callback.redirectToShopifyOrAppRoot();
}
