import { Box, Layout, Text, Card, Banner, Badge, Button, TextField, Spinner, BlockStack } from "@shopify/polaris";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
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
  const { authenticate } = await import("~/shopify.server");
  const { getFullAnalytics } = await import("~/lib/analytics.server");
  const { forecastRevenue } = await import("~/lib/forecast.server");
  const { default: prisma } = await import("~/db.server");

  const { session } = await authenticate.admin(request);
  const shopId = session.shop;

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const analytics = await getFullAnalytics(shopId, {
    startDate,
    endDate,
    label: "Last 30 Days",
  });

  const forecast = forecastRevenue(analytics.salesChart, 30);

  const insights = await prisma.aiInsight.findMany({
    where: { shopId, insightType: "chat" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const brief = await prisma.aiInsight.findFirst({
    where: { shopId, insightType: "daily_brief" },
    orderBy: { createdAt: "desc" },
  });

  return {
    analytics,
    forecast,
    insights: insights.map((i) => ({
      id: i.id,
      question: i.question,
      answer: i.answer,
      createdAt: i.createdAt.toISOString(),
    })),
    dailyBrief: brief?.answer || null,
    hasOpenAiKey: !!(typeof process !== "undefined" && process.env?.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "your_openai_api_key_here"),
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const { authenticate } = await import("~/shopify.server");
  const { getFullAnalytics } = await import("~/lib/analytics.server");
  const { generateAiInsight } = await import("~/lib/ai.server");
  const { default: prisma } = await import("~/db.server");

  const { session } = await authenticate.admin(request);
  const shopId = session.shop;
  const formData = await request.formData();
  const question = formData.get("question") as string;

  if (!question) {
    return { error: "Please enter a question" };
  }

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const analytics = await getFullAnalytics(shopId, {
    startDate,
    endDate,
    label: "Last 30 Days",
  });

  const context = {
    shopId,
    dateRange: {
      start: startDate.toISOString().split("T")[0],
      end: endDate.toISOString().split("T")[0],
    },
    kpis: {
      revenue: {
        current: parseFloat(analytics.revenue.value.replace(/[$,]/g, "")) || 0,
        previous: 0,
        change: analytics.revenue.change,
      },
      orders: {
        current: parseInt(analytics.orders.value.replace(/,/g, "")) || 0,
        previous: 0,
        change: analytics.orders.change,
      },
      aov: {
        current: parseFloat(analytics.averageOrderValue.value.replace(/[$,]/g, "")) || 0,
        change: analytics.averageOrderValue.change,
      },
      customers: {
        new: parseInt(analytics.customers.value.replace(/,/g, "")) || 0,
        returning: 0,
      },
      repeatRate: parseFloat(analytics.repeatRate.value.replace("%", "")) || 0,
    },
    topProducts: analytics.topProducts.map((p) => ({
      title: p.title,
      revenue: p.revenue,
      quantity: p.quantity,
      trend: p.trend,
    })),
    salesTrend: analytics.salesChart.map((s) => ({
      date: s.date,
      revenue: s.revenue,
    })),
  };

  const answer = await generateAiInsight(context, question);

  await prisma.aiInsight.create({
    data: {
      shopId,
      insightType: "chat",
      question,
      answer,
      data: JSON.stringify(context.kpis),
    },
  });

  return { answer, question };
}

export default function InsightsPage() {
  const { analytics, forecast, insights, dailyBrief, hasOpenAiKey } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [question, setQuestion] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isSubmitting = fetcher.state === "submitting";
  const latestAnswer = fetcher.data?.answer;
  const latestQuestion = fetcher.data?.question;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [latestAnswer, insights.length]);

  const handleSubmit = () => {
    if (!question.trim() || isSubmitting) return;
    fetcher.submit({ question: question.trim() }, { method: "POST" });
    setQuestion("");
  };

  const forecastChart = [
    ...analytics.salesChart.slice(-14).map((d) => ({
      date: d.date,
      actual: d.revenue,
      forecast: null as number | null,
      lower: null as number | null,
      upper: null as number | null,
    })),
    ...forecast.map((f) => ({
      date: f.date,
      actual: null as number | null,
      forecast: f.forecast,
      lower: f.lowerBound,
      upper: f.upperBound,
    })),
  ];

  return (
    <Box padding="400">
      <Layout>
        <Layout.Section>
          <BlockStack spacing="400">
            <div>
              <Text variant="headingXl" as="h1">AI Business Insights</Text>
              <Text variant="bodyMd" as="p" color="subdued">
                Ask questions about your business data and get AI-powered answers
              </Text>
            </div>

            {!hasOpenAiKey && (
              <Banner status="warning" title="OpenAI API Key Required">
                <p>
                  Set your OpenAI API key in Settings to enable AI-powered insights.
                  The app will use rule-based analytics as a fallback.
                </p>
              </Banner>
            )}

            {dailyBrief && (
              <Card>
                <Box padding="400">
                  <BlockStack spacing="200">
                    <BlockStack distribution="spaceBetween" alignment="center">
                      <Text variant="headingLg" as="h2">Today's Business Brief</Text>
                      <Badge tone="info">AI Generated</Badge>
                    </BlockStack>
                    <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                      {dailyBrief}
                    </div>
                  </BlockStack>
                </Box>
              </Card>
            )}

            <Card>
              <Box padding="400">
                <BlockStack spacing="300">
                  <Text variant="headingLg" as="h2">Revenue Forecast (Next 30 Days)</Text>
                  <div style={{ width: "100%", height: 300 }}>
                    <ResponsiveContainer>
                      <AreaChart data={forecastChart}>
                        <defs>
                          <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#503ceb" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#503ceb" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4bb550" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#4bb550" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E1E3E5" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                        <Tooltip
                          formatter={(value: number | null, name: string) => [
                            value !== null ? `$${value.toFixed(2)}` : "N/A",
                            name === "actual" ? "Actual" : name === "forecast" ? "Forecast" : name === "lower" ? "Lower Bound" : "Upper Bound",
                          ]}
                        />
                        <ReferenceLine
                          x={analytics.salesChart.length > 0 ? analytics.salesChart[analytics.salesChart.length - 1]?.date : ""}
                          stroke="#666"
                          strokeDasharray="3 3"
                          label={{ value: "Today", position: "top", fontSize: 11 }}
                        />
                        <Area type="monotone" dataKey="actual" stroke="#503ceb" strokeWidth={2} fill="url(#colorActual)" />
                        <Area type="monotone" dataKey="forecast" stroke="#4bb550" strokeWidth={2} strokeDasharray="5 5" fill="url(#colorForecast)" />
                        <Area type="monotone" dataKey="lower" stroke="#ccc" strokeWidth={1} fill="none" strokeDasharray="3 3" />
                        <Area type="monotone" dataKey="upper" stroke="#ccc" strokeWidth={1} fill="none" strokeDasharray="3 3" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </BlockStack>
              </Box>
            </Card>

            <Card>
              <Box padding="400">
                <BlockStack spacing="300">
                  <Text variant="headingLg" as="h2">Ask AI Assistant</Text>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
                    {SUGGESTED_QUESTIONS.map((q) => (
                      <Button key={q} size="slim" onClick={() => setQuestion(q)}>
                        {q}
                      </Button>
                    ))}
                  </div>

                  <div
                    style={{
                      border: "1px solid #E1E3E5",
                      borderRadius: "8px",
                      padding: "16px",
                      maxHeight: "400px",
                      overflowY: "auto",
                    }}
                  >
                    {insights.length === 0 && !latestAnswer && (
                      <div style={{ textAlign: "center", color: "#6D7175", padding: "20px" }}>
                        No conversations yet. Ask a question about your business!
                      </div>
                    )}

                    {insights.map((insight) => (
                      <div key={insight.id} style={{ marginBottom: "16px" }}>
                        <div style={{ marginBottom: "4px" }}>
                          <Badge tone="info">You</Badge>
                          <span style={{ marginLeft: "8px", fontSize: "14px" }}>{insight.question}</span>
                        </div>
                        <div style={{ marginLeft: "8px", paddingLeft: "12px", borderLeft: "2px solid #503ceb" }}>
                          <Badge tone="success">AI</Badge>
                          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, marginTop: "4px", fontSize: "14px" }}>
                            {insight.answer}
                          </div>
                        </div>
                      </div>
                    ))}

                    {latestAnswer && latestQuestion && (
                      <div style={{ marginBottom: "16px" }}>
                        <div style={{ marginBottom: "4px" }}>
                          <Badge tone="info">You</Badge>
                          <span style={{ marginLeft: "8px", fontSize: "14px" }}>{latestQuestion}</span>
                        </div>
                        <div style={{ marginLeft: "8px", paddingLeft: "12px", borderLeft: "2px solid #503ceb" }}>
                          <Badge tone="success">AI</Badge>
                          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, marginTop: "4px", fontSize: "14px" }}>
                            {latestAnswer}
                          </div>
                        </div>
                      </div>
                    )}

                    {isSubmitting && (
                      <div style={{ padding: "12px", textAlign: "center" }}>
                        <Spinner size="small" />
                        <span style={{ marginLeft: "8px", color: "#6D7175" }}>Analyzing your data...</span>
                      </div>
                    )}

                    <div ref={chatEndRef} />
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <TextField
                      value={question}
                      onChange={setQuestion}
                      placeholder="Ask about your sales, products, customers..."
                      disabled={isSubmitting}
                      autoComplete="off"
                    />
                    <Button
                      primary
                      onClick={handleSubmit}
                      disabled={!question.trim() || isSubmitting}
                      loading={isSubmitting}
                    >
                      Ask
                    </Button>
                  </div>
                </BlockStack>
              </Box>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Box>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
