import type { Route } from "./+types/auth";

export async function loader({ request }: Route.LoaderArgs) {
  const { authenticate } = await import("~/shopify.server");
  return authenticate.admin(request);
}

export default function AuthRoute() {
  return null;
}
