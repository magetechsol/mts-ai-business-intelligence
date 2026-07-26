import { useState, useMemo } from "react";
import { useLoaderData } from "react-router";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { authenticate } = await import("~/shopify.server");
    const { getShopPlan } = await import("~/lib/billing.server");
    const { default: prisma } = await import("~/db.server");
    const { session } = await authenticate.admin(request);
    const shopId = session.shop;
    const planInfo = await getShopPlan(shopId);
    if (planInfo.isFree) {
      return { products: [], typeData: [], vendorData: [], summary: { total: 0, active: 0, totalInventory: 0, lowStockProducts: 0, outOfStock: 0 }, isSample: false, isPro: false };
    }
    const products = await prisma.syncedProduct.findMany({ where: { shopId }, include: { variants: true }, orderBy: { title: "asc" } });
    const productTypeData = await prisma.syncedProduct.groupBy({ by: ["productType"], where: { shopId, status: "ACTIVE" }, _count: { id: true } });
    const vendorData = await prisma.syncedProduct.groupBy({ by: ["vendor"], where: { shopId, status: "ACTIVE" }, _count: { id: true } });
    const totalInventory = products.reduce((sum, p) => sum + p.variants.reduce((vSum, v) => vSum + v.inventory, 0), 0);
    const lowStockProducts = products.filter((p) => p.variants.some((v) => v.inventory > 0 && v.inventory <= 5)).length;
    const outOfStock = products.filter((p) => p.variants.every((v) => v.inventory <= 0)).length;
    return {
      products: products.map((p) => ({
        id: p.id, title: p.title, vendor: p.vendor, productType: p.productType,
        status: p.status, totalVariants: p.totalVariants, createdAt: p.createdAt.toISOString(),
        totalInventory: p.variants.reduce((sum, v) => sum + v.inventory, 0),
        totalValue: p.variants.reduce((sum, v) => sum + v.price * v.inventory, 0),
        variants: p.variants.map((v) => ({ id: v.id, title: v.title, sku: v.sku, price: v.price, inventory: v.inventory })),
      })),
      typeData: productTypeData.map((d) => ({ name: d.productType || "Uncategorized", value: d._count.id })),
      vendorData: vendorData.slice(0, 10).map((d) => ({ name: d.vendor || "Unknown", value: d._count.id })),
      summary: { total: products.length, active: products.filter((p) => p.status === "ACTIVE").length, totalInventory, lowStockProducts, outOfStock },
      isSample: false, isPro: true,
    };
  } catch (err: any) {
    if (err instanceof Response) throw err;
    const { getSampleProductsData } = await import("~/lib/sampleData");
    return { ...getSampleProductsData(), isSample: true, isPro: true };
  }
}

export default function ProductsPage() {
  const { products, typeData, vendorData, summary, isSample, isPro } = useLoaderData<typeof loader>();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<typeof products[0] | null>(null);

  const filtered = useMemo(() => {
    if (!search) return products;
    const q = search.toLowerCase();
    return products.filter((p) => p.title.toLowerCase().includes(q) || p.vendor?.toLowerCase().includes(q));
  }, [products, search]);

  return (
    <div className="mts-page">
      <div className="mts-page-header">
        <h1 className="mts-page-title">Products</h1>
        <p className="mts-page-subtitle">Analyze your product catalog and inventory levels</p>
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
                <div style={{ fontSize: 13, color: "var(--brand-text-muted)", marginTop: 4 }}>Unlock advanced product analytics, inventory monitoring, and more for $29/mo</div>
              </div>
              <a href="/app/pricing" target="_top" style={{ padding: "8px 20px", borderRadius: 8, background: "var(--brand-gradient)", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none", flexShrink: 0 }}>View Plans</a>
            </div>
          </div>
        )}
      </div>

      <div className="mts-kpi-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        {[
          { label: "Total Products", value: String(summary.total), accent: "" },
          { label: "Active", value: String(summary.active), accent: "accent-green" },
          { label: "Total Inventory", value: summary.totalInventory.toLocaleString(), accent: "accent-cool" },
          { label: "Low Stock", value: String(summary.lowStockProducts), accent: "accent-warm" },
          { label: "Out of Stock", value: String(summary.outOfStock), accent: "" },
        ].map((s) => (
          <div key={s.label} className={`mts-kpi-card ${s.accent}`}>
            <div className="mts-kpi-label">{s.label}</div>
            <div className="mts-kpi-value">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="mts-two-col-equal">
        <div className="mts-chart-card">
          <h3 className="mts-chart-title">Products by Category</h3>
          <div className="mts-chart-wrapper" style={{ height: 260 }}>
            {typeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={typeData.slice(0, 8)} layout="vertical" margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#475569" }} width={100} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }} />
                  <Bar dataKey="value" fill="#2563eb" radius={[0, 6, 6, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div style={{ textAlign: "center", color: "var(--brand-text-muted)", padding: 40 }}>No categories found</div>}
          </div>
        </div>
        <div className="mts-chart-card">
          <h3 className="mts-chart-title">Products by Vendor</h3>
          <div className="mts-chart-wrapper" style={{ height: 260 }}>
            {vendorData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={vendorData} margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }} />
                  <Bar dataKey="value" fill="#7c3aed" radius={[6, 6, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div style={{ textAlign: "center", color: "var(--brand-text-muted)", padding: 40 }}>No vendor data found</div>}
          </div>
        </div>
      </div>

      <div className="mts-table-card">
        <div className="mts-table-header">
          <h3 className="mts-table-title">All Products</h3>
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--brand-border)", fontSize: 13, width: 220, outline: "none" }}
          />
        </div>
        <table className="mts-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Type</th>
              <th>Vendor</th>
              <th style={{ textAlign: "center" }}>Status</th>
              <th style={{ textAlign: "right" }}>Inventory</th>
              <th style={{ textAlign: "right" }}>Value</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: "40px 24px", textAlign: "center", color: "var(--brand-text-muted)" }}>No products found</td></tr>
            ) : filtered.map((p) => (
              <tr key={p.id} onClick={() => setSelected(p)} style={{ cursor: "pointer" }}>
                <td style={{ fontWeight: 600 }}>{p.title}</td>
                <td>{p.productType || "-"}</td>
                <td>{p.vendor || "-"}</td>
                <td style={{ textAlign: "center" }}><span className={`mts-badge ${p.status.toLowerCase()}`}>{p.status}</span></td>
                <td style={{ textAlign: "right" }}>{p.totalInventory}</td>
                <td style={{ textAlign: "right", fontWeight: 600 }}>${p.totalValue.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }} onClick={() => setSelected(null)}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 640, maxHeight: "80vh", overflow: "auto", boxShadow: "0 25px 50px rgba(0,0,0,0.25)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--brand-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{selected.title}</h3>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--brand-text-muted)" }}>&times;</button>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                <div><div className="mts-kpi-label">Type</div><div style={{ fontWeight: 500 }}>{selected.productType || "Uncategorized"}</div></div>
                <div><div className="mts-kpi-label">Vendor</div><div style={{ fontWeight: 500 }}>{selected.vendor || "Unknown"}</div></div>
                <div><div className="mts-kpi-label">Status</div><span className={`mts-badge ${selected.status.toLowerCase()}`}>{selected.status}</span></div>
                <div><div className="mts-kpi-label">Total Value</div><div style={{ fontWeight: 600, fontSize: 18 }}>${selected.totalValue.toFixed(2)}</div></div>
              </div>
              <h4 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 600 }}>Variants ({selected.variants.length})</h4>
              <table className="mts-table">
                <thead><tr><th>Variant</th><th>SKU</th><th style={{ textAlign: "right" }}>Price</th><th style={{ textAlign: "right" }}>Stock</th></tr></thead>
                <tbody>
                  {selected.variants.map((v) => (
                    <tr key={v.id}>
                      <td>{v.title}</td>
                      <td style={{ color: "var(--brand-text-muted)" }}>{v.sku || "-"}</td>
                      <td style={{ textAlign: "right" }}>${v.price.toFixed(2)}</td>
                      <td style={{ textAlign: "right" }}><span className={`mts-badge ${v.inventory <= 0 ? "out-of-stock" : v.inventory <= 5 ? "low-stock" : "active"}`}>{v.inventory}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const headers: HeadersFunction = (headersArgs) => boundary.headers(headersArgs);
