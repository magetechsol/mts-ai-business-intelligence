import { authenticate } from "~/shopify.server";
import type { Route } from "./+types/auth";

export async function loader({ request }: Route.LoaderArgs) {
  await authenticate.admin(request);
  return null;
}
