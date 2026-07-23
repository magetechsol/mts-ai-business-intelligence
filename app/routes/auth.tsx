import type { Route } from "./+types/auth";

export async function loader({ request }: Route.LoaderArgs) {
  const { shopify } = await import("~/shopify.server");
  return shopify.login();
}
