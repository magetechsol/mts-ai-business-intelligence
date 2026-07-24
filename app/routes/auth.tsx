import type { HeadersFunction } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useRouteError, isRouteErrorResponse } from "react-router";
import type { Route } from "./+types/auth";

export async function loader({ request }: Route.LoaderArgs) {
  const { authenticate } = await import("~/shopify.server");
  await authenticate.admin(request);
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    if (error.status === 200 && typeof error.data === "string") {
      return <div dangerouslySetInnerHTML={{ __html: error.data }} />;
    }

    return (
      <div style={{ padding: 20 }}>
        <h1>Error {error.status}</h1>
        <p>{error.statusText}</p>
      </div>
    );
  }

  throw error;
}
