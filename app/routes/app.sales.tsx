import { useState } from "react";
import { useLoaderData } from "react-router";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";

const COLORS = ["#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed"];

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { authenticate } = await import("~/shopify.server");
    const { getRevenueKpi, getOrdersKpi, getAovKpi, getSalesChart } = await import("~/lib/analytics.server");
    const { default: prisma } = await import("~/db.server");
    const authResult = await authenticate.admin(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;
    const shopId = session.shop;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const range = { startDate, endDate, label: "Last 30 Days" };
    const [revenue, orders, aov, salesChart] = await Promise.all([
      getRevenueKpi(shopId, range), getOrdersKpi(shopId, range),
      getAovKpi(shopId, range), getSalesChart(shopId, range),
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
      revenue, orders, aov, salesChart,
      statusData: ordersByStatus.map((s) => ({ name: s.financialStatus || "Unknown", value: s._count.id })),
      dayOfWeekData: Object.values(dayCounts),
      isSample: false,
    };
  } catch (err: any) {
    if (err instanceof Response) return err;
    const { getSampleSalesData } = await import("~/lib/sampleData");
    return { ...getSampleSalesData(), isSample: true };
  }
}

export default function SalesPage() {
  const { revenue, orders, aov, salesChart, statusData, dayOfWeekData, isSample } = useLoaderData<typeof loader>();

  const safeRevenue = revenue || { label: "Total Revenue", value: "$0", change: 0, changeLabel: "", trend: "neutral" as const };
  const safeOrders = orders || { label: "Total Orders", value: "0", change: 0, changeLabel: "", trend: "neutral" as const };
  const safeAov = aov || { label: "Avg Order Value", value: "$0", change: 0, changeLabel: "", trend: "neutral" as const };

  return (
    <div className="mts-page">
      <div className="mts-page-header">
        <h1 className="mts-page-title">Sales Analytics</h1>
        <p className="mts-page-subtitle">Detailed breakdown of your store performance</p>
        {isSample && (
          <div style={{ marginTop: 12, padding: "10px 16px", borderRadius: 8, background: "rgba(37, 99, 235, 0.06)", border: "1px solid rgba(37, 99, 235, 0.15)", fontSize: 13, color: "var(--brand-primary-dark)" }}>
            <strong>Demo Mode</strong> &mdash; Showing sample data. Connect your Shopify store via Settings.
          </div>
        )}
      </div>

      <div className="mts-three-col">
        {[
          { label: "Total Revenue", value: safeRevenue.value, change: safeRevenue.change, trend: safeRevenue.trend, label2: safeRevenue.changeLabel },
          { label: "Total Orders", value: safeOrders.value, change: safeOrders.change, trend: safeOrders.trend, label2: safeOrders.changeLabel },
          { label: "Avg Order Value", value: safeAov.value, change: safeAov.change, trend: safeAov.trend, label2: safeAov.changeLabel },
        ].map((kpi, i) => (
          <div key={kpi.label} className={`mts-kpi-card ${["", "accent-green", "accent-cool"][i]}`}>
            <div className="mts-kpi-label">{kpi.label}</div>
            <div className="mts-kpi-value">{kpi.value}</div>
            <div className={`mts-kpi-change ${kpi.trend}`}>
              {kpi.trend === "up" ? "\u2191" : kpi.trend === "down" ? "\u2193" : "\u2192"} {Math.abs(kpi.change).toFixed(1)}% {kpi.label2}
            </div>
          </div>
        ))}
      </div>

      <div className="mts-chart-card">
        <h3 className="mts-chart-title">Revenue Over Time</h3>
        <p className="mts-chart-subtitle">Revenue and order volume for the last 30 days</p>
        <div className="mts-chart-wrapper" style={{ height: 350 }}>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={salesChart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradOrd" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => v.slice(5)} axisLine={false} tickLine={false} />
              <YAxis yAxisId="revenue" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `$${v}`} axisLine={false} tickLine={false} />
              <YAxis yAxisId="orders" orientation="right" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value: number, name: string) => [name === "revenue" ? `$${value.toFixed(2)}` : value, name === "revenue" ? "Revenue" : "Orders"]}
                contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "0 4px 6px rgba(0,0,0,0.07)" }}
              />
              <Area yAxisId="revenue" type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2.5} fill="url(#gradRev)" dot={false} activeDot={{ r: 5, fill: "#2563eb", stroke: "#fff", strokeWidth: 2 }} />
              <Area yAxisId="orders" type="monotone" dataKey="orders" stroke="#059669" strokeWidth={2} fill="url(#gradOrd)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mts-two-col-equal">
        <div className="mts-chart-card">
          <h3 className="mts-chart-title">Orders by Day of Week</h3>
          <p className="mts-chart-subtitle">When your customers are buying</p>
          <div className="mts-chart-wrapper" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dayOfWeekData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "0 4px 6px rgba(0,0,0,0.07)" }} />
                <Bar dataKey="orders" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mts-chart-card">
          <h3 className="mts-chart-title">Payment Status</h3>
          <p className="mts-chart-subtitle">Distribution of order payment statuses</p>
          <div className="mts-chart-wrapper" style={{ height: 260 }}>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={90} innerRadius={45} dataKey="value" paddingAngle={3} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {statusData.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "0 4px 6px rgba(0,0,0,0.07)" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 260, color: "var(--brand-text-muted)" }}>No payment data available</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
