import { Box, Layout, Text, Card, Banner, Button, TextField, BlockStack } from "@shopify/polaris";

import { useState } from "react";
import { useLoaderData, useFetcher } from "react-router";
import type { HeadersFunction, LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { authenticate } = await import("~/shopify.server");
  const { default: prisma } = await import("~/db.server");

  const { session } = await authenticate.admin(request);
  const shopId = session.shop;

  const settings = await prisma.appSettings.findUnique({ where: { shopId } });

  return {
    shopId,
    shopName: session.shop,
    openaiKey: settings?.openaiKey || "",
    syncEnabled: settings?.syncEnabled ?? true,
    lastSyncAt: settings?.lastSyncAt?.toISOString() || null,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const { authenticate } = await import("~/shopify.server");
  const { default: prisma } = await import("~/db.server");

  const { session } = await authenticate.admin(request);
  const shopId = session.shop;
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "save") {
    const openaiKey = formData.get("openaiKey") as string;
    await prisma.appSettings.upsert({
      where: { shopId },
      update: { openaiKey: openaiKey || null },
      create: { shopId, openaiKey: openaiKey || null },
    });
    return { success: true, message: "Settings saved" };
  }

  if (intent === "sync") {
    const { syncAllData } = await import("~/lib/sync.server");
    const result = await syncAllData(request, shopId);
    return { success: true, message: `Synced ${result.orders} orders, ${result.products} products, ${result.customers} customers` };
  }

  return { error: "Unknown action" };
}

export default function SettingsPage() {
  const { shopName, openaiKey, lastSyncAt } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [key, setKey] = useState(openaiKey);

  const isSubmitting = fetcher.state === "submitting";
  const result = fetcher.data;

  return (
    <Box padding="400">
      <Layout>
        <Layout.Section>
          <BlockStack spacing="400">
            <div>
              <Text variant="headingXl" as="h1">Settings</Text>
              <Text variant="bodyMd" as="p" color="subdued">Configure your MTS AI Business Intelligence app</Text>
            </div>

            <Card>
              <Box padding="400">
                <BlockStack spacing="300">
                  <Text variant="headingLg" as="h2">Store Information</Text>
                  <BlockStack spacing="200">
                    <Text variant="bodyMd" as="p"><strong>Store:</strong> {shopName}</Text>
                    <Text variant="bodyMd" as="p"><strong>Last Sync:</strong> {lastSyncAt ? new Date(lastSyncAt).toLocaleString() : "Never"}</Text>
                  </BlockStack>
                </BlockStack>
              </Box>
            </Card>

            <Card>
              <Box padding="400">
                <BlockStack spacing="300">
                  <Text variant="headingLg" as="h2">Data Sync</Text>
                  <Text variant="bodyMd" as="p" color="subdued">Sync your store data to enable analytics. This will fetch orders, products, and customers from the last 30 days.</Text>
                  <fetcher.Form method="POST">
                    <input type="hidden" name="intent" value="sync" />
                    <Button primary submit loading={isSubmitting} disabled={isSubmitting}>{isSubmitting ? "Syncing..." : "Sync Now"}</Button>
                  </fetcher.Form>
                  {result?.success && result.message?.includes("Synced") && (
                    <Banner status="success" title="Sync Complete"><p>{result.message}</p></Banner>
                  )}
                </BlockStack>
              </Box>
            </Card>

            <Card>
              <Box padding="400">
                <BlockStack spacing="300">
                  <Text variant="headingLg" as="h2">OpenAI API Configuration</Text>
                  <Text variant="bodyMd" as="p" color="subdued">Enter your OpenAI API key to enable AI-powered insights. The app uses rule-based analytics as a fallback if no key is provided.</Text>
                  <fetcher.Form method="POST">
                    <input type="hidden" name="intent" value="save" />
                    <BlockStack spacing="300">
                      <TextField label="OpenAI API Key" name="openaiKey" value={key} onChange={setKey} placeholder="sk-..." type="password" helpText="Your API key is stored securely and only used for generating insights." />
                      <div><Button primary submit loading={isSubmitting}>Save Settings</Button></div>
                    </BlockStack>
                  </fetcher.Form>
                  {result?.success && result.message === "Settings saved" && (
                    <Banner status="success" title="Settings Saved"><p>Your settings have been updated successfully.</p></Banner>
                  )}
                </BlockStack>
              </Box>
            </Card>

            <Card>
              <Box padding="400">
                <BlockStack spacing="300">
                  <Text variant="headingLg" as="h2">About MTS AI Business Intelligence</Text>
                  <BlockStack spacing="200">
                    <Text variant="bodyMd" as="p"><strong>Version:</strong> 1.0.0</Text>
                    <Text variant="bodyMd" as="p">MTS AI Business Intelligence provides intelligent analytics, AI-powered insights, and actionable recommendations to help you grow your Shopify store.</Text>
                    <Text variant="bodyMd" as="p" color="subdued">Features: Sales Analytics, Product Performance, Customer Insights, Inventory Health, Revenue Forecasting, Natural Language AI Assistant.</Text>
                  </BlockStack>
                </BlockStack>
              </Box>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Box>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
