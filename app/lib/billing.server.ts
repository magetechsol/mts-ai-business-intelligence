import prisma from "~/db.server";

export const FREE_PLAN = "free";
export const PRO_PLAN = "pro_monthly";

export interface PlanInfo {
  plan: string;
  isPro: boolean;
  isFree: boolean;
}

export async function getShopPlan(shopId: string): Promise<PlanInfo> {
  const settings = await prisma.appSettings.findUnique({ where: { shopId } });
  const plan = settings?.plan || FREE_PLAN;
  return {
    plan,
    isPro: plan === PRO_PLAN,
    isFree: plan === FREE_PLAN,
  };
}

export async function setShopPlan(shopId: string, plan: string, subscriptionId?: string): Promise<void> {
  await prisma.appSettings.upsert({
    where: { shopId },
    update: { plan, subscriptionId, billingStatus: "active" },
    create: { shopId, plan, subscriptionId, billingStatus: "active" },
  });
}

export async function cancelShopPlan(shopId: string): Promise<void> {
  await prisma.appSettings.upsert({
    where: { shopId },
    update: { plan: FREE_PLAN, billingStatus: "cancelled", subscriptionId: null },
    create: { shopId, plan: FREE_PLAN, billingStatus: "cancelled" },
  });
}

export const PRO_FEATURES = [
  "Advanced Product Analytics",
  "Customer Segmentation",
  "Inventory Health Monitoring",
  "AI-Powered Business Insights",
  "Revenue Forecasting",
  "Data Export",
] as const;

export const FREE_FEATURES = [
  "Dashboard Overview",
  "Basic Sales Analytics",
  "Settings & Data Sync",
] as const;
