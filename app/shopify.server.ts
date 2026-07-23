import { shopApp } from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

let app: ReturnType<typeof shopApp>;

declare global {
  var shopifyAppGlobal: ReturnType<typeof shopApp> | undefined;
}

function createApp() {
  return shopApp({
    apiKey: process.env.SHOPIFY_API_KEY!,
    apiSecretKey: process.env.SHOPIFY_API_SECRET!,
    scopes: (process.env.SCOPES || "").split(","),
    appUrl: process.env.SHOPIFY_APP_URL || "http://localhost:3000",
    authPathPrefix: "/auth",
    sessionStorage: new PrismaSessionStorage(prisma),
  });
}

if (process.env.NODE_ENV !== "production") {
  if (!global.shopifyAppGlobal) {
    global.shopifyAppGlobal = createApp();
  }
  app = global.shopifyAppGlobal;
} else {
  app = createApp();
}

export const { authenticate, shopify } = app;
