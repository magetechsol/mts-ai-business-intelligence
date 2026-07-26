import { useState } from "react";
import { useLoaderData, useFetcher } from "react-router";
import type { HeadersFunction, LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { authenticate } = await import("~/shopify.server");
    const { default: prisma } = await import("~/db.server");
    const { session } = await authenticate.admin(request);
    const shopId = session.shop;
    const settings = await prisma.appSettings.findUnique({ where: { shopId } });
    return {
      shopId, shopName: session.shop,
      openaiKey: settings?.openaiKey || "",
      syncEnabled: settings?.syncEnabled ?? true,
      lastSyncAt: settings?.lastSyncAt?.toISOString() || null,
      isSample: false,
    };
  } catch (err: any) {
    if (err instanceof Response) return err;
    return { shopId: "demo", shopName: "demo.myshopify.com", openaiKey: "", syncEnabled: true, lastSyncAt: null, isSample: true };
  }
}

export async function action({ request }: ActionFunctionArgs) {
  try {
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
  } catch (e: any) {
    if (e instanceof Response) return e;
    console.error("Settings action error:", e?.message || e);
    return { error: "Authentication failed. Please refresh and try again." };
  }
}

export default function SettingsPage() {
  const { shopName, openaiKey, lastSyncAt, isSample } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [key, setKey] = useState(openaiKey);
  const isSubmitting = fetcher.state === "submitting";
  const result = fetcher.data;

  return (
    <div className="mts-page">
      <div className="mts-page-header">
        <h1 className="mts-page-title">Settings</h1>
        <p className="mts-page-subtitle">Configure your MTS AI Business Intelligence app</p>
        {isSample && (
          <div style={{ marginTop: 12, padding: "10px 16px", borderRadius: 8, background: "rgba(37, 99, 235, 0.06)", border: "1px solid rgba(37, 99, 235, 0.15)", fontSize: 13, color: "var(--brand-primary-dark)" }}>
            <strong>Demo Mode</strong> &mdash; Re-authenticate your app in Shopify admin to connect your store.
          </div>
        )}
      </div>

      <div className="mts-two-col-equal">
        <div className="mts-chart-card">
          <h3 className="mts-chart-title">Store Information</h3>
          <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
            <div>
              <div className="mts-kpi-label">Store Domain</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{shopName}</div>
            </div>
            <div>
              <div className="mts-kpi-label">Last Sync</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{lastSyncAt ? new Date(lastSyncAt).toLocaleString() : "Never"}</div>
            </div>
            <div>
              <div className="mts-kpi-label">App Version</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>1.0.0</div>
            </div>
          </div>
        </div>

        <div className="mts-chart-card">
          <h3 className="mts-chart-title">About MTS AI Business Intelligence</h3>
          <p style={{ fontSize: 14, color: "var(--brand-text-muted)", lineHeight: 1.6, marginTop: 12 }}>
            MTS AI Business Intelligence provides intelligent analytics, AI-powered insights, and actionable recommendations to help you grow your Shopify store.
          </p>
          <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {["Sales Analytics", "Product Performance", "Customer Insights", "Inventory Health", "Revenue Forecasting", "AI Assistant"].map((f) => (
              <span key={f} className="mts-badge active">{f}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="mts-chart-card">
        <h3 className="mts-chart-title">Data Sync</h3>
        <p className="mts-chart-subtitle">Sync your store data to enable analytics. This will fetch orders, products, and customers from the last 30 days.</p>
        <fetcher.Form method="POST" style={{ marginTop: 16 }}>
          <input type="hidden" name="intent" value="sync" />
          <button type="submit" disabled={isSubmitting}
            style={{ padding: "10px 24px", borderRadius: "var(--brand-radius-sm)", background: "var(--brand-gradient)", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.6 : 1 }}>
            {isSubmitting ? "Syncing..." : "Sync Now"}
          </button>
        </fetcher.Form>
        {result?.success && result.message?.includes("Synced") && (
          <div style={{ marginTop: 16, padding: "10px 16px", borderRadius: 8, background: "rgba(5, 150, 105, 0.06)", border: "1px solid rgba(5, 150, 105, 0.15)", fontSize: 13, color: "var(--brand-success)" }}>
            <strong>Sync Complete</strong> &mdash; {result.message}
          </div>
        )}
        {result?.error && (
          <div style={{ marginTop: 16, padding: "10px 16px", borderRadius: 8, background: "rgba(220, 38, 38, 0.06)", border: "1px solid rgba(220, 38, 38, 0.15)", fontSize: 13, color: "var(--brand-danger)" }}>
            <strong>Error</strong> &mdash; {result.error}
          </div>
        )}
      </div>

      <div className="mts-chart-card">
        <h3 className="mts-chart-title">OpenAI API Configuration</h3>
        <p className="mts-chart-subtitle">Enter your OpenAI API key to enable AI-powered insights. The app uses rule-based analytics as a fallback if no key is provided.</p>
        <fetcher.Form method="POST" style={{ marginTop: 16 }}>
          <input type="hidden" name="intent" value="save" />
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--brand-text-muted)", marginBottom: 8 }}>OpenAI API Key</label>
            <input type="password" name="openaiKey" value={key} onChange={(e) => setKey(e.target.value)}
              placeholder="sk-..."
              style={{ width: "100%", padding: "10px 14px", borderRadius: "var(--brand-radius-sm)", border: "1px solid var(--brand-border)", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            <p style={{ fontSize: 12, color: "var(--brand-text-muted)", marginTop: 6 }}>Your API key is stored securely and only used for generating insights.</p>
          </div>
          <button type="submit" disabled={isSubmitting}
            style={{ padding: "10px 24px", borderRadius: "var(--brand-radius-sm)", background: "var(--brand-gradient)", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.6 : 1 }}>
            Save Settings
          </button>
        </fetcher.Form>
        {result?.success && result.message === "Settings saved" && (
          <div style={{ marginTop: 16, padding: "10px 16px", borderRadius: 8, background: "rgba(5, 150, 105, 0.06)", border: "1px solid rgba(5, 150, 105, 0.15)", fontSize: 13, color: "var(--brand-success)" }}>
            <strong>Settings Saved</strong> &mdash; Your settings have been updated successfully.
          </div>
        )}
      </div>
    </div>
  );
}

export const headers: HeadersFunction = (headersArgs) => boundary.headers(headersArgs);
