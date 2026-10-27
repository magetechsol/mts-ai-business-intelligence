import type { LoaderFunctionArgs } from "react-router";

// Lightweight health/keep-alive endpoint. It intentionally avoids importing any
// heavy modules (Shopify config, Prisma, etc.) so it responds instantly even on
// a cold start. Point an external uptime pinger (e.g. UptimeRobot, cron-job.org)
// at GET /health every ~10 minutes to stop the Render free instance from sleeping.
export async function loader(_args: LoaderFunctionArgs) {
  return new Response("ok", {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "no-store",
    },
  });
}
