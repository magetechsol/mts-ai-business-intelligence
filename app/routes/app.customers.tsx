import { Box, Layout, Text, Card, Grid, Badge, BlockStack, Modal } from "@shopify/polaris";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { useState } from "react";
import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";

const COLORS = ["#503ceb", "#4bb550", "#E4910B", "#D72C0D", "#503ceb"];

export async function loader({ request }: LoaderFunctionArgs) {
  const { authenticate } = await import("~/shopify.server");
  const { getCustomerMetrics } = await import("~/lib/analytics.server");
  const { default: prisma } = await import("~/db.server");

  const { session } = await authenticate.admin(request);
  const shopId = session.shop;

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const metrics = await getCustomerMetrics(shopId, { startDate, endDate, label: "Last 30 Days" });

  const monthlyCustomers = await prisma.syncedCustomer.findMany({
    where: { shopId },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const monthly: Record<string, { month: string; count: number }> = {};
  monthlyCustomers.forEach((c) => {
    const key = c.createdAt.toISOString().slice(0, 7);
    if (!monthly[key]) monthly[key] = { month: key, count: 0 };
    monthly[key].count++;
  });
  const monthlyData = Object.values(monthly).slice(-12);

  const customerSegments = [
    { name: "One-time Buyers", value: metrics.totalCustomers - metrics.returningCustomers },
    { name: "Repeat Buyers", value: metrics.returningCustomers },
  ].filter((s) => s.value > 0);

  const spendRanges = [
    { name: "$0-$50", min: 0, max: 50, count: 0 },
    { name: "$50-$100", min: 50, max: 100, count: 0 },
    { name: "$100-$250", min: 100, max: 250, count: 0 },
    { name: "$250-$500", min: 250, max: 500, count: 0 },
    { name: "$500+", min: 500, max: Infinity, count: 0 },
  ];
  metrics.topCustomers.forEach((c) => {
    for (const range of spendRanges) {
      if (c.totalSpent >= range.min && c.totalSpent < range.max) { range.count++; break; }
    }
  });

  const topCustomerEmails = metrics.topCustomers
    .map((c) => c.email)
    .filter((e): e is string => !!e);

  const customerOrders = topCustomerEmails.length > 0
    ? await prisma.syncedOrder.findMany({
        where: { shopId, customerEmail: { in: topCustomerEmails } },
        orderBy: { processedAt: "desc" },
        select: {
          id: true, name: true, customerEmail: true, totalPrice: true,
          financialStatus: true, processedAt: true,
        },
      })
    : [];

  const ordersByEmail: Record<string, typeof customerOrders> = {};
  customerOrders.forEach((o) => {
    const email = o.customerEmail || "";
    if (!ordersByEmail[email]) ordersByEmail[email] = [];
    ordersByEmail[email].push(o);
  });

  return {
    metrics, monthlyData, customerSegments, spendRanges: spendRanges.filter((r) => r.count > 0),
    customerOrders: ordersByEmail,
  };
}

export default function CustomersPage() {
  const { metrics, monthlyData, customerSegments, spendRanges, customerOrders } = useLoaderData<typeof loader>();
  const [selectedCustomer, setSelectedCustomer] = useState<typeof metrics.topCustomers[0] | null>(null);

  return (
    <Box padding="400">
      <Layout>
        <Layout.Section>
          <BlockStack spacing="400">
            <div>
              <Text variant="headingXl" as="h1">Customer Analytics</Text>
              <Text variant="bodyMd" as="p" color="subdued">Understand your customers and their purchasing behavior</Text>
            </div>

            <Grid>
              {[
                { label: "Total Customers", value: String(metrics.totalCustomers) },
                { label: "New Customers", value: String(metrics.newCustomers) },
                { label: "Repeat Purchase Rate", value: `${metrics.repeatPurchaseRate}%`, badge: metrics.repeatPurchaseRate >= 30 ? "success" : metrics.repeatPurchaseRate >= 15 ? "warning" : "critical" },
                { label: "Average Lifetime Value", value: `$${metrics.averageLifetimeValue.toFixed(2)}` },
                { label: "Returning Customers", value: String(metrics.returningCustomers) },
              ].map((stat) => (
                <Grid.Cell key={stat.label} columnSpan={{ xs: 6, sm: 4, md: 4 }}>
                  <Card><Box padding="400"><BlockStack spacing="200">
                    <Text variant="bodyMd" as="p" color="subdued">{stat.label}</Text>
                    <Text variant="heading2xl" as="h2">
                      {stat.badge ? <><span style={{ fontSize: "24px" }}>{stat.value}</span> <Badge tone={stat.badge}>{stat.badge === "success" ? "Healthy" : stat.badge === "warning" ? "Average" : "Needs Improvement"}</Badge></> : stat.value}
                    </Text>
                  </BlockStack></Box></Card>
                </Grid.Cell>
              ))}
            </Grid>

            <Grid>
              <Grid.Cell columnSpan={{ xs: 12, md: 6 }}>
                <Card><Box padding="400"><BlockStack spacing="300">
                  <Text variant="headingLg" as="h2">Customer Acquisition Trend</Text>
                  <div style={{ width: "100%", height: 250 }}>
                    {monthlyData.length > 0 ? (
                      <ResponsiveContainer>
                        <AreaChart data={monthlyData}>
                          <defs><linearGradient id="colorCustomers" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#503ceb" stopOpacity={0.3} /><stop offset="95%" stopColor="#503ceb" stopOpacity={0} /></linearGradient></defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E1E3E5" />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Area type="monotone" dataKey="count" stroke="#503ceb" strokeWidth={2} fill="url(#colorCustomers)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : <div style={{ textAlign: "center", color: "#6D7175", padding: "40px" }}>No customer data available yet</div>}
                  </div>
                </BlockStack></Box></Card>
              </Grid.Cell>

              <Grid.Cell columnSpan={{ xs: 12, md: 6 }}>
                <Card><Box padding="400"><BlockStack spacing="300">
                  <Text variant="headingLg" as="h2">Customer Segments</Text>
                  <div style={{ width: "100%", height: 250 }}>
                    {customerSegments.length > 0 ? (
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie data={customerSegments} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                            {customerSegments.map((_: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <div style={{ textAlign: "center", color: "#6D7175", padding: "40px" }}>No segment data available</div>}
                  </div>
                </BlockStack></Box></Card>
              </Grid.Cell>
            </Grid>

            <Grid>
              <Grid.Cell columnSpan={{ xs: 12, md: 6 }}>
                <Card><Box padding="400"><BlockStack spacing="300">
                  <Text variant="headingLg" as="h2">Spend Distribution</Text>
                  <div style={{ width: "100%", height: 250 }}>
                    {spendRanges.length > 0 ? (
                      <ResponsiveContainer>
                        <BarChart data={spendRanges}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E1E3E5" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#4bb550" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <div style={{ textAlign: "center", color: "#6D7175", padding: "40px" }}>No spend data available</div>}
                  </div>
                </BlockStack></Box></Card>
              </Grid.Cell>

              <Grid.Cell columnSpan={{ xs: 12, md: 6 }}>
                <Card><Box padding="400"><BlockStack spacing="300">
                  <Text variant="headingLg" as="h2">Top Customers</Text>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #E1E3E5" }}>
                          {["Customer", "Email", "Total Spent", "Orders"].map((h, i) => (
                            <th key={h} style={{ padding: "8px", textAlign: i >= 2 ? "right" : "left", fontSize: "13px", fontWeight: 600 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.topCustomers.length === 0 ? (
                          <tr><td colSpan={4} style={{ padding: "20px", textAlign: "center", color: "#6D7175" }}>No customer data yet</td></tr>
                        ) : metrics.topCustomers.slice(0, 10).map((c) => (
                          <tr key={c.id} onClick={() => setSelectedCustomer(c)} style={{ borderBottom: "1px solid #F4F6F8", cursor: "pointer" }}>
                            <td style={{ padding: "8px", fontSize: "13px", fontWeight: 500 }}>{c.name}</td>
                            <td style={{ padding: "8px", fontSize: "13px", color: "#6D7175" }}>{c.email}</td>
                            <td style={{ padding: "8px", textAlign: "right", fontSize: "13px" }}>${c.totalSpent.toFixed(2)}</td>
                            <td style={{ padding: "8px", textAlign: "right", fontSize: "13px" }}>{c.ordersCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </BlockStack></Box></Card>
              </Grid.Cell>
            </Grid>
          </BlockStack>
        </Layout.Section>
      </Layout>

      {selectedCustomer && (
        <Modal
          open
          onClose={() => setSelectedCustomer(null)}
          title={selectedCustomer.name}
          secondaryActions={[{ content: "Close", onAction: () => setSelectedCustomer(null) }]}
        >
          <Modal.Section>
            <BlockStack spacing="400">
              <Grid>
                <Grid.Cell columnSpan={{ xs: 6 }}>
                  <Text variant="bodyMd" as="p" color="subdued">Email</Text>
                  <Text variant="bodyLg" as="p">{selectedCustomer.email || "N/A"}</Text>
                </Grid.Cell>
                <Grid.Cell columnSpan={{ xs: 6 }}>
                  <Text variant="bodyMd" as="p" color="subdued">Total Spent</Text>
                  <Text variant="headingLg" as="h3">${selectedCustomer.totalSpent.toFixed(2)}</Text>
                </Grid.Cell>
                <Grid.Cell columnSpan={{ xs: 6 }}>
                  <Text variant="bodyMd" as="p" color="subdued">Orders</Text>
                  <Text variant="headingLg" as="h3">{selectedCustomer.ordersCount}</Text>
                </Grid.Cell>
                <Grid.Cell columnSpan={{ xs: 6 }}>
                  <Text variant="bodyMd" as="p" color="subdued">Avg Order Value</Text>
                  <Text variant="headingLg" as="h3">
                    ${selectedCustomer.ordersCount > 0 ? (selectedCustomer.totalSpent / selectedCustomer.ordersCount).toFixed(2) : "0.00"}
                  </Text>
                </Grid.Cell>
              </Grid>

              <BlockStack spacing="200">
                <Text variant="headingLg" as="h2">Order History</Text>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #E1E3E5" }}>
                        {["Order", "Total", "Status", "Date"].map((h, i) => (
                          <th key={h} style={{ padding: "8px", textAlign: i === 1 ? "right" : "left", fontSize: "13px", fontWeight: 600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(customerOrders[selectedCustomer.email || ""] || []).length === 0 ? (
                        <tr><td colSpan={4} style={{ padding: "20px", textAlign: "center", color: "#6D7175" }}>No orders found for this customer</td></tr>
                      ) : (customerOrders[selectedCustomer.email || ""] || []).slice(0, 20).map((o) => {
                        const statusTone: Record<string, any> = {
                          PAID: "success", PENDING: "warning", REFUNDED: "critical",
                          AUTHORIZED: "info", VOIDED: "critical",
                        };
                        return (
                          <tr key={o.id} style={{ borderBottom: "1px solid #F4F6F8" }}>
                            <td style={{ padding: "8px", fontSize: "13px", fontWeight: 500 }}>{o.name}</td>
                            <td style={{ padding: "8px", textAlign: "right", fontSize: "13px" }}>${o.totalPrice.toFixed(2)}</td>
                            <td style={{ padding: "8px" }}><Badge tone={statusTone[o.financialStatus || ""] || "info"}>{o.financialStatus || "Unknown"}</Badge></td>
                            <td style={{ padding: "8px", fontSize: "13px", color: "#6D7175" }}>{o.processedAt ? new Date(o.processedAt).toLocaleDateString() : "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </BlockStack>
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}
    </Box>
  );
}
