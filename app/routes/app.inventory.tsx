import { useState } from "react";
import { useLoaderData } from "react-router";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  in_stock: "#059669",
  low_stock: "#d97706",
  out_of_stock: "#dc2626",
};

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { authenticate } = await import("~/shopify.server");
    const { getShopPlan } = await import("~/lib/billing.server");
    const authResult = await authenticate.admin(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;
    const shopId = session.shop;
    const planInfo = await getShopPlan(shopId);
    if (planInfo.isFree) {
      return { summary: { total: 0, inStock: 0, lowStock: 0, outOfStock: 0, totalUnits: 0, totalValue: 0 }, statusData: [], lowStockItems: [], inventoryByProduct: [], isSample: false, isPro: false };
    }
    const { getInventoryItems } = await import("~/lib/analytics.server");
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
      { name: "In Stock", value: summary.inStock, color: STATUS_COLORS.in_stock },
      { name: "Low Stock", value: summary.lowStock, color: STATUS_COLORS.low_stock },
      { name: "Out of Stock", value: summary.outOfStock, color: STATUS_COLORS.out_of_stock },
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
    return { summary, statusData, lowStockItems, inventoryByProduct, isSample: false, isPro: true };
  } catch (err: any) {
    if (err instanceof Response) return err;
    const { getSampleInventoryData } = await import("~/lib/sampleData");
    return { ...getSampleInventoryData(), isSample: true, isPro: true };
  }
}

export default function InventoryPage() {
  const { summary, statusData, lowStockItems, inventoryByProduct, isSample, isPro } = useLoaderData<typeof loader>();

  return (
    <div className="mts-page">
      <div className="mts-page-header">
        <h1 className="mts-page-title">Inventory Health</h1>
        <p className="mts-page-subtitle">Monitor stock levels and identify inventory issues</p>
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
                <div style={{ fontSize: 13, color: "var(--brand-text-muted)", marginTop: 4 }}>Unlock inventory health monitoring, stock alerts, and more for $29/mo</div>
              </div>
              <a href="/app/pricing" target="_top" style={{ padding: "8px 20px", borderRadius: 8, background: "var(--brand-gradient)", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none", flexShrink: 0 }}>View Plans</a>
            </div>
          </div>
        )}
      </div>

      <div className="mts-kpi-grid" style={{ gridTemplateColumns: "repeat(6, 1fr)" }}>
        {[
          { label: "Total SKUs", value: String(summary.total), accent: "" },
          { label: "Total Units", value: summary.totalUnits.toLocaleString(), accent: "" },
          { label: "Inventory Value", value: `$${summary.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, accent: "" },
          { label: "In Stock", value: String(summary.inStock), accent: "accent-green" },
          { label: "Low Stock", value: String(summary.lowStock), accent: "accent-warm" },
          { label: "Out of Stock", value: String(summary.outOfStock), accent: "accent-warm" },
        ].map((s) => (
          <div key={s.label} className={`mts-kpi-card ${s.accent}`}>
            <div className="mts-kpi-label">{s.label}</div>
            <div className="mts-kpi-value">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="mts-two-col-equal">
        <div className="mts-chart-card">
          <h3 className="mts-chart-title">Stock Status Overview</h3>
          <div className="mts-chart-wrapper" style={{ height: 260 }}>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={90} innerRadius={45} dataKey="value" paddingAngle={3}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div style={{ textAlign: "center", color: "var(--brand-text-muted)", padding: 40 }}>No inventory data available</div>}
          </div>
        </div>
        <div className="mts-chart-card">
          <h3 className="mts-chart-title">Inventory Value by Product</h3>
          <div className="mts-chart-wrapper" style={{ height: 260 }}>
            {inventoryByProduct.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={inventoryByProduct} layout="vertical" margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `$${v}`} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="title" tick={{ fontSize: 11, fill: "#475569" }} width={100}
                    tickFormatter={(v) => v.length > 15 ? v.slice(0, 15) + "..." : v} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }} formatter={(value: number) => [`$${value.toFixed(2)}`, "Value"]} />
                  <Bar dataKey="totalValue" fill="#7c3aed" radius={[0, 6, 6, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div style={{ textAlign: "center", color: "var(--brand-text-muted)", padding: 40 }}>No inventory data available</div>}
          </div>
        </div>
      </div>

      <div className="mts-table-card">
        <div className="mts-table-header">
          <h3 className="mts-table-title">Low Stock & Out of Stock Alerts</h3>
          <span className="mts-badge out-of-stock">{lowStockItems.length} items need attention</span>
        </div>
        <table className="mts-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Variant</th>
              <th>SKU</th>
              <th style={{ textAlign: "center" }}>Status</th>
              <th style={{ textAlign: "right" }}>Quantity</th>
              <th style={{ textAlign: "right" }}>Price</th>
            </tr>
          </thead>
          <tbody>
            {lowStockItems.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: "40px 24px", textAlign: "center", color: "var(--brand-text-muted)" }}>No low stock alerts. All products are well-stocked.</td></tr>
            ) : lowStockItems.map((item) => (
              <tr key={item.id}>
                <td style={{ fontWeight: 600 }}>{item.productTitle}</td>
                <td>{item.variantTitle}</td>
                <td style={{ color: "var(--brand-text-muted)" }}>{item.sku || "-"}</td>
                <td style={{ textAlign: "center" }}>
                  <span className={`mts-badge ${item.status === "out_of_stock" ? "out-of-stock" : "low-stock"}`}>
                    {item.status === "out_of_stock" ? "Out of Stock" : "Low Stock"}
                  </span>
                </td>
                <td style={{ textAlign: "right" }}>{item.quantity}</td>
                <td style={{ textAlign: "right", fontWeight: 600 }}>${item.price.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const headers: HeadersFunction = (headersArgs) => boundary.headers(headersArgs);
