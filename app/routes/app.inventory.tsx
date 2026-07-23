import { Box, Layout, Text, Card, Grid, Badge, BlockStack } from "@shopify/polaris";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useMemo } from "react";
import { useLoaderData } from "react-router";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

const COLORS: Record<string, string> = {
  in_stock: "#4bb550",
  low_stock: "#E4910B",
  out_of_stock: "#D72C0D",
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { authenticate } = await import("~/shopify.server");
  const { getInventoryItems } = await import("~/lib/analytics.server");

  const { session } = await authenticate.admin(request);
  const shopId = session.shop;

  const items = await getInventoryItems(shopId);

  const summary = {
    total: items.length,
    inStock: items.filter((i) => i.status === "in_stock").length,
    lowStock: items.filter((i) => i.status === "low_stock").length,
    outOfStock: items.filter((i) => i.status === "out_of_stock").length,
    totalUnits: items.reduce((sum, i) => sum + i.quantity, 0),
    totalValue: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
  };

  const statusData = [
    { name: "In Stock", value: summary.inStock, color: COLORS.in_stock },
    { name: "Low Stock", value: summary.lowStock, color: COLORS.low_stock },
    { name: "Out of Stock", value: summary.outOfStock, color: COLORS.out_of_stock },
  ].filter((s) => s.value > 0);

  const lowStockItems = items
    .filter((i) => i.status === "low_stock" || i.status === "out_of_stock")
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, 20);

  const productMap: Record<string, { title: string; totalInventory: number; totalValue: number }> = {};
  items.forEach((item) => {
    if (!productMap[item.productId]) productMap[item.productId] = { title: item.productTitle, totalInventory: 0, totalValue: 0 };
    productMap[item.productId].totalInventory += item.quantity;
    productMap[item.productId].totalValue += item.price * item.quantity;
  });
  const inventoryByProduct = Object.values(productMap).sort((a, b) => b.totalValue - a.totalValue).slice(0, 10);

  return { summary, statusData, lowStockItems, inventoryByProduct };
}

export default function InventoryPage() {
  const { summary, statusData, lowStockItems, inventoryByProduct } = useLoaderData<typeof loader>();

  return (
    <Box padding="400">
      <Layout>
        <Layout.Section>
          <BlockStack spacing="400">
            <div>
              <Text variant="headingXl" as="h1">Inventory Health</Text>
              <Text variant="bodyMd" as="p" color="subdued">Monitor stock levels and identify inventory issues</Text>
            </div>

            <Grid>
              {[
                { label: "Total SKUs", value: String(summary.total) },
                { label: "Total Units", value: summary.totalUnits.toLocaleString() },
                { label: "Inventory Value", value: `$${summary.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
                { label: "In Stock", value: String(summary.inStock), tone: "success" as const },
                { label: "Low Stock", value: String(summary.lowStock), tone: "warning" as const },
                { label: "Out of Stock", value: String(summary.outOfStock), tone: "critical" as const },
              ].map((stat) => (
                <Grid.Cell key={stat.label} columnSpan={{ xs: 6, sm: 4, md: 4 }}>
                  <Card><Box padding="400"><BlockStack spacing="200">
                    <Text variant="bodyMd" as="p" color="subdued">{stat.label}</Text>
                    <Text variant="heading2xl" as="h2">
                      {stat.tone ? <Badge tone={stat.tone}>{stat.value}</Badge> : stat.value}
                    </Text>
                  </BlockStack></Box></Card>
                </Grid.Cell>
              ))}
            </Grid>

            <Grid>
              <Grid.Cell columnSpan={{ xs: 12, md: 6 }}>
                <Card><Box padding="400"><BlockStack spacing="300">
                  <Text variant="headingLg" as="h2">Stock Status Overview</Text>
                  <div style={{ width: "100%", height: 250 }}>
                    {statusData.length > 0 ? (
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                            {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <div style={{ textAlign: "center", color: "#6D7175", padding: "40px" }}>No inventory data available. Sync your products first.</div>}
                  </div>
                </BlockStack></Box></Card>
              </Grid.Cell>

              <Grid.Cell columnSpan={{ xs: 12, md: 6 }}>
                <Card><Box padding="400"><BlockStack spacing="300">
                  <Text variant="headingLg" as="h2">Inventory Value by Product</Text>
                  <div style={{ width: "100%", height: 250 }}>
                    {inventoryByProduct.length > 0 ? (
                      <ResponsiveContainer>
                        <BarChart data={inventoryByProduct} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#E1E3E5" />
                          <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                          <YAxis type="category" dataKey="title" tick={{ fontSize: 11 }} width={100} tickFormatter={(v) => v.length > 15 ? v.slice(0, 15) + "..." : v} />
                          <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, "Value"]} />
                          <Bar dataKey="totalValue" fill="#503ceb" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <div style={{ textAlign: "center", color: "#6D7175", padding: "40px" }}>No inventory data available</div>}
                  </div>
                </BlockStack></Box></Card>
              </Grid.Cell>
            </Grid>

            <Card>
              <Box padding="400">
                <BlockStack spacing="300">
                  <BlockStack distribution="spaceBetween" alignment="center">
                    <Text variant="headingLg" as="h2">Low Stock & Out of Stock Alerts</Text>
                    <Badge tone="critical">{lowStockItems.length} items need attention</Badge>
                  </BlockStack>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #E1E3E5" }}>
                          {["Product", "Variant", "SKU", "Status", "Quantity", "Price"].map((h, i) => (
                            <th key={h} style={{ padding: "8px", textAlign: i >= 4 ? "right" : "left", fontSize: "13px", fontWeight: 600 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {lowStockItems.length === 0 ? (
                          <tr><td colSpan={6} style={{ padding: "20px", textAlign: "center", color: "#6D7175" }}>No low stock alerts. All products are well-stocked.</td></tr>
                        ) : lowStockItems.map((item) => (
                          <tr key={item.id} style={{ borderBottom: "1px solid #F4F6F8" }}>
                            <td style={{ padding: "8px", fontSize: "13px", fontWeight: 500 }}>{item.productTitle}</td>
                            <td style={{ padding: "8px", fontSize: "13px" }}>{item.variantTitle}</td>
                            <td style={{ padding: "8px", fontSize: "13px", color: "#6D7175" }}>{item.sku || "-"}</td>
                            <td style={{ padding: "8px", textAlign: "center" }}><Badge tone={item.status === "out_of_stock" ? "critical" : "warning"}>{item.status === "out_of_stock" ? "Out of Stock" : "Low Stock"}</Badge></td>
                            <td style={{ padding: "8px", textAlign: "right", fontSize: "13px" }}>{item.quantity}</td>
                            <td style={{ padding: "8px", textAlign: "right", fontSize: "13px" }}>${item.price.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
