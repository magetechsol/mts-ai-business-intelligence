import { useLoaderData } from "react-router";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

const FREE_FEATURES = ["Dashboard Overview", "Basic Sales Analytics", "Settings & Data Sync"];
const PRO_FEATURES = ["Advanced Product Analytics", "Customer Segmentation", "Inventory Health Monitoring", "AI-Powered Business Insights", "Revenue Forecasting", "Data Export"];
const FREE_PLAN = "free";
const PRO_PLAN = "pro_monthly";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { authenticate } = await import("~/shopify.server");
    const { default: prisma } = await import("~/db.server");
    const { session } = await authenticate.admin(request);
    const shopId = session.shop;
    const settings = await prisma.appSettings.findUnique({ where: { shopId } });
    const currentPlan = settings?.plan || FREE_PLAN;
    const billingStatus = settings?.billingStatus || "active";

    let pricingUrl = "";
    try {
      const { admin } = await authenticate.admin(request);
      const response = await admin.graphql(
        `query { currentAppInstallation { id app { handle } } }`
      );
      const { data } = await response.json() as any;
      const appHandle = data?.currentAppInstallation?.app?.handle || "mts-ai-business-intelligence";
      pricingUrl = `https://admin.shopify.com/store/${shopId}/charges/${appHandle}/pricing_plans`;
    } catch {
      pricingUrl = "#";
    }

    return {
      currentPlan,
      billingStatus,
      pricingUrl,
      freeFeatures: [...FREE_FEATURES],
      proFeatures: [...PRO_FEATURES],
    };
  } catch {
    return {
      currentPlan: FREE_PLAN,
      billingStatus: "active",
      pricingUrl: "#",
      freeFeatures: [...FREE_FEATURES],
      proFeatures: [...PRO_FEATURES],
    };
  }
}

export default function PricingPage() {
  const { currentPlan, billingStatus, pricingUrl, freeFeatures, proFeatures } = useLoaderData<typeof loader>();
  const isPro = currentPlan === PRO_PLAN;

  return (
    <div className="mts-page">
      <div className="mts-page-header" style={{ textAlign: "center" }}>
        <h1 className="mts-page-title">Choose Your Plan</h1>
        <p className="mts-page-subtitle">Unlock the full power of MTS AI Business Intelligence</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 800, margin: "0 auto" }}>
        <div className="mts-chart-card" style={{ position: "relative" }}>
          {isPro && (
            <div style={{ position: "absolute", top: 16, right: 16 }}>
              <span className="mts-badge active">Current Plan</span>
            </div>
          )}
          <div style={{ marginBottom: 20 }}>
            <h3 className="mts-chart-title" style={{ fontSize: 20 }}>Free</h3>
            <div style={{ fontSize: 36, fontWeight: 700, color: "var(--brand-text)", marginTop: 8 }}>$0</div>
            <div style={{ fontSize: 13, color: "var(--brand-text-muted)" }}>forever</div>
          </div>
          <div style={{ borderTop: "1px solid var(--brand-border)", paddingTop: 20 }}>
            {freeFeatures.map((f) => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 14 }}>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="var(--brand-success)"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                {f}
              </div>
            ))}
          </div>
          {!isPro && (
            <div style={{ marginTop: 20, padding: "8px 16px", borderRadius: 8, background: "var(--brand-surface)", textAlign: "center", fontSize: 13, color: "var(--brand-text-muted)", fontWeight: 600 }}>
              You are on this plan
            </div>
          )}
        </div>

        <div className="mts-chart-card" style={{ position: "relative", border: "2px solid var(--brand-primary)" }}>
          {!isPro && (
            <div style={{ position: "absolute", top: -1, left: 0, right: 0, height: 3, borderRadius: "12px 12px 0 0", background: "var(--brand-gradient)" }} />
          )}
          {isPro && (
            <div style={{ position: "absolute", top: 16, right: 16 }}>
              <span className="mts-badge active">Current Plan</span>
            </div>
          )}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h3 className="mts-chart-title" style={{ fontSize: 20 }}>Pro</h3>
              <span className="mts-badge active" style={{ fontSize: 10 }}>RECOMMENDED</span>
            </div>
            <div style={{ fontSize: 36, fontWeight: 700, color: "var(--brand-text)", marginTop: 8 }}>$29</div>
            <div style={{ fontSize: 13, color: "var(--brand-text-muted)" }}>per month</div>
          </div>
          <div style={{ borderTop: "1px solid var(--brand-border)", paddingTop: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--brand-text-muted)", marginBottom: 12 }}>
              Everything in Free, plus:
            </div>
            {proFeatures.map((f) => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 14 }}>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="var(--brand-primary)"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                {f}
              </div>
            ))}
          </div>
          {!isPro ? (
            <a
              href={pricingUrl}
              target="_top"
              style={{
                display: "block",
                marginTop: 20,
                padding: "12px 24px",
                borderRadius: "var(--brand-radius-sm)",
                background: "var(--brand-gradient)",
                color: "#fff",
                textAlign: "center",
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              Upgrade to Pro
            </a>
          ) : (
            <div style={{ marginTop: 20, padding: "8px 16px", borderRadius: 8, background: "rgba(5, 150, 105, 0.06)", textAlign: "center", fontSize: 13, color: "var(--brand-success)", fontWeight: 600 }}>
              Active Subscription
            </div>
          )}
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 40, fontSize: 13, color: "var(--brand-text-muted)", maxWidth: 600, margin: "40px auto 0" }}>
        <p>All plans include secure Shopify OAuth authentication, automatic data sync, and GDPR-compliant webhook handling.</p>
        <p style={{ marginTop: 8 }}>Billing is managed through Shopify. Cancel anytime from your Shopify admin.</p>
      </div>
    </div>
  );
}

export const headers: HeadersFunction = (headersArgs) => boundary.headers(headersArgs);
