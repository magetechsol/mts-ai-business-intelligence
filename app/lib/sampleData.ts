const COLORS = ["#503ceb", "#4bb550", "#E4910B", "#D72C0D"];

function generateSalesChart(days: number = 30) {
  const chart = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const base = 800 + Math.sin(i * 0.3) * 400;
    const revenue = Math.max(100, base + (Math.random() - 0.5) * 600);
    const orders = Math.max(1, Math.floor(revenue / 65));
    chart.push({
      date: d.toISOString().split("T")[0],
      revenue: Math.round(revenue * 100) / 100,
      orders,
    });
  }
  return chart;
}

function generateTopProducts() {
  return [
    { title: "Classic T-Shirt", revenue: 4250.00, quantity: 142, trend: "up" as const },
    { title: "Wireless Earbuds", revenue: 3890.50, quantity: 78, trend: "up" as const },
    { title: "Organic Hoodie", revenue: 3120.00, quantity: 62, trend: "down" as const },
    { title: "Smart Watch Band", revenue: 2780.25, quantity: 185, trend: "up" as const },
    { title: "Yoga Mat Premium", revenue: 2150.00, quantity: 107, trend: "neutral" as const },
    { title: "Bamboo Water Bottle", revenue: 1980.75, quantity: 132, trend: "down" as const },
    { title: "LED Desk Lamp", revenue: 1650.00, quantity: 55, trend: "up" as const },
    { title: "Resistance Bands Set", revenue: 1420.50, quantity: 196, trend: "neutral" as const },
  ];
}

export function getSampleAnalytics() {
  const salesChart = generateSalesChart(30);
  const totalRevenue = salesChart.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = salesChart.reduce((s, d) => s + d.orders, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return {
    revenue: {
      label: "Total Revenue" as const,
      value: `$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: 12.5,
      changeLabel: "vs last period",
      trend: "up" as const,
    },
    orders: {
      label: "Total Orders" as const,
      value: totalOrders.toLocaleString(),
      change: 8.3,
      changeLabel: "vs last period",
      trend: "up" as const,
    },
    averageOrderValue: {
      label: "Average Order Value" as const,
      value: `$${avgOrderValue.toFixed(2)}`,
      change: 3.7,
      changeLabel: "vs last period",
      trend: "up" as const,
    },
    customers: {
      label: "New Customers" as const,
      value: "847",
      change: 15.2,
      changeLabel: "vs last period",
      trend: "up" as const,
    },
    repeatRate: {
      label: "Repeat Purchase Rate" as const,
      value: "32.4%",
      change: 2.1,
      changeLabel: "vs last period",
      trend: "up" as const,
    },
    conversionRate: {
      label: "Conversion Rate" as const,
      value: "3.8%",
      change: -0.5,
      changeLabel: "vs last period",
      trend: "down" as const,
    },
    salesChart,
    topProducts: generateTopProducts(),
    dailyBrief: null,
  };
}

export function getSampleDashboardData() {
  return {
    shopId: "demo",
    analytics: getSampleAnalytics(),
    recentOrders: [
      { id: "1", name: "#1001", email: "sarah@example.com", totalPrice: 189.99, financialStatus: "PAID", processedAt: new Date(Date.now() - 3600000).toISOString() },
      { id: "2", name: "#1002", email: "mike@example.com", totalPrice: 67.50, financialStatus: "PAID", processedAt: new Date(Date.now() - 7200000).toISOString() },
      { id: "3", name: "#1003", email: "emma@example.com", totalPrice: 245.00, financialStatus: "PENDING", processedAt: new Date(Date.now() - 14400000).toISOString() },
      { id: "4", name: "#1004", email: "james@example.com", totalPrice: 42.25, financialStatus: "PAID", processedAt: new Date(Date.now() - 28800000).toISOString() },
      { id: "5", name: "#1005", email: "lisa@example.com", totalPrice: 312.00, financialStatus: "AUTHORIZED", processedAt: new Date(Date.now() - 43200000).toISOString() },
      { id: "6", name: "#1006", email: "david@example.com", totalPrice: 89.99, financialStatus: "PAID", processedAt: new Date(Date.now() - 57600000).toISOString() },
      { id: "7", name: "#1007", email: "ana@example.com", totalPrice: 156.75, financialStatus: "REFUNDED", processedAt: new Date(Date.now() - 86400000).toISOString() },
      { id: "8", name: "#1008", email: "tom@example.com", totalPrice: 210.00, financialStatus: "PAID", processedAt: new Date(Date.now() - 100800000).toISOString() },
    ],
    authError: null,
  };
}

export function getSampleSalesData() {
  const salesChart = generateSalesChart(30);
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const totalRevenue = salesChart.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = salesChart.reduce((s, d) => s + d.orders, 0);

  return {
    revenue: {
      label: "Total Revenue",
      value: `$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: 12.5,
      changeLabel: "vs last period",
      trend: "up" as const,
    },
    orders: {
      label: "Total Orders",
      value: totalOrders.toLocaleString(),
      change: 8.3,
      changeLabel: "vs last period",
      trend: "up" as const,
    },
    aov: {
      label: "Avg Order Value",
      value: `$${(totalRevenue / totalOrders).toFixed(2)}`,
      change: 3.7,
      changeLabel: "vs last period",
      trend: "up" as const,
    },
    salesChart,
    statusData: [
      { name: "PAID", value: Math.floor(totalOrders * 0.72) },
      { name: "PENDING", value: Math.floor(totalOrders * 0.15) },
      { name: "AUTHORIZED", value: Math.floor(totalOrders * 0.08) },
      { name: "REFUNDED", value: Math.floor(totalOrders * 0.05) },
    ],
    dayOfWeekData: dayNames.map((day) => ({
      day,
      orders: Math.floor(Math.random() * 40) + 10,
    })),
  };
}

export function getSampleProductsData() {
  const products = [
    { id: "1", title: "Classic T-Shirt", vendor: "Apparel Co", productType: "Clothing", status: "ACTIVE", totalVariants: 3, imageCount: 2, createdAt: "2025-01-15", totalInventory: 142, totalValue: 4260.00, variants: [{ id: "v1", title: "Small / White", sku: "CTS-S-W", price: 30.00, inventory: 48 }, { id: "v2", title: "Medium / Black", sku: "CTS-M-B", price: 30.00, inventory: 62 }, { id: "v3", title: "Large / Blue", sku: "CTS-L-Bl", price: 30.00, inventory: 32 }] },
    { id: "2", title: "Wireless Earbuds", vendor: "Tech Gear", productType: "Electronics", status: "ACTIVE", totalVariants: 2, imageCount: 4, createdAt: "2025-02-10", totalInventory: 78, totalValue: 3900.00, variants: [{ id: "v4", title: "Black", sku: "WE-BLK", price: 50.00, inventory: 45 }, { id: "v5", title: "White", sku: "WE-WHT", price: 50.00, inventory: 33 }] },
    { id: "3", title: "Organic Hoodie", vendor: "Apparel Co", productType: "Clothing", status: "ACTIVE", totalVariants: 4, imageCount: 3, createdAt: "2025-03-05", totalInventory: 62, totalValue: 3720.00, variants: [{ id: "v6", title: "S / Grey", sku: "OH-S-G", price: 60.00, inventory: 15 }, { id: "v7", title: "M / Grey", sku: "OH-M-G", price: 60.00, inventory: 20 }, { id: "v8", title: "L / Grey", sku: "OH-L-G", price: 60.00, inventory: 17 }, { id: "v9", title: "XL / Grey", sku: "OH-XL-G", price: 60.00, inventory: 10 }] },
    { id: "4", title: "Smart Watch Band", vendor: "Tech Gear", productType: "Accessories", status: "ACTIVE", totalVariants: 5, imageCount: 5, createdAt: "2025-01-20", totalInventory: 185, totalValue: 3700.00, variants: [{ id: "v10", title: "Silicone / Black", sku: "SWB-SB", price: 20.00, inventory: 50 }, { id: "v11", title: "Silicone / Blue", sku: "SWB-SBl", price: 20.00, inventory: 40 }, { id: "v12", title: "Leather / Brown", sku: "SWB-LBr", price: 25.00, inventory: 35 }, { id: "v13", title: "Metal / Silver", sku: "SWB-MS", price: 30.00, inventory: 30 }, { id: "v14", title: "Metal / Gold", sku: "SWB-MG", price: 30.00, inventory: 30 }] },
    { id: "5", title: "Yoga Mat Premium", vendor: "Wellness Store", productType: "Fitness", status: "ACTIVE", totalVariants: 2, imageCount: 3, createdAt: "2025-02-28", totalInventory: 107, totalValue: 3210.00, variants: [{ id: "v15", title: "Purple", sku: "YMP-P", price: 30.00, inventory: 57 }, { id: "v16", title: "Green", sku: "YMP-G", price: 30.00, inventory: 50 }] },
    { id: "6", title: "Bamboo Water Bottle", vendor: "Wellness Store", productType: "Accessories", status: "ACTIVE", totalVariants: 3, imageCount: 2, createdAt: "2025-03-12", totalInventory: 132, totalValue: 3960.00, variants: [{ id: "v17", title: "500ml", sku: "BWB-500", price: 30.00, inventory: 55 }, { id: "v18", title: "750ml", sku: "BWB-750", price: 35.00, inventory: 47 }, { id: "v19", title: "1L", sku: "BWB-1L", price: 40.00, inventory: 30 }] },
    { id: "7", title: "LED Desk Lamp", vendor: "Home Essentials", productType: "Home", status: "ACTIVE", totalVariants: 2, imageCount: 4, createdAt: "2025-04-01", totalInventory: 55, totalValue: 2750.00, variants: [{ id: "v20", title: "Warm White", sku: "LDL-WW", price: 50.00, inventory: 30 }, { id: "v21", title: "Cool White", sku: "LDL-CW", price: 50.00, inventory: 25 }] },
    { id: "8", title: "Resistance Bands Set", vendor: "Wellness Store", productType: "Fitness", status: "ACTIVE", totalVariants: 1, imageCount: 2, createdAt: "2025-02-14", totalInventory: 196, totalValue: 1960.00, variants: [{ id: "v22", title: "5-Pack", sku: "RBS-5P", price: 10.00, inventory: 196 }] },
    { id: "9", title: "Bluetooth Speaker", vendor: "Tech Gear", productType: "Electronics", status: "DRAFT", totalVariants: 2, imageCount: 3, createdAt: "2025-04-15", totalInventory: 0, totalValue: 0, variants: [{ id: "v23", title: "Black", sku: "BS-BLK", price: 45.00, inventory: 0 }, { id: "v24", title: "Red", sku: "BS-RED", price: 45.00, inventory: 0 }] },
  ];

  const typeData = [
    { name: "Clothing", value: 2 },
    { name: "Electronics", value: 2 },
    { name: "Accessories", value: 2 },
    { name: "Fitness", value: 2 },
    { name: "Home", value: 1 },
  ];
  const vendorData = [
    { name: "Apparel Co", value: 2 },
    { name: "Tech Gear", value: 2 },
    { name: "Wellness Store", value: 3 },
    { name: "Home Essentials", value: 1 },
  ];

  return {
    products,
    typeData,
    vendorData,
    summary: {
      total: products.length,
      active: products.filter((p) => p.status === "ACTIVE").length,
      totalInventory: products.reduce((s, p) => s + p.totalInventory, 0),
      lowStockProducts: 2,
      outOfStock: 1,
    },
  };
}

export function getSampleCustomersData() {
  const topCustomers = [
    { id: "c1", name: "Sarah Johnson", email: "sarah@example.com", totalSpent: 1245.50, ordersCount: 8 },
    { id: "c2", name: "Mike Chen", email: "mike@example.com", totalSpent: 987.25, ordersCount: 6 },
    { id: "c3", name: "Emma Wilson", email: "emma@example.com", totalSpent: 856.00, ordersCount: 5 },
    { id: "c4", name: "James Brown", email: "james@example.com", totalSpent: 743.99, ordersCount: 4 },
    { id: "c5", name: "Lisa Garcia", email: "lisa@example.com", totalSpent: 698.50, ordersCount: 5 },
    { id: "c6", name: "David Kim", email: "david@example.com", totalSpent: 534.00, ordersCount: 3 },
    { id: "c7", name: "Ana Martinez", email: "ana@example.com", totalSpent: 421.75, ordersCount: 3 },
    { id: "c8", name: "Tom Anderson", email: "tom@example.com", totalSpent: 389.00, ordersCount: 2 },
  ];

  const monthlyData = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    monthlyData.push({
      month: d.toISOString().slice(0, 7),
      count: Math.floor(Math.random() * 40) + 30,
    });
  }

  return {
    metrics: {
      totalCustomers: 847,
      newCustomers: 124,
      returningCustomers: 285,
      repeatPurchaseRate: 32.4,
      averageLifetimeValue: 156.78,
      topCustomers,
    },
    monthlyData,
    customerSegments: [
      { name: "One-time Buyers", value: 562 },
      { name: "Repeat Buyers", value: 285 },
    ],
    spendRanges: [
      { name: "$0-$50", min: 0, max: 50, count: 245 },
      { name: "$50-$100", min: 50, max: 100, count: 187 },
      { name: "$100-$250", min: 100, max: 250, count: 156 },
      { name: "$250-$500", min: 250, max: 500, count: 89 },
      { name: "$500+", min: 500, max: Infinity, count: 34 },
    ],
    customerOrders: {} as Record<string, any[]>,
  };
}

export function getSampleInventoryData() {
  const items = [
    { id: "inv1", productId: "1", productTitle: "Classic T-Shirt", variantTitle: "Small / White", sku: "CTS-S-W", quantity: 48, price: 30.00, status: "in_stock" as const },
    { id: "inv2", productId: "1", productTitle: "Classic T-Shirt", variantTitle: "Medium / Black", sku: "CTS-M-B", quantity: 62, price: 30.00, status: "in_stock" as const },
    { id: "inv3", productId: "1", productTitle: "Classic T-Shirt", variantTitle: "Large / Blue", sku: "CTS-L-Bl", quantity: 3, price: 30.00, status: "low_stock" as const },
    { id: "inv4", productId: "2", productTitle: "Wireless Earbuds", variantTitle: "Black", sku: "WE-BLK", quantity: 45, price: 50.00, status: "in_stock" as const },
    { id: "inv5", productId: "2", productTitle: "Wireless Earbuds", variantTitle: "White", sku: "WE-WHT", quantity: 2, price: 50.00, status: "low_stock" as const },
    { id: "inv6", productId: "3", productTitle: "Organic Hoodie", variantTitle: "S / Grey", sku: "OH-S-G", quantity: 15, price: 60.00, status: "in_stock" as const },
    { id: "inv7", productId: "3", productTitle: "Organic Hoodie", variantTitle: "M / Grey", sku: "OH-M-G", quantity: 20, price: 60.00, status: "in_stock" as const },
    { id: "inv8", productId: "4", productTitle: "Smart Watch Band", variantTitle: "Silicone / Black", sku: "SWB-SB", quantity: 50, price: 20.00, status: "in_stock" as const },
    { id: "inv9", productId: "5", productTitle: "Yoga Mat Premium", variantTitle: "Purple", sku: "YMP-P", quantity: 57, price: 30.00, status: "in_stock" as const },
    { id: "inv10", productId: "6", productTitle: "Bamboo Water Bottle", variantTitle: "500ml", sku: "BWB-500", quantity: 55, price: 30.00, status: "in_stock" as const },
    { id: "inv11", productId: "7", productTitle: "LED Desk Lamp", variantTitle: "Warm White", sku: "LDL-WW", quantity: 30, price: 50.00, status: "in_stock" as const },
    { id: "inv12", productId: "7", productTitle: "LED Desk Lamp", variantTitle: "Cool White", sku: "LDL-CW", quantity: 4, price: 50.00, status: "low_stock" as const },
    { id: "inv13", productId: "9", productTitle: "Bluetooth Speaker", variantTitle: "Black", sku: "BS-BLK", quantity: 0, price: 45.00, status: "out_of_stock" as const },
    { id: "inv14", productId: "9", productTitle: "Bluetooth Speaker", variantTitle: "Red", sku: "BS-RED", quantity: 0, price: 45.00, status: "out_of_stock" as const },
  ];

  const summary = {
    total: items.length,
    inStock: items.filter((i) => i.status === "in_stock").length,
    lowStock: items.filter((i) => i.status === "low_stock").length,
    outOfStock: items.filter((i) => i.status === "out_of_stock").length,
    totalUnits: items.reduce((s, i) => s + i.quantity, 0),
    totalValue: items.reduce((s, i) => s + i.price * i.quantity, 0),
  };

  const statusData = [
    { name: "In Stock", value: summary.inStock, color: "#4bb550" },
    { name: "Low Stock", value: summary.lowStock, color: "#E4910B" },
    { name: "Out of Stock", value: summary.outOfStock, color: "#D72C0D" },
  ];

  const lowStockItems = items.filter((i) => i.status === "low_stock" || i.status === "out_of_stock");

  const productMap: Record<string, { title: string; totalInventory: number; totalValue: number }> = {};
  items.forEach((item) => {
    if (!productMap[item.productId]) productMap[item.productId] = { title: item.productTitle, totalInventory: 0, totalValue: 0 };
    productMap[item.productId].totalInventory += item.quantity;
    productMap[item.productId].totalValue += item.price * item.quantity;
  });
  const inventoryByProduct = Object.values(productMap).sort((a, b) => b.totalValue - a.totalValue).slice(0, 10);

  return { summary, statusData, lowStockItems, inventoryByProduct };
}
