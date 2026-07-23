import type { HeadersFunction } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import type { Route } from "./+types/auth";

export async function loader({ request }: Route.LoaderArgs) {
  const { authenticate } = await import("~/shopify.server");
  try {
    return await authenticate.admin(request);
  } catch (errorOrResponse) {
    if (errorOrResponse instanceof Response) {
      return errorOrResponse;
    }
    throw errorOrResponse;
  }
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};

export default function AuthRoute() {
  return null;
}
