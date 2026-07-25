import { Card, Text, Badge, BlockStack, Layout, Box, Button, ButtonGroup, Grid, Banner } from "@shopify/polaris";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { useState } from "react";
import { useLoaderData } from "react-router";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { authenticate } = await import("~/shopify.server");
    const { default: prisma } = await import("~/db.server");

    const { session } = await authenticate.admin(request);
    const shopId = session.shop;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const { getFullAnalytics } = await import("~/lib/analytics.server");
    const analytics = await getFullAnalytics(shopId, { startDate, endDate, label: "Last 30 Days" });

    const orders = await prisma.syncedOrder.findMany({
      where: { shopId, processedAt: { not: null } },
      orderBy: { processedAt: "desc" },
      take: 10,
    });

    return {
      shopId,
      analytics,
      recentOrders: orders.map((o) => ({
        id: o.id, name: o.name, email: o.email, totalPrice: o.totalPrice,
        financialStatus: o.financialStatus,
        processedAt: o.processedAt?.toISOString() || o.createdAt.toISOString(),
      })),
      isSample: false,
    };
  } catch (e: any) {
    console.error("Dashboard using sample data:", e?.message || e?.status || "unknown");
    const { getSampleDashboardData } = await import("~/lib/sampleData");
    return { ...getSampleDashboardData(), isSample: true };
  }
}

function KpiCard({ label, value, change, changeLabel, trend }: {
  label: string;
  value: string;
  change: number;
  changeLabel: string;
  trend: "up" | "down" | "neutral";
}) {
  const badgeTone = trend === "up" ? "success" : trend === "down" ? "critical" : "info";
  const icon = trend === "up" ? "\u2191" : trend === "down" ? "\u2193" : "\u2192";

  return (
    <Card>
      <Box padding="400">
        <BlockStack spacing="200">
          <Text variant="bodyMd" as="p" color="subdued">{label}</Text>
          <Text variant="heading2xl" as="h2">{value}</Text>
          <Badge tone={badgeTone}>{icon} {Math.abs(change).toFixed(1)}% {changeLabel}</Badge>
        </BlockStack>
      </Box>
    </Card>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const toneMap: Record<string, any> = {
    PAID: "success",
    AUTHORIZED: "info",
    PENDING: "warning",
    REFUNDED: "critical",
    VOIDED: "critical",
    PARTIALLY_REFUNDED: "warning",
  };
  return <Badge tone={toneMap[status || ""] || "info"}>{status || "Unknown"}</Badge>;
}

export default function Dashboard() {
  const { analytics, recentOrders, isSample } = useLoaderData<typeof loader>();
  const [timeRange, setTimeRange] = useState("30d");

  const kpis = [
    analytics.revenue,
    analytics.orders,
    analytics.averageOrderValue,
    analytics.customers,
    analytics.repeatRate,
    analytics.conversionRate,
  ];

  return (
    <Box padding="400">
      <Layout>
        <Layout.Section>
          <BlockStack spacing="400">
            <BlockStack distribution="spaceBetween" alignment="center">
              <div>
                <Text variant="headingXl" as="h1">Business Intelligence Dashboard</Text>
                <Text variant="bodyMd" as="p" color="subdued">Your store performance at a glance</Text>
              </div>
              <ButtonGroup>
                {[
                  { label: "7D", value: "7d" },
                  { label: "30D", value: "30d" },
                  { label: "90D", value: "90d" },
                  { label: "12M", value: "12m" },
                ].map((range) => (
                  <Button
                    key={range.value}
                    pressed={timeRange === range.value}
                    onClick={() => setTimeRange(range.value)}
                    size="slim"
                  >
                    {range.label}
                  </Button>
                ))}
              </ButtonGroup>
            </BlockStack>

            {isSample && (
              <Banner status="info" title="Demo Mode">
                <p>Showing sample data. Connect your Shopify store via Settings to see live analytics.</p>
              </Banner>
            )}

            <Grid>
              {kpis.map((kpi) => (
                <Grid.Cell key={kpi.label} columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4, xl: 4 }}>
                  <KpiCard {...kpi} />
                </Grid.Cell>
              ))}
            </Grid>

            <Grid>
              <Grid.Cell columnSpan={{ xs: 12, md: 8 }}>
                <Card>
                  <Box padding="400">
                    <BlockStack spacing="200">
                      <Text variant="headingLg" as="h2">Revenue Trend</Text>
                      <div style={{ width: "100%", height: 300, minHeight: 300 }}>
                        {analytics.salesChart.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={analytics.salesChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                              <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#503ceb" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="#503ceb" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#E1E3E5" />
                              <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(v) => v.slice(5)} />
                              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                              <Tooltip
                                formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
                                labelFormatter={(label) => `Date: ${label}`}
                              />
                              <Area type="monotone" dataKey="revenue" stroke="#503ceb" strokeWidth={2} fill="url(#colorRevenue)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 300, color: "#6D7175" }}>
                            <Text variant="bodyMd" color="subdued">No revenue data available</Text>
                          </div>
                        )}
                      </div>
                    </BlockStack>
                  </Box>
                </Card>
              </Grid.Cell>

              <Grid.Cell columnSpan={{ xs: 12, md: 4 }}>
                <Card>
                  <Box padding="400">
                    <BlockStack spacing="200">
                      <Text variant="headingLg" as="h2">Top Products</Text>
                      <div style={{ width: "100%", height: 300, minHeight: 300 }}>
                        {analytics.topProducts.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={analytics.topProducts.slice(0, 5)} layout="vertical" margin={{ left: 0, right: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#E1E3E5" />
                              <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                              <YAxis type="category" dataKey="title" tick={{ fontSize: 11 }} width={80} tickFormatter={(v) => v.length > 12 ? v.slice(0, 12) + "..." : v} />
                              <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]} />
                              <Bar dataKey="revenue" fill="#503ceb" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 300, color: "#6D7175" }}>
                            <Text variant="bodyMd" color="subdued">No product data available</Text>
                          </div>
                        )}
                      </div>
                    </BlockStack>
                  </Box>
                </Card>
              </Grid.Cell>
            </Grid>

            <Card>
              <Box padding="400">
                <BlockStack spacing="300">
                  <Text variant="headingLg" as="h2">Recent Orders</Text>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #E1E3E5" }}>
                          <th style={{ padding: "8px", textAlign: "left", fontSize: "13px", fontWeight: 600 }}>Order</th>
                          <th style={{ padding: "8px", textAlign: "left", fontSize: "13px", fontWeight: 600 }}>Customer</th>
                          <th style={{ padding: "8px", textAlign: "right", fontSize: "13px", fontWeight: 600 }}>Total</th>
                          <th style={{ padding: "8px", textAlign: "center", fontSize: "13px", fontWeight: 600 }}>Status</th>
                          <th style={{ padding: "8px", textAlign: "left", fontSize: "13px", fontWeight: 600 }}>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentOrders.length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ padding: "20px", textAlign: "center", color: "#6D7175" }}>
                              No orders yet. Sync your store data from Settings.
                            </td>
                          </tr>
                        ) : (
                          recentOrders.map((order) => (
                            <tr key={order.id} style={{ borderBottom: "1px solid #F4F6F8" }}>
                              <td style={{ padding: "8px", fontSize: "13px" }}>{order.name}</td>
                              <td style={{ padding: "8px", fontSize: "13px" }}>{order.email || "-"}</td>
                              <td style={{ padding: "8px", textAlign: "right", fontSize: "13px" }}>${order.totalPrice.toFixed(2)}</td>
                              <td style={{ padding: "8px", textAlign: "center" }}><StatusBadge status={order.financialStatus} /></td>
                              <td style={{ padding: "8px", fontSize: "13px", color: "#6D7175" }}>{new Date(order.processedAt).toLocaleDateString()}</td>
                            </tr>
                          ))
                        )}
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
