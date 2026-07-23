import OpenAI from "openai";

let openai: OpenAI | null = null;

function getClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

interface AiContext {
  shopId: string;
  dateRange: { start: string; end: string };
  kpis: {
    revenue: { current: number; previous: number; change: number };
    orders: { current: number; previous: number; change: number };
    aov: { current: number; change: number };
    customers: { new: number; returning: number };
    repeatRate: number;
  };
  topProducts: Array<{ title: string; revenue: number; quantity: number; trend: string }>;
  salesTrend: Array<{ date: string; revenue: number }>;
  recentInsights?: string[];
}

const SYSTEM_PROMPT = `You are MTS AI Business Intelligence, an expert e-commerce analytics assistant for Shopify merchants. You analyze sales data, product performance, customer behavior, and inventory to provide actionable business insights.

When responding:
1. Be concise and merchant-friendly. Avoid technical jargon.
2. Always back up insights with specific numbers from the data.
3. Provide actionable recommendations the merchant can implement immediately.
4. Use bullet points for clarity.
5. If asked about trends, explain WHY they might be happening and what to do about it.
6. Format responses with clear headers and structure.
7. Always end with 1-3 specific action items.

You can analyze:
- Sales performance and revenue trends
- Product performance (best sellers, declining products)
- Customer behavior (new vs returning, lifetime value)
- Inventory health (low stock, overstock)
- Marketing effectiveness
- Revenue forecasting

If you don't have enough data to answer a question, say so clearly and suggest what data would help.`;

export async function generateAiInsight(
  context: AiContext,
  question: string
): Promise<string> {
  const client = getClient();

  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "your_openai_api_key_here") {
    return generateFallbackInsight(context, question);
  }

  const dataSummary = buildDataSummary(context);

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Here is the store analytics data:\n\n${dataSummary}\n\nMerchant's question: ${question}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 1500,
  });

  return response.choices[0]?.message?.content || "I couldn't generate an insight at this time. Please try again.";
}

export async function generateDailyBrief(context: AiContext): Promise<string> {
  const client = getClient();

  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "your_openai_api_key_here") {
    return generateFallbackDailyBrief(context);
  }

  const dataSummary = buildDataSummary(context);

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Generate a daily business brief for this Shopify merchant based on their analytics data:\n\n${dataSummary}\n\nProvide a brief executive summary (3-5 sentences) covering the most important metrics, any notable changes, and top 2 action items for today.`,
      },
    ],
    temperature: 0.7,
    max_tokens: 800,
  });

  return response.choices[0]?.message?.content || "Unable to generate daily brief at this time.";
}

function buildDataSummary(context: AiContext): string {
  const { kpis, topProducts, salesTrend, dateRange } = context;

  let summary = `Date Range: ${dateRange.start} to ${dateRange.end}\n\n`;

  summary += `KEY METRICS:\n`;
  summary += `- Revenue: $${kpis.revenue.current.toFixed(2)} (previous: $${kpis.revenue.previous.toFixed(2)}, change: ${kpis.revenue.change.toFixed(1)}%)\n`;
  summary += `- Orders: ${kpis.orders.current} (change: ${kpis.orders.change.toFixed(1)}%)\n`;
  summary += `- Average Order Value: $${kpis.aov.current.toFixed(2)} (change: ${kpis.aov.change.toFixed(1)}%)\n`;
  summary += `- New Customers: ${kpis.customers.new}\n`;
  summary += `- Returning Customers: ${kpis.customers.returning}\n`;
  summary += `- Repeat Purchase Rate: ${kpis.repeatRate.toFixed(1)}%\n\n`;

  if (topProducts.length > 0) {
    summary += `TOP PRODUCTS:\n`;
    topProducts.slice(0, 5).forEach((p, i) => {
      summary += `${i + 1}. ${p.title} - $${p.revenue.toFixed(2)} revenue, ${p.quantity} units, trend: ${p.trend}\n`;
    });
    summary += "\n";
  }

  if (salesTrend.length > 0) {
    summary += `SALES TREND (last ${salesTrend.length} days):\n`;
    const recentDays = salesTrend.slice(-7);
    recentDays.forEach((d) => {
      summary += `- ${d.date}: $${d.revenue.toFixed(2)}\n`;
    });

    if (salesTrend.length >= 14) {
      const thisWeek = salesTrend.slice(-7).reduce((s, d) => s + d.revenue, 0);
      const lastWeek = salesTrend.slice(-14, -7).reduce((s, d) => s + d.revenue, 0);
      const weekChange = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : 0;
      summary += `\nWeek-over-week change: ${weekChange.toFixed(1)}%\n`;
    }
  }

  return summary;
}

function generateFallbackInsight(context: AiContext, question: string): string {
  const q = question.toLowerCase();

  if (q.includes("revenue") && (q.includes("best") || q.includes("most") || q.includes("top"))) {
    const top = context.topProducts[0];
    if (top) {
      return `Based on your data from ${context.dateRange.start} to ${context.dateRange.end}:\n\n` +
        `**${top.title}** is your top revenue generator at $${top.revenue.toFixed(2)} with ${top.quantity} units sold.\n\n` +
        `**Action items:**\n` +
        `1. Consider featuring this product in marketing campaigns\n` +
        `2. Ensure adequate inventory levels\n` +
        `3. Create bundle offers with complementary products`;
    }
    return "I don't have enough product data yet. Please sync your store data first from the Settings page.";
  }

  if (q.includes("sales") && (q.includes("decrease") || q.includes("decline") || q.includes("drop") || q.includes("down"))) {
    const { revenue } = context.kpis;
    if (revenue.change < 0) {
      return `Your revenue has decreased by ${Math.abs(revenue.change).toFixed(1)}% compared to the previous period.\n\n` +
        `**Possible causes:**\n` +
        `- Seasonal fluctuations\n` +
        `- Reduced marketing spend\n` +
        `- Product availability issues\n` +
        `- Increased competition\n\n` +
        `**Recommended actions:**\n` +
        `1. Check if any top products went out of stock\n` +
        `2. Review recent marketing campaign performance\n` +
        `3. Compare with same period last year for seasonal patterns`;
    }
    return `Good news! Your revenue has actually increased by ${revenue.change.toFixed(1)}% compared to the previous period. Keep up the great work!`;
  }

  if (q.includes("customer") && (q.includes("trend") || q.includes("behavior") || q.includes("repeat"))) {
    const { customers, repeatRate } = context.kpis;
    return `**Customer Trends:**\n\n` +
      `- New customers this period: ${customers.new}\n` +
      `- Returning customers: ${customers.returning}\n` +
      `- Repeat purchase rate: ${repeatRate.toFixed(1)}%\n\n` +
      `**Insights:**\n` +
      (repeatRate < 20
        ? `Your repeat purchase rate of ${repeatRate.toFixed(1)}% is below the industry average of 25-30%. Consider implementing a loyalty program or post-purchase email campaigns.`
        : repeatRate > 40
        ? `Excellent! Your repeat purchase rate of ${repeatRate.toFixed(1)}% is above average. Your customer retention strategy is working well.`
        : `Your repeat purchase rate is moderate. Focus on follow-up emails, loyalty rewards, or personalized recommendations to increase retention.`) +
      `\n\n**Action items:**\n` +
      `1. Set up automated post-purchase email sequences\n` +
      `2. Create a VIP customer segment for targeted promotions\n` +
      `3. Review and improve product recommendation strategy`;
  }

  if (q.includes("product") && (q.includes("declin") || q.includes("worst") || q.includes("underperform"))) {
    const declining = context.topProducts.filter((p) => p.trend === "down");
    if (declining.length > 0) {
      return `**Declining Products:**\n\n` +
        declining.slice(0, 5).map((p) => `- **${p.title}**: $${p.revenue.toFixed(2)} revenue, trending down`).join("\n") +
        `\n\n**Recommended actions:**\n` +
        `1. Review pricing strategy for declining products\n` +
        `2. Consider promotional discounts to clear inventory\n` +
        `3. Analyze customer reviews for quality issues\n` +
        `4. Evaluate if these products need better marketing`;
    }
    return "No significantly declining products detected in this period. All products are performing within normal ranges.";
  }

  if (q.includes("forecast") || q.includes("predict") || q.includes("future") || q.includes("next month")) {
    const avgDaily = context.salesTrend.length > 0
      ? context.salesTrend.reduce((s, d) => s + d.revenue, 0) / context.salesTrend.length
      : context.kpis.revenue.current / 30;

    return `**Revenue Forecast (Next 30 Days):**\n\n` +
      `- Estimated daily revenue: $${avgDaily.toFixed(2)}\n` +
      `- Projected monthly revenue: $${(avgDaily * 30).toFixed(2)}\n` +
      `- Based on your current sales trend\n\n` +
      `**Note:** This is a simple trend-based forecast. Actual results may vary based on marketing campaigns, seasonality, and market conditions.\n\n` +
      `**Actions to improve forecast accuracy:**\n` +
      `1. Continue syncing data regularly\n` +
      `2. Note any planned promotions or events\n` +
      `3. Track seasonal patterns over multiple months`;
  }

  return `Based on your store data:\n\n` +
    `- Revenue: $${context.kpis.revenue.current.toFixed(2)} (${context.kpis.revenue.change >= 0 ? "+" : ""}${context.kpis.revenue.change.toFixed(1)}%)\n` +
    `- Orders: ${context.kpis.orders.current}\n` +
    `- Average Order Value: $${context.kpis.aov.current.toFixed(2)}\n` +
    `- Repeat Rate: ${context.kpis.repeatRate.toFixed(1)}%\n\n` +
    `Ask me specific questions about your sales, products, customers, or inventory for detailed insights!`;
}

function generateFallbackDailyBrief(context: AiContext): string {
  const { revenue, orders, aov, customers, repeatRate } = context.kpis;
  const trend = revenue.change >= 0 ? "up" : "down";

  return `**Daily Business Brief**\n\n` +
    `Revenue is ${trend} ${Math.abs(revenue.change).toFixed(1)}% at $${revenue.current.toFixed(2)} compared to the previous period. ` +
    `You received ${orders.current} orders with an average value of $${aov.current.toFixed(2)}.\n\n` +
    `${customers.new} new customers and ${customers.returning} returning customers this period. ` +
    `Repeat purchase rate is ${repeatRate.toFixed(1)}%.\n\n` +
    `**Top action items:**\n` +
    (revenue.change < -5
      ? `1. Revenue is declining - review marketing campaigns and product availability\n2. Consider running a promotional offer to boost sales\n3. Check inventory levels for top-selling products`
      : `1. Revenue trend is positive - maintain current marketing momentum\n2. Focus on upselling and cross-selling to increase AOV\n3. Review customer feedback for product improvements`);
}
