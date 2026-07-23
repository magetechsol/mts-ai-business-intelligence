import type { RouteConfig } from "@react-router/dev/routes";
import { route, index, layout } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("auth/*", "routes/auth.tsx"),
  layout("routes/app.tsx", [
    route("app", "routes/app._index.tsx"),
    route("app/sales", "routes/app.sales.tsx"),
    route("app/products", "routes/app.products.tsx"),
    route("app/customers", "routes/app.customers.tsx"),
    route("app/inventory", "routes/app.inventory.tsx"),
    route("app/insights", "routes/app.insights.tsx"),
    route("app/settings", "routes/app.settings.tsx"),
  ]),
  route("api/sync", "routes/api.sync.tsx"),
  route("api/ai", "routes/api.ai.tsx"),
  route("webhooks", "routes/webhooks.tsx"),
] satisfies RouteConfig;
