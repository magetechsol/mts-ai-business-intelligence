import type { HeadersFunction } from "react-router";
import { useLoaderData } from "react-router";
import type { Route } from "./+types/auth";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const isCallback = url.pathname.endsWith("/callback");

  if (isCallback) {
    const { shopify } = await import("~/shopify.server");
    const callback = await shopify.callback(request);
    throw callback.redirectToShopifyOrAppRoot();
  }

  const { authenticate } = await import("~/shopify.server");
  try {
    await authenticate.admin(request);
    return null;
  } catch (error) {
    if (error instanceof Response) {
      const html = await error.text();
      const respHeaders: Record<string, string> = {};
      error.headers.forEach((value, key) => {
        respHeaders[key] = value;
      });
      return { html, respHeaders };
    }
    throw error;
  }
}

export const headers: HeadersFunction = ({ loaderData }) => {
  const data = loaderData as { respHeaders?: Record<string, string> } | null;
  if (data?.respHeaders) {
    return new Headers(data.respHeaders);
  }
  return {};
};

export default function AuthRoute() {
  const data = useLoaderData<typeof loader>();
  if (data?.html) {
    return <div dangerouslySetInnerHTML={{ __html: data.html }} />;
  }
  return null;
}
