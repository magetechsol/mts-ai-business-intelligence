import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { useState, useRef, useEffect } from "react";
import { useLoaderData, useFetcher } from "react-router";
import type { HeadersFunction, LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

const SUGGESTED_QUESTIONS = [
  "Which products generated the most revenue this month?",
  "Why did sales decrease compared to last month?",
  "What are my top customer segments?",
  "How is my inventory looking?",
  "What should I do to increase repeat purchases?",
  "Predict my revenue for next month",
  "Which products are declining in sales?",
  "What marketing actions should I take?",
];

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { authenticate } = await import("~/shopify.server");
    const { getShopPlan } = await import("~/lib/billing.server");
    const authResult = await authenticate.admin(request);
    if (authResult instanceof Response) throw authResult;
    const { session } = authResult;
    const shopId = session.shop;
    const planInfo = await getShopPlan(shopId);
    if (planInfo.isFree) {
      return { analytics: null, forecast: [], insights: [], dailyBrief: null, hasOpenAiKey: false, isSample: false, isPro: false };
    }
    const { getFullAnalytics } = await import("~/lib/analytics.server");
    const { forecastRevenue } = await import("~/lib/forecast.server");
    const { default: prisma } = await import("~/db.server");
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const analytics = await getFullAnalytics(shopId, { startDate, endDate, label: "Last 30 Days" });
    const forecast = forecastRevenue(analytics.salesChart, 30);
    const insights = await prisma.aiInsight.findMany({
      where: { shopId, insightType: "chat" }, orderBy: { createdAt: "desc" }, take: 50,
    });
    const brief = await prisma.aiInsight.findFirst({
      where: { shopId, insightType: "daily_brief" }, orderBy: { createdAt: "desc" },
    });
    return {
      analytics, forecast,
      insights: insights.map((i) => ({ id: i.id, question: i.question, answer: i.answer, createdAt: i.createdAt.toISOString() })),
      dailyBrief: brief?.answer || null,
      hasOpenAiKey: !!(typeof process !== "undefined" && process.env?.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "your_openai_api_key_here"),
      isSample: false, isPro: true,
    };
  } catch (err: any) {
    if (err instanceof Response) throw err;
    const { getSampleAnalytics } = await import("~/lib/sampleData");
    const sampleAnalytics = getSampleAnalytics();
    const { forecastRevenue } = await import("~/lib/forecast.server");
    const forecast = forecastRevenue(sampleAnalytics.salesChart, 30);
    return { analytics: sampleAnalytics, forecast, insights: [], dailyBrief: null, hasOpenAiKey: false, isSample: true, isPro: true };
  }
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { authenticate } = await import("~/shopify.server");
    const { getFullAnalytics } = await import("~/lib/analytics.server");
    const { generateAiInsight } = await import("~/lib/ai.server");
    const { default: prisma } = await import("~/db.server");
    const authActionResult = await authenticate.admin(request);
    if (authActionResult instanceof Response) return authActionResult;
    const { session } = authActionResult;
    const shopId = session.shop;
    const formData = await request.formData();
    const question = formData.get("question") as string;
    if (!question) return { error: "Please enter a question" };
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const analytics = await getFullAnalytics(shopId, { startDate, endDate, label: "Last 30 Days" });
    const context = {
      shopId,
      dateRange: { start: startDate.toISOString().split("T")[0], end: endDate.toISOString().split("T")[0] },
      kpis: {
        revenue: { current: parseFloat(analytics.revenue.value.replace(/[$,]/g, "")) || 0, previous: 0, change: analytics.revenue.change },
        orders: { current: parseInt(analytics.orders.value.replace(/,/g, "")) || 0, previous: 0, change: analytics.orders.change },
        aov: { current: parseFloat(analytics.averageOrderValue.value.replace(/[$,]/g, "")) || 0, change: analytics.averageOrderValue.change },
        customers: { new: parseInt(analytics.customers.value.replace(/,/g, "")) || 0, returning: 0 },
        repeatRate: parseFloat(analytics.repeatRate.value.replace("%", "")) || 0,
      },
      topProducts: analytics.topProducts.map((p) => ({ title: p.title, revenue: p.revenue, quantity: p.quantity, trend: p.trend })),
      salesTrend: analytics.salesChart.map((s) => ({ date: s.date, revenue: s.revenue })),
    };
    const answer = await generateAiInsight(context, question);
    await prisma.aiInsight.create({
      data: { shopId, insightType: "chat", question, answer, data: JSON.stringify(context.kpis) },
    });
    return { answer, question };
  } catch (e: any) {
    if (e instanceof Response) return e;
    console.error("Insights action error:", e?.message || e);
    return { error: "Authentication failed. Please refresh and try again." };
  }
}

export default function InsightsPage() {
  const { analytics, forecast, insights, dailyBrief, hasOpenAiKey, isSample, isPro } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [question, setQuestion] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isSubmitting = fetcher.state === "submitting";
  const latestAnswer = fetcher.data?.answer;
  const latestQuestion = fetcher.data?.question;

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [latestAnswer, insights.length]);

  const handleSubmit = () => {
    if (!question.trim() || isSubmitting) return;
    fetcher.submit({ question: question.trim() }, { method: "POST" });
    setQuestion("");
  };

  const forecastChart = analytics ? [
    ...analytics.salesChart.slice(-14).map((d) => ({ date: d.date, actual: d.revenue, forecast: null as number | null, lower: null as number | null, upper: null as number | null })),
    ...forecast.map((f) => ({ date: f.date, actual: null as number | null, forecast: f.forecast, lower: f.lowerBound, upper: f.upperBound })),
  ] : [];

  return (
    <div className="mts-page">
      <div className="mts-page-header">
        <h1 className="mts-page-title">AI Business Insights</h1>
        <p className="mts-page-subtitle">Ask questions about your business data and get AI-powered answers</p>
        {isSample && (
          <div style={{ marginTop: 12, padding: "10px 16px", borderRadius: 8, background: "rgba(37, 99, 235, 0.06)", border: "1px solid rgba(37, 99, 235, 0.15)", fontSize: 13, color: "var(--brand-primary-dark)" }}>
            <strong>Demo Mode</strong> &mdash; Showing sample data. Connect your Shopify store via Settings to see live analytics.
          </div>
        )}
        {!isPro && (
          <div style={{ marginTop: 12, padding: "16px 20px", borderRadius: 8, background: "linear-gradient(135deg, rgba(37, 99, 235, 0.06), rgba(124, 58, 237, 0.06))", border: "1px solid rgba(37, 99, 235, 0.15)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, color: "var(--brand-text)" }}>Upgrade to Pro</div>
                <div style={{ fontSize: 13, color: "var(--brand-text-muted)", marginTop: 4 }}>Unlock AI-powered insights, revenue forecasting, and natural language queries for $29/mo</div>
              </div>
              <a href="/app/pricing" target="_top" style={{ padding: "8px 20px", borderRadius: 8, background: "var(--brand-gradient)", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none", flexShrink: 0 }}>View Plans</a>
            </div>
          </div>
        )}
        {!hasOpenAiKey && (
          <div style={{ marginTop: 12, padding: "10px 16px", borderRadius: 8, background: "rgba(217, 119, 6, 0.06)", border: "1px solid rgba(217, 119, 6, 0.15)", fontSize: 13, color: "var(--brand-warning)" }}>
            <strong>OpenAI API Key Required</strong> &mdash; Set your OpenAI API key in Settings to enable AI-powered insights. The app uses rule-based analytics as a fallback.
          </div>
        )}
      </div>

      {isPro ? (<>
      {dailyBrief && (
        <div className="mts-chart-card" style={{ borderLeft: "4px solid var(--brand-primary)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 className="mts-chart-title">Today's Business Brief</h3>
            <span className="mts-badge active">AI Generated</span>
          </div>
          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, fontSize: 14, color: "var(--brand-text)" }}>{dailyBrief}</div>
        </div>
      )}

      <div className="mts-chart-card">
        <h3 className="mts-chart-title">Revenue Forecast (Next 30 Days)</h3>
        <p className="mts-chart-subtitle">Actual vs predicted revenue with confidence bounds</p>
        <div className="mts-chart-wrapper" style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={forecastChart}>
              <defs>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => v.slice(5)} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `$${v}`} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }}
                formatter={(value: number | null, name: string) => [
                  value !== null ? `$${value.toFixed(2)}` : "N/A",
                  name === "actual" ? "Actual" : name === "forecast" ? "Forecast" : name === "lower" ? "Lower Bound" : "Upper Bound",
                ]}
              />
              <ReferenceLine
                x={analytics && analytics.salesChart.length > 0 ? analytics.salesChart[analytics.salesChart.length - 1]?.date : ""}
                stroke="#94a3b8" strokeDasharray="3 3" label={{ value: "Today", position: "top", fontSize: 11, fill: "#94a3b8" }}
              />
              <Area type="monotone" dataKey="actual" stroke="#2563eb" strokeWidth={2.5} fill="url(#colorActual)" />
              <Area type="monotone" dataKey="forecast" stroke="#059669" strokeWidth={2} strokeDasharray="5 5" fill="url(#colorForecast)" />
              <Area type="monotone" dataKey="lower" stroke="#cbd5e1" strokeWidth={1} fill="none" strokeDasharray="3 3" />
              <Area type="monotone" dataKey="upper" stroke="#cbd5e1" strokeWidth={1} fill="none" strokeDasharray="3 3" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mts-chart-card">
        <h3 className="mts-chart-title">Ask AI Assistant</h3>
        <p className="mts-chart-subtitle">Select a suggested question or type your own</p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {SUGGESTED_QUESTIONS.map((q) => (
            <button key={q} onClick={() => setQuestion(q)}
              style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid var(--brand-border)", background: "var(--brand-surface)", fontSize: 12, cursor: "pointer", color: "var(--brand-text)", transition: "all 0.15s ease" }}>
              {q}
            </button>
          ))}
        </div>

        <div style={{ border: "1px solid var(--brand-border)", borderRadius: "var(--brand-radius-sm)", padding: 16, maxHeight: 400, overflowY: "auto", background: "var(--brand-surface)", marginBottom: 16 }}>
          {insights.length === 0 && !latestAnswer && (
            <div style={{ textAlign: "center", color: "var(--brand-text-muted)", padding: 20, fontSize: 14 }}>No conversations yet. Ask a question about your business!</div>
          )}
          {insights.map((insight) => (
            <div key={insight.id} style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 4 }}>
                <span className="mts-badge active" style={{ marginRight: 8 }}>You</span>
                <span style={{ fontSize: 14 }}>{insight.question}</span>
              </div>
              <div style={{ marginLeft: 8, paddingLeft: 12, borderLeft: "3px solid var(--brand-primary)" }}>
                <span className="mts-badge" style={{ background: "rgba(124, 58, 237, 0.1)", color: "var(--brand-accent)", marginBottom: 4 }}>AI</span>
                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, marginTop: 4, fontSize: 14 }}>{insight.answer}</div>
              </div>
            </div>
          ))}
          {latestAnswer && latestQuestion && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 4 }}>
                <span className="mts-badge active" style={{ marginRight: 8 }}>You</span>
                <span style={{ fontSize: 14 }}>{latestQuestion}</span>
              </div>
              <div style={{ marginLeft: 8, paddingLeft: 12, borderLeft: "3px solid var(--brand-primary)" }}>
                <span className="mts-badge" style={{ background: "rgba(124, 58, 237, 0.1)", color: "var(--brand-accent)", marginBottom: 4 }}>AI</span>
                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, marginTop: 4, fontSize: 14 }}>{latestAnswer}</div>
              </div>
            </div>
          )}
          {isSubmitting && (
            <div style={{ padding: 12, textAlign: "center", color: "var(--brand-text-muted)", fontSize: 14 }}>
              <span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid var(--brand-border)", borderTopColor: "var(--brand-primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite", marginRight: 8, verticalAlign: "middle" }} />
              Analyzing your data...
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Ask about your sales, products, customers..."
            disabled={isSubmitting}
            style={{ flex: 1, padding: "10px 14px", borderRadius: "var(--brand-radius-sm)", border: "1px solid var(--brand-border)", fontSize: 14, outline: "none" }} />
          <button onClick={handleSubmit} disabled={!question.trim() || isSubmitting}
            style={{ padding: "10px 24px", borderRadius: "var(--brand-radius-sm)", background: "var(--brand-gradient)", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: question.trim() && !isSubmitting ? "pointer" : "not-allowed", opacity: question.trim() && !isSubmitting ? 1 : 0.6 }}>
            {isSubmitting ? "Asking..." : "Ask"}
          </button>
        </div>
      </div>
      </>) : (
        <div className="mts-chart-card" style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>&#128269;</div>
          <h3 style={{ fontSize: 20, fontWeight: 600, color: "var(--brand-text)", margin: "0 0 8px" }}>Pro Feature</h3>
          <p style={{ fontSize: 14, color: "var(--brand-text-muted)", marginBottom: 20 }}>Upgrade to Pro to access AI-powered insights, revenue forecasting, and business intelligence.</p>
          <a href="/app/pricing" target="_top" style={{ display: "inline-block", padding: "12px 28px", borderRadius: 8, background: "var(--brand-gradient)", color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>View Plans</a>
        </div>
      )}
    </div>
  );
}

export const headers: HeadersFunction = (headersArgs) => boundary.headers(headersArgs);
