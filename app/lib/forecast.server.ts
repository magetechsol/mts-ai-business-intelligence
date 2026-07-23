import type { SalesDataPoint, RevenueForecast } from "~/types/analytics";

export function forecastRevenue(
  historicalData: SalesDataPoint[],
  daysToForecast: number = 30
): RevenueForecast[] {
  if (historicalData.length < 3) {
    const avg = historicalData.length > 0
      ? historicalData.reduce((s, d) => s + d.revenue, 0) / historicalData.length
      : 0;

    return Array.from({ length: daysToForecast }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i + 1);
      return {
        date: date.toISOString().split("T")[0],
        actual: null,
        forecast: Math.round(avg * 100) / 100,
        lowerBound: Math.round(avg * 0.7 * 100) / 100,
        upperBound: Math.round(avg * 1.3 * 100) / 100,
      };
    });
  }

  const n = historicalData.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  historicalData.forEach((point, i) => {
    sumX += i;
    sumY += point.revenue;
    sumXY += i * point.revenue;
    sumX2 += i * i;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) || 0;
  const intercept = (sumY - slope * sumX) / n;

  const residuals = historicalData.map((point, i) => {
    const predicted = slope * i + intercept;
    return point.revenue - predicted;
  });

  const sse = residuals.reduce((sum, r) => sum + r * r, 0);
  const stdError = Math.sqrt(sse / (n - 2)) || sumY / n * 0.2;

  const result: RevenueForecast[] = [];

  for (let i = 0; i < daysToForecast; i++) {
    const futureIndex = n + i;
    const predicted = slope * futureIndex + intercept;
    const date = new Date();
    date.setDate(date.getDate() + i + 1);

    const dayOfWeek = date.getDay();
    const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.75 : 1.0;

    const adjustedForecast = Math.max(0, predicted * weekendFactor);
    const margin = stdError * 1.96 * Math.sqrt(1 + 1 / n + (futureIndex - sumX / n) ** 2 / (sumX2 - sumX * sumX / n));

    result.push({
      date: date.toISOString().split("T")[0],
      actual: null,
      forecast: Math.round(adjustedForecast * 100) / 100,
      lowerBound: Math.round(Math.max(0, adjustedForecast - margin) * 100) / 100,
      upperBound: Math.round((adjustedForecast + margin) * 100) / 100,
    });
  }

  return result;
}
