import { shopifyApp, ApiVersion, BillingInterval } from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

export const FREE_PLAN = "free";
export const PRO_PLAN = "pro_monthly";

let app: ReturnType<typeof shopifyApp>;

declare global {
  var shopifyAppGlobal: ReturnType<typeof shopifyApp> | undefined;
}

function createApp() {
  return shopifyApp({
    apiKey: process.env.SHOPIFY_API_KEY!,
    apiSecretKey: process.env.SHOPIFY_API_SECRET!,
    scopes: (process.env.SCOPES || "").split(","),
    appUrl: process.env.SHOPIFY_APP_URL || "http://localhost:3000",
    apiVersion: ApiVersion.July26,
    isEmbeddedApp: true,
    authPathPrefix: "/auth",
    sessionStorage: new PrismaSessionStorage(prisma),
    billing: {
      [PRO_PLAN]: {
        amount: 29.0,
        currencyCode: "USD",
        interval: BillingInterval.Every30Days,
      },
    },
    hooks: {
      afterAuth: async ({ session, admin }) => {
        const gdprTopics = [
          "customers/data_request",
          "customers/redact",
          "shop/redact",
        ];
        const callbackUrl = `${process.env.SHOPIFY_APP_URL}/webhooks`;
        for (const topic of gdprTopics) {
          try {
            const response = await admin.graphql(
              `mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $callbackUrl: String!) {
                webhookSubscriptionCreate(topic: $topic, callbackUrl: $callbackUrl) {
                  webhookSubscription { id }
                  userErrors { field message }
                }
              }`,
              { variables: { topic, callbackUrl } }
            );
            const data = await response.json();
            if (data.data?.webhookSubscriptionCreate?.userErrors?.length) {
              console.log(`[GDPR] ${topic}: ${data.data.webhookSubscriptionCreate.userErrors[0].message}`);
            } else {
              console.log(`[GDPR] Registered: ${topic}`);
            }
          } catch (e: any) {
            console.error(`[GDPR] Failed ${topic}:`, e?.message || e);
          }
        }
      },
    },
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
