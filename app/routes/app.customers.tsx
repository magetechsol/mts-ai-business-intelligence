import { useState } from "react";
import { useLoaderData } from "react-router";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import { getShopPlan } from "~/lib/billing.server";
import { getCustomerMetrics } from "~/lib/analytics.server";
import { getSampleCustomersData } from "~/lib/sampleData";

const COLORS = ["#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed"];

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { session } = await authenticate.admin(request);
    const shopId = session.shop;
    const planInfo = await getShopPlan(shopId);
    if (planInfo.isFree) {
      return { metrics: { totalCustomers: 0, newCustomers: 0, returningCustomers: 0, repeatPurchaseRate: 0, averageLifetimeValue: 0, topCustomers: [] }, monthlyData: [], customerSegments: [], spendRanges: [], customerOrders: {}, isSample: false, isPro: false };
    }
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const metrics = await getCustomerMetrics(shopId, { startDate, endDate, label: "Last 30 Days" });
    const monthlyCustomers = await prisma.syncedCustomer.findMany({ where: { shopId }, select: { createdAt: true }, orderBy: { createdAt: "asc" } });
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
    return {
      metrics, monthlyData, customerSegments, spendRanges: spendRanges.filter((r) => r.count > 0),
      customerOrders: {} as Record<string, any[]>,
      isSample: false, isPro: true,
    };
  } catch (err: any) {
    if (err instanceof Response) throw err;
    return { ...getSampleCustomersData(), isSample: true, isPro: true };
  }
}

export default function CustomersPage() {
  const { metrics, monthlyData, customerSegments, spendRanges, isSample, isPro } = useLoaderData<typeof loader>();
  const [selected, setSelected] = useState<typeof metrics.topCustomers[0] | null>(null);

  return (
    <div className="mts-page">
      <div className="mts-page-header">
        <h1 className="mts-page-title">Customers</h1>
        <p className="mts-page-subtitle">Understand your customers and their purchasing behavior</p>
        {isSample && (
          <div style={{ marginTop: 12, padding: "10px 16px", borderRadius: 8, background: "rgba(37, 99, 235, 0.06)", border: "1px solid rgba(37, 99, 235, 0.15)", fontSize: 13, color: "var(--brand-primary-dark)" }}>
            <strong>Demo Mode</strong> &mdash; Showing sample data.
          </div>
        )}
        {!isPro && (
          <div style={{ marginTop: 12, padding: "16px 20px", borderRadius: 8, background: "linear-gradient(135deg, rgba(37, 99, 235, 0.06), rgba(124, 58, 237, 0.06))", border: "1px solid rgba(37, 99, 235, 0.15)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, color: "var(--brand-text)" }}>Upgrade to Pro</div>
                <div style={{ fontSize: 13, color: "var(--brand-text-muted)", marginTop: 4 }}>Unlock customer segmentation, acquisition tracking, and more for $29/mo</div>
              </div>
              <a href="/app/pricing" target="_top" style={{ padding: "8px 20px", borderRadius: 8, background: "var(--brand-gradient)", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none", flexShrink: 0 }}>View Plans</a>
            </div>
          </div>
        )}
      </div>

      <div className="mts-kpi-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        {[
          { label: "Total Customers", value: String(metrics.totalCustomers), accent: "" },
          { label: "New Customers", value: String(metrics.newCustomers), accent: "accent-green" },
          { label: "Returning", value: String(metrics.returningCustomers), accent: "accent-cool" },
          { label: "Repeat Rate", value: `${metrics.repeatPurchaseRate}%`, accent: metrics.repeatPurchaseRate >= 30 ? "accent-green" : "accent-warm" },
          { label: "Avg Lifetime Value", value: `$${metrics.averageLifetimeValue.toFixed(2)}`, accent: "accent-warm" },
        ].map((s) => (
          <div key={s.label} className={`mts-kpi-card ${s.accent}`}>
            <div className="mts-kpi-label">{s.label}</div>
            <div className="mts-kpi-value">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="mts-two-col-equal">
        <div className="mts-chart-card">
          <h3 className="mts-chart-title">Customer Acquisition</h3>
          <p className="mts-chart-subtitle">Monthly new customer trend</p>
          <div className="mts-chart-wrapper" style={{ height: 260 }}>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs><linearGradient id="gradCust" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} /><stop offset="95%" stopColor="#2563eb" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }} />
                  <Area type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2.5} fill="url(#gradCust)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div style={{ textAlign: "center", color: "var(--brand-text-muted)", padding: 40 }}>No customer data yet</div>}
          </div>
        </div>
        <div className="mts-chart-card">
          <h3 className="mts-chart-title">Customer Segments</h3>
          <div className="mts-chart-wrapper" style={{ height: 260 }}>
            {customerSegments.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={customerSegments} cx="50%" cy="50%" outerRadius={90} innerRadius={45} dataKey="value" paddingAngle={3} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {customerSegments.map((_: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div style={{ textAlign: "center", color: "var(--brand-text-muted)", padding: 40 }}>No segment data</div>}
          </div>
        </div>
      </div>

      <div className="mts-two-col-equal">
        <div className="mts-chart-card">
          <h3 className="mts-chart-title">Spend Distribution</h3>
          <div className="mts-chart-wrapper" style={{ height: 260 }}>
            {spendRanges.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={spendRanges} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }} />
                  <Bar dataKey="count" fill="#059669" radius={[6, 6, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div style={{ textAlign: "center", color: "var(--brand-text-muted)", padding: 40 }}>No spend data</div>}
          </div>
        </div>
        <div className="mts-table-card">
          <div className="mts-table-header">
            <h3 className="mts-table-title">Top Customers</h3>
          </div>
          <table className="mts-table">
            <thead><tr><th>Customer</th><th>Email</th><th style={{ textAlign: "right" }}>Spent</th><th style={{ textAlign: "right" }}>Orders</th></tr></thead>
            <tbody>
              {metrics.topCustomers.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: "40px 24px", textAlign: "center", color: "var(--brand-text-muted)" }}>No customer data yet</td></tr>
              ) : metrics.topCustomers.slice(0, 8).map((c) => (
                <tr key={c.id} onClick={() => setSelected(c)} style={{ cursor: "pointer" }}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td style={{ color: "var(--brand-text-muted)" }}>{c.email}</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>${c.totalSpent.toFixed(2)}</td>
                  <td style={{ textAlign: "right" }}>{c.ordersCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }} onClick={() => setSelected(null)}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 500, boxShadow: "0 25px 50px rgba(0,0,0,0.25)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--brand-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{selected.name}</h3>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--brand-text-muted)" }}>&times;</button>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div><div className="mts-kpi-label">Email</div><div style={{ fontWeight: 500 }}>{selected.email || "N/A"}</div></div>
                <div><div className="mts-kpi-label">Total Spent</div><div style={{ fontWeight: 600, fontSize: 18 }}>${selected.totalSpent.toFixed(2)}</div></div>
                <div><div className="mts-kpi-label">Orders</div><div style={{ fontWeight: 600, fontSize: 18 }}>{selected.ordersCount}</div></div>
                <div><div className="mts-kpi-label">Avg Order Value</div><div style={{ fontWeight: 600, fontSize: 18 }}>${selected.ordersCount > 0 ? (selected.totalSpent / selected.ordersCount).toFixed(2) : "0.00"}</div></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const headers: HeadersFunction = (headersArgs) => boundary.headers(headersArgs);
