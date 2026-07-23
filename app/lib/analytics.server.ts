import prisma from "../db.server";
import type {
  KpiData,
  SalesDataPoint,
  ProductPerformance,
  CustomerMetrics,
  TopCustomer,
  InventoryItem,
  DateRange,
} from "~/types/analytics";

function getPreviousPeriod(start: Date, end: Date): { prevStart: Date; prevEnd: Date } {
  const duration = end.getTime() - start.getTime();
  return {
    prevStart: new Date(start.getTime() - duration),
    prevEnd: new Date(start.getTime()),
  };
}

function calcChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function getTrend(change: number): "up" | "down" | "neutral" {
  if (change > 2) return "up";
  if (change < -2) return "down";
  return "neutral";
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export async function getRevenueKpi(shopId: string, range: DateRange): Promise<KpiData> {
  const { prevStart, prevEnd } = getPreviousPeriod(range.startDate, range.endDate);

  const [current, previous] = await Promise.all([
    prisma.syncedOrder.aggregate({
      where: {
        shopId,
        processedAt: { gte: range.startDate, lt: range.endDate },
        financialStatus: { notIn: ["VOIDED", "REFUNDED"] },
      },
      _sum: { totalPrice: true },
    }),
    prisma.syncedOrder.aggregate({
      where: {
        shopId,
        processedAt: { gte: prevStart, lt: prevEnd },
        financialStatus: { notIn: ["VOIDED", "REFUNDED"] },
      },
      _sum: { totalPrice: true },
    }),
  ]);

  const currentVal = current._sum.totalPrice || 0;
  const prevVal = previous._sum.totalPrice || 0;
  const change = calcChange(currentVal, prevVal);

  return {
    label: "Total Revenue",
    value: formatCurrency(currentVal),
    change,
    changeLabel: "vs previous period",
    trend: getTrend(change),
  };
}

export async function getOrdersKpi(shopId: string, range: DateRange): Promise<KpiData> {
  const { prevStart, prevEnd } = getPreviousPeriod(range.startDate, range.endDate);

  const [current, previous] = await Promise.all([
    prisma.syncedOrder.count({
      where: {
        shopId,
        processedAt: { gte: range.startDate, lt: range.endDate },
        financialStatus: { notIn: ["VOIDED", "REFUNDED"] },
      },
    }),
    prisma.syncedOrder.count({
      where: {
        shopId,
        processedAt: { gte: prevStart, lt: prevEnd },
        financialStatus: { notIn: ["VOIDED", "REFUNDED"] },
      },
    }),
  ]);

  const change = calcChange(current, previous);

  return {
    label: "Total Orders",
    value: formatNumber(current),
    change,
    changeLabel: "vs previous period",
    trend: getTrend(change),
  };
}

export async function getAovKpi(shopId: string, range: DateRange): Promise<KpiData> {
  const { prevStart, prevEnd } = getPreviousPeriod(range.startDate, range.endDate);

  const [currentRevenue, currentOrders, prevRevenue, prevOrders] = await Promise.all([
    prisma.syncedOrder.aggregate({
      where: { shopId, processedAt: { gte: range.startDate, lt: range.endDate }, financialStatus: { notIn: ["VOIDED", "REFUNDED"] } },
      _sum: { totalPrice: true },
    }),
    prisma.syncedOrder.count({
      where: { shopId, processedAt: { gte: range.startDate, lt: range.endDate }, financialStatus: { notIn: ["VOIDED", "REFUNDED"] } },
    }),
    prisma.syncedOrder.aggregate({
      where: { shopId, processedAt: { gte: prevStart, lt: prevEnd }, financialStatus: { notIn: ["VOIDED", "REFUNDED"] } },
      _sum: { totalPrice: true },
    }),
    prisma.syncedOrder.count({
      where: { shopId, processedAt: { gte: prevStart, lt: prevEnd }, financialStatus: { notIn: ["VOIDED", "REFUNDED"] } },
    }),
  ]);

  const currentVal = currentOrders > 0 ? (currentRevenue._sum.totalPrice || 0) / currentOrders : 0;
  const prevVal = prevOrders > 0 ? (prevRevenue._sum.totalPrice || 0) / prevOrders : 0;
  const change = calcChange(currentVal, prevVal);

  return {
    label: "Average Order Value",
    value: formatCurrency(currentVal),
    change,
    changeLabel: "vs previous period",
    trend: getTrend(change),
  };
}

export async function getCustomersKpi(shopId: string, range: DateRange): Promise<KpiData> {
  const { prevStart, prevEnd } = getPreviousPeriod(range.startDate, range.endDate);

  const [current, previous] = await Promise.all([
    prisma.syncedCustomer.count({
      where: { shopId, createdAt: { gte: range.startDate, lt: range.endDate } },
    }),
    prisma.syncedCustomer.count({
      where: { shopId, createdAt: { gte: prevStart, lt: prevEnd } },
    }),
  ]);

  const change = calcChange(current, previous);

  return {
    label: "New Customers",
    value: formatNumber(current),
    change,
    changeLabel: "vs previous period",
    trend: getTrend(change),
  };
}

export async function getRepeatRateKpi(shopId: string, range: DateRange): Promise<KpiData> {
  const customers = await prisma.syncedCustomer.findMany({
    where: { shopId, ordersCount: { gte: 1 } },
    select: { ordersCount: true },
  });

  const totalCustomers = customers.length || 1;
  const returningCustomers = customers.filter((c) => c.ordersCount > 1).length;
  const rate = (returningCustomers / totalCustomers) * 100;

  const allCustomers = await prisma.syncedCustomer.count({ where: { shopId } });
  const prevRangeCustomers = await prisma.syncedCustomer.count({
    where: { shopId, createdAt: { lt: range.startDate } },
  });

  const prevReturning = await prisma.syncedCustomer.findMany({
    where: { shopId, ordersCount: { gte: 2 }, createdAt: { lt: range.startDate } },
    select: { ordersCount: true },
  });

  const prevRate = prevRangeCustomers > 0 ? (prevReturning.length / prevRangeCustomers) * 100 : 0;
  const change = calcChange(rate, prevRate);

  return {
    label: "Repeat Purchase Rate",
    value: `${rate.toFixed(1)}%`,
    change,
    changeLabel: "vs previous period",
    trend: getTrend(change),
  };
}

export async function getSalesChart(shopId: string, range: DateRange): Promise<SalesDataPoint[]> {
  const days = Math.ceil((range.endDate.getTime() - range.startDate.getTime()) / (1000 * 60 * 60 * 24));
  const groupBy = days <= 31 ? "day" : days <= 90 ? "week" : "month";

  const orders = await prisma.syncedOrder.findMany({
    where: {
      shopId,
      processedAt: { gte: range.startDate, lt: range.endDate },
      financialStatus: { notIn: ["VOIDED", "REFUNDED"] },
    },
    select: { processedAt: true, totalPrice: true },
    orderBy: { processedAt: "asc" },
  });

  const grouped: Record<string, { revenue: number; orders: number }> = {};

  orders.forEach((order) => {
    if (!order.processedAt) return;
    let key: string;

    if (groupBy === "day") {
      key = order.processedAt.toISOString().split("T")[0];
    } else if (groupBy === "week") {
      const weekStart = new Date(order.processedAt);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      key = weekStart.toISOString().split("T")[0];
    } else {
      key = `${order.processedAt.getFullYear()}-${String(order.processedAt.getMonth() + 1).padStart(2, "0")}`;
    }

    if (!grouped[key]) {
      grouped[key] = { revenue: 0, orders: 0 };
    }
    grouped[key].revenue += order.totalPrice;
    grouped[key].orders += 1;
  });

  return Object.entries(grouped).map(([date, data]) => ({
    date,
    revenue: Math.round(data.revenue * 100) / 100,
    orders: data.orders,
  }));
}

export async function getTopProducts(shopId: string, range: DateRange, limit = 10): Promise<ProductPerformance[]> {
  const orderItems = await prisma.syncedOrderItem.findMany({
    where: {
      order: {
        shopId,
        processedAt: { gte: range.startDate, lt: range.endDate },
        financialStatus: { notIn: ["VOIDED", "REFUNDED"] },
      },
    },
    select: {
      productId: true,
      productTitle: true,
      quantity: true,
      price: true,
      orderId: true,
    },
  });

  const productMap: Record<string, { title: string; revenue: number; quantity: number; orderIds: Set<string> }> = {};

  orderItems.forEach((item) => {
    const key = item.productId || item.productTitle || "unknown";
    if (!productMap[key]) {
      productMap[key] = { title: item.productTitle || "Unknown", revenue: 0, quantity: 0, orderIds: new Set() };
    }
    productMap[key].revenue += item.price * item.quantity;
    productMap[key].quantity += item.quantity;
    productMap[key].orderIds.add(item.orderId);
  });

  const prevStart = new Date(range.startDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  const prevItems = await prisma.syncedOrderItem.findMany({
    where: {
      order: {
        shopId,
        processedAt: { gte: prevStart, lt: range.startDate },
        financialStatus: { notIn: ["VOIDED", "REFUNDED"] },
      },
    },
    select: { productId: true, productTitle: true, price: true, quantity: true },
  });

  const prevRevenue: Record<string, number> = {};
  prevItems.forEach((item) => {
    const key = item.productId || item.productTitle || "unknown";
    prevRevenue[key] = (prevRevenue[key] || 0) + item.price * item.quantity;
  });

  return Object.entries(productMap)
    .map(([id, data]) => {
      const prev = prevRevenue[id] || 0;
      const change = prev > 0 ? ((data.revenue - prev) / prev) * 100 : data.revenue > 0 ? 100 : 0;
      return {
        id,
        title: data.title,
        revenue: Math.round(data.revenue * 100) / 100,
        quantity: data.quantity,
        orderCount: data.orderIds.size,
        trend: getTrend(change),
        trendPercent: Math.round(change * 10) / 10,
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export async function getCustomerMetrics(shopId: string, range: DateRange): Promise<CustomerMetrics> {
  const totalCustomers = await prisma.syncedCustomer.count({ where: { shopId } });

  const newCustomers = await prisma.syncedCustomer.count({
    where: { shopId, createdAt: { gte: range.startDate, lt: range.endDate } },
  });

  const allCustomers = await prisma.syncedCustomer.findMany({
    where: { shopId },
    select: { ordersCount: true, totalSpent: true },
  });

  const returningCustomers = allCustomers.filter((c) => c.ordersCount > 1).length;
  const repeatPurchaseRate = totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0;

  const avgLtv = totalCustomers > 0
    ? allCustomers.reduce((sum, c) => sum + c.totalSpent, 0) / totalCustomers
    : 0;

  const topCustomersData = await prisma.syncedCustomer.findMany({
    where: { shopId, ordersCount: { gte: 1 } },
    orderBy: { totalSpent: "desc" },
    take: 10,
  });

  const topCustomers: TopCustomer[] = topCustomersData.map((c) => ({
    id: c.id,
    name: `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Unknown",
    email: c.email || "",
    totalSpent: c.totalSpent,
    ordersCount: c.ordersCount,
  }));

  return {
    totalCustomers,
    newCustomers,
    returningCustomers,
    repeatPurchaseRate: Math.round(repeatPurchaseRate * 10) / 10,
    averageLifetimeValue: Math.round(avgLtv * 100) / 100,
    topCustomers,
  };
}

export async function getInventoryItems(shopId: string): Promise<InventoryItem[]> {
  const products = await prisma.syncedProduct.findMany({
    where: { shopId, status: "ACTIVE" },
    select: {
      id: true,
      title: true,
      variants: { select: { id: true, title: true, sku: true, price: true, inventory: true } },
    },
  });

  const items: InventoryItem[] = [];

  products.forEach((product) => {
    product.variants.forEach((variant) => {
      let status: "in_stock" | "low_stock" | "out_of_stock" = "in_stock";
      if (variant.inventory <= 0) status = "out_of_stock";
      else if (variant.inventory <= 5) status = "low_stock";

      items.push({
        id: variant.id,
        productId: product.id,
        productTitle: product.title,
        variantTitle: variant.title,
        sku: variant.sku,
        quantity: variant.inventory,
        price: variant.price,
        status,
      });
    });
  });

  return items;
}

export async function getFullAnalytics(shopId: string, range: DateRange) {
  const [revenue, orders, aov, customers, repeatRate, salesChart, topProducts] = await Promise.all([
    getRevenueKpi(shopId, range),
    getOrdersKpi(shopId, range),
    getAovKpi(shopId, range),
    getCustomersKpi(shopId, range),
    getRepeatRateKpi(shopId, range),
    getSalesChart(shopId, range),
    getTopProducts(shopId, range),
  ]);

  return {
    revenue,
    orders,
    averageOrderValue: aov,
    customers,
    repeatRate,
    conversionRate: {
      label: "Conversion Rate",
      value: "N/A",
      change: 0,
      changeLabel: "Requires analytics access",
      trend: "neutral" as const,
    },
    salesChart,
    topProducts,
    dailyBrief: null,
  };
}
