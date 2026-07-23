import type { Route } from "./+types/auth";

export async function loader({ request }: Route.LoaderArgs) {
  const { authenticate } = await import("~/shopify.server");
  try {
    return await authenticate.admin(request);
  } catch (response) {
    if (response instanceof Response) {
      return response;
    }
    throw response;
  }
}

export default function AuthRoute() {
  return null;
}
