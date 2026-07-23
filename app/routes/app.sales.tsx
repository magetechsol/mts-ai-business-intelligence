import { Box, Layout, Text, Badge, Card, Grid, BlockStack } from "@shopify/polaris";
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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useState, useMemo } from "react";
import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";

const COLORS = ["#503ceb", "#4bb550", "#E4910B", "#D72C0D", "#503ceb", "#503ceb"];

export async function loader({ request }: LoaderFunctionArgs) {
  const { authenticate } = await import("~/shopify.server");
  const { getRevenueKpi, getOrdersKpi, getAovKpi, getSalesChart } = await import("~/lib/analytics.server");
  const { default: prisma } = await import("~/db.server");

  const { session } = await authenticate.admin(request);
  const shopId = session.shop;

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const range = { startDate, endDate, label: "Last 30 Days" };

  const [revenue, orders, aov, salesChart] = await Promise.all([
    getRevenueKpi(shopId, range),
    getOrdersKpi(shopId, range),
    getAovKpi(shopId, range),
    getSalesChart(shopId, range),
  ]);

  const ordersByStatus = await prisma.syncedOrder.groupBy({
    by: ["financialStatus"],
    where: { shopId, processedAt: { gte: startDate, lt: endDate } },
    _count: { id: true },
  });

  const hourlyOrders = await prisma.syncedOrder.findMany({
    where: { shopId, processedAt: { gte: startDate, lt: endDate } },
    select: { processedAt: true },
  });

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayCounts: Record<number, { day: string; orders: number }> = {};
  dayNames.forEach((name, i) => { dayCounts[i] = { day: name, orders: 0 }; });
  hourlyOrders.forEach((o) => {
    if (o.processedAt) { dayCounts[o.processedAt.getDay()].orders += 1; }
  });

  return {
    revenue,
    orders,
    aov,
    salesChart,
    statusData: ordersByStatus.map((s) => ({ name: s.financialStatus || "Unknown", value: s._count.id })),
    dayOfWeekData: Object.values(dayCounts),
  };
}

export default function SalesPage() {
  const { revenue, orders, aov, salesChart, statusData, dayOfWeekData } = useLoaderData<typeof loader>();

  return (
    <Box padding="400">
      <Layout>
        <Layout.Section>
          <BlockStack spacing="400">
            <div>
              <Text variant="headingXl" as="h1">Sales Analytics</Text>
              <Text variant="bodyMd" as="p" color="subdued">Detailed breakdown of your store performance</Text>
            </div>

            <Grid>
              <Grid.Cell columnSpan={{ xs: 6, sm: 4 }}>
                <Card><Box padding="400"><BlockStack spacing="200">
                  <Text variant="bodyMd" as="p" color="subdued">Total Revenue</Text>
                  <Text variant="heading2xl" as="h2">{revenue.value}</Text>
                  <Badge tone={revenue.trend === "up" ? "success" : revenue.trend === "down" ? "critical" : "info"}>
                    {revenue.change >= 0 ? "\u2191" : "\u2193"} {Math.abs(revenue.change).toFixed(1)}%
                  </Badge>
                </BlockStack></Box></Card>
              </Grid.Cell>
              <Grid.Cell columnSpan={{ xs: 6, sm: 4 }}>
                <Card><Box padding="400"><BlockStack spacing="200">
                  <Text variant="bodyMd" as="p" color="subdued">Total Orders</Text>
                  <Text variant="heading2xl" as="h2">{orders.value}</Text>
                  <Badge tone={orders.trend === "up" ? "success" : orders.trend === "down" ? "critical" : "info"}>
                    {orders.change >= 0 ? "\u2191" : "\u2193"} {Math.abs(orders.change).toFixed(1)}%
                  </Badge>
                </BlockStack></Box></Card>
              </Grid.Cell>
              <Grid.Cell columnSpan={{ xs: 6, sm: 4 }}>
                <Card><Box padding="400"><BlockStack spacing="200">
                  <Text variant="bodyMd" as="p" color="subdued">Avg Order Value</Text>
                  <Text variant="heading2xl" as="h2">{aov.value}</Text>
                  <Badge tone={aov.trend === "up" ? "success" : aov.trend === "down" ? "critical" : "info"}>
                    {aov.change >= 0 ? "\u2191" : "\u2193"} {Math.abs(aov.change).toFixed(1)}%
                  </Badge>
                </BlockStack></Box></Card>
              </Grid.Cell>
            </Grid>

            <Card>
              <Box padding="400">
                <BlockStack spacing="300">
                  <Text variant="headingLg" as="h2">Revenue Over Time</Text>
                  <div style={{ width: "100%", height: 350 }}>
                    <ResponsiveContainer>
                      <AreaChart data={salesChart}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#503ceb" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#503ceb" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4bb550" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#4bb550" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E1E3E5" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(v) => v.slice(5)} />
                        <YAxis yAxisId="revenue" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                        <YAxis yAxisId="orders" orientation="right" tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value: number, name: string) => [name === "revenue" ? `$${value.toFixed(2)}` : value, name === "revenue" ? "Revenue" : "Orders"]} />
                        <Area yAxisId="revenue" type="monotone" dataKey="revenue" stroke="#503ceb" strokeWidth={2} fill="url(#colorRevenue)" />
                        <Area yAxisId="orders" type="monotone" dataKey="orders" stroke="#4bb550" strokeWidth={2} fill="url(#colorOrders)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </BlockStack>
              </Box>
            </Card>

            <Grid>
              <Grid.Cell columnSpan={{ xs: 12, md: 6 }}>
                <Card>
                  <Box padding="400">
                    <BlockStack spacing="300">
                      <Text variant="headingLg" as="h2">Orders by Day of Week</Text>
                      <div style={{ width: "100%", height: 250 }}>
                        <ResponsiveContainer>
                          <BarChart data={dayOfWeekData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E1E3E5" />
                            <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="orders" fill="#503ceb" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </BlockStack>
                  </Box>
                </Card>
              </Grid.Cell>

              <Grid.Cell columnSpan={{ xs: 12, md: 6 }}>
                <Card>
                  <Box padding="400">
                    <BlockStack spacing="300">
                      <Text variant="headingLg" as="h2">Payment Status Distribution</Text>
                      <div style={{ width: "100%", height: 250 }}>
                        {statusData.length > 0 ? (
                          <ResponsiveContainer>
                            <PieChart>
                              <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                                {statusData.map((_: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", color: "#6D7175" }}>
                            No payment data available
                          </div>
                        )}
                      </div>
                    </BlockStack>
                  </Box>
                </Card>
              </Grid.Cell>
            </Grid>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Box>
  );
}
