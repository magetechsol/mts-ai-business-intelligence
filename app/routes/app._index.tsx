import { useState } from "react";
import { useLoaderData } from "react-router";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from "recharts";

export async function loader({ request }: LoaderFunctionArgs) {
  const ua = request.headers.get("User-Agent") || "none";
  const url = request.url;
  console.log(`[AUTH DEBUG] UA: ${ua.substring(0, 200)} | URL: ${url.substring(0, 200)}`);
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
      shopId, analytics,
      recentOrders: orders.map((o) => ({
        id: o.id, name: o.name, email: o.email, totalPrice: o.totalPrice,
        financialStatus: o.financialStatus,
        processedAt: o.processedAt?.toISOString() || o.createdAt.toISOString(),
      })),
      isSample: false,
    };
  } catch (err: any) {
    console.error("[AUTH FAIL]", err?.message || err, err?.stack);
    const { getSampleDashboardData } = await import("~/lib/sampleData");
    return { ...getSampleDashboardData(), isSample: true, authError: err?.message || "unknown" };
  }
}

const kpiIcons: Record<string, string> = {
  "Total Revenue": "\u20B9",
  "Total Orders": "\u23F2",
  "Average Order Value": "\u2696",
  "New Customers": "\u2603",
  "Repeat Purchase Rate": "\u21BB",
  "Conversion Rate": "\u25C6",
};

export default function Dashboard() {
  const { analytics, recentOrders, isSample, authError } = useLoaderData<typeof loader>();
  const [timeRange, setTimeRange] = useState("30d");

  const kpis = [
    analytics.revenue,
    analytics.orders,
    analytics.averageOrderValue,
    analytics.customers,
    analytics.repeatRate,
    analytics.conversionRate,
  ];

  const accentClasses = ["", "accent-green", "accent-cool", "accent-warm", "accent-green", "accent-cool"];

  return (
    <div className="mts-page">
      <div className="mts-page-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 className="mts-page-title">Dashboard</h1>
            <p className="mts-page-subtitle">Your store performance at a glance</p>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { label: "7D", value: "7d" },
              { label: "30D", value: "30d" },
              { label: "90D", value: "90d" },
              { label: "12M", value: "12m" },
            ].map((range) => (
              <button
                key={range.value}
                onClick={() => setTimeRange(range.value)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  border: timeRange === range.value ? "none" : "1px solid var(--brand-border)",
                  background: timeRange === range.value ? "var(--brand-primary)" : "var(--brand-card)",
                  color: timeRange === range.value ? "#fff" : "var(--brand-text-muted)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
        {isSample && (
          <div style={{ marginTop: 12, padding: "10px 16px", borderRadius: 8, background: "rgba(37, 99, 235, 0.06)", border: "1px solid rgba(37, 99, 235, 0.15)", fontSize: 13, color: "var(--brand-primary-dark)" }}>
            <strong>Demo Mode</strong> &mdash; {authError ? `Auth error: ${authError}` : "Showing sample data. Connect your Shopify store via Settings to see live analytics."}
          </div>
        )}
      </div>

      <div className="mts-kpi-grid">
        {kpis.map((kpi, i) => {
          const icon = kpiIcons[kpi.label] || "\u2022";
          return (
            <div key={kpi.label} className={`mts-kpi-card ${accentClasses[i] || ""}`}>
              <div className="mts-kpi-label">{icon} {kpi.label}</div>
              <div className="mts-kpi-value">{kpi.value}</div>
              <div className={`mts-kpi-change ${kpi.trend}`}>
                {kpi.trend === "up" ? "\u2191" : kpi.trend === "down" ? "\u2193" : "\u2192"} {Math.abs(kpi.change).toFixed(1)}% {kpi.changeLabel}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mts-two-col">
        <div className="mts-chart-card">
          <h3 className="mts-chart-title">Revenue Trend</h3>
          <p className="mts-chart-subtitle">Daily revenue for the last 30 days</p>
          <div className="mts-chart-wrapper" style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.salesChart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => v.slice(5)} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `$${v}`} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
                  labelFormatter={(label) => `Date: ${label}`}
                  contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "0 4px 6px rgba(0,0,0,0.07)" }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2.5} fill="url(#gradRevenue)" dot={false} activeDot={{ r: 5, fill: "#2563eb", stroke: "#fff", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mts-chart-card">
          <h3 className="mts-chart-title">Top Products</h3>
          <p className="mts-chart-subtitle">Revenue by product</p>
          <div className="mts-chart-wrapper" style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.topProducts.slice(0, 5)} layout="vertical" margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `$${v}`} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="title" tick={{ fontSize: 11, fill: "#475569" }} width={90} axisLine={false} tickLine={false} tickFormatter={(v) => v.length > 14 ? v.slice(0, 14) + "..." : v} />
                <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "0 4px 6px rgba(0,0,0,0.07)" }} />
                <Bar dataKey="revenue" fill="#7c3aed" radius={[0, 6, 6, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mts-table-card">
        <div className="mts-table-header">
          <h3 className="mts-table-title">Recent Orders</h3>
          <span style={{ fontSize: 13, color: "var(--brand-text-muted)" }}>{recentOrders.length} orders</span>
        </div>
        <table className="mts-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th style={{ textAlign: "right" }}>Total</th>
              <th style={{ textAlign: "center" }}>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "40px 24px", textAlign: "center", color: "var(--brand-text-muted)" }}>
                  No orders yet. Sync your store data from Settings.
                </td>
              </tr>
            ) : recentOrders.map((order) => (
              <tr key={order.id}>
                <td style={{ fontWeight: 600 }}>{order.name}</td>
                <td>{order.email || "-"}</td>
                <td style={{ textAlign: "right", fontWeight: 600 }}>${order.totalPrice.toFixed(2)}</td>
                <td style={{ textAlign: "center" }}>
                  <span className={`mts-badge ${(order.financialStatus || "").toLowerCase()}`}>
                    {order.financialStatus || "Unknown"}
                  </span>
                </td>
                <td style={{ color: "var(--brand-text-muted)" }}>{new Date(order.processedAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
