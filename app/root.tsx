import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import "@shopify/polaris/build/esm/styles.css";

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>MTS AI Business Intelligence</title>
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Error - MTS AI Business Intelligence</title>
        <Meta />
        <Links />
      </head>
      <body>
        <div style={{ padding: "40px", textAlign: "center", fontFamily: "system-ui" }}>
          <h1>Something went wrong</h1>
          <p>Please try refreshing the page.</p>
        </div>
        <Scripts />
      </body>
    </html>
  );
}
