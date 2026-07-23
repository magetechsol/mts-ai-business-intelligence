export interface KpiData {
  label: string;
  value: string;
  change: number;
  changeLabel: string;
  trend: "up" | "down" | "neutral";
}

export interface SalesDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface ProductPerformance {
  id: string;
  title: string;
  revenue: number;
  quantity: number;
  orderCount: number;
  trend: "up" | "down" | "neutral";
  trendPercent: number;
}

export interface CustomerMetrics {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  repeatPurchaseRate: number;
  averageLifetimeValue: number;
  topCustomers: TopCustomer[];
}

export interface TopCustomer {
  id: string;
  name: string;
  email: string;
  totalSpent: number;
  ordersCount: number;
}

export interface InventoryItem {
  id: string;
  productId: string;
  productTitle: string;
  variantTitle: string;
  sku: string | null;
  quantity: number;
  price: number;
  status: "in_stock" | "low_stock" | "out_of_stock";
}

export interface AiInsightData {
  type: "daily_brief" | "product_alert" | "customer_insight" | "forecast" | "recommendation";
  title: string;
  content: string;
  severity: "info" | "success" | "warning" | "critical";
  actionLabel?: string;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface RevenueForecast {
  date: string;
  actual: number | null;
  forecast: number;
  lowerBound: number;
  upperBound: number;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
  label: string;
}

export interface AnalyticsSummary {
  revenue: KpiData;
  orders: KpiData;
  averageOrderValue: KpiData;
  customers: KpiData;
  conversionRate: KpiData;
  repeatRate: KpiData;
  salesChart: SalesDataPoint[];
  topProducts: ProductPerformance[];
  dailyBrief: AiInsightData | null;
}
