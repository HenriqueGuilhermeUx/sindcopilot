export type PlanKey = "free" | "trial" | "starter" | "pro" | "scale";
export type PaidPlanKey = "starter" | "pro";
export type UsageMetric = "ocr" | "ai" | "notices";

export const PLANS = {
  free: {
    name: "Grátis",
    priceMonthly: 0,
    maxCondominiums: 1,
    maxAssistants: 0,
    ocrPerMonth: 3,
    aiPerMonth: 20,
    noticesPerMonth: 5,
    storageBytes: 100 * 1024 * 1024,
  },
  trial: {
    name: "Teste de 7 dias",
    priceMonthly: 0,
    maxCondominiums: 6,
    maxAssistants: 1,
    ocrPerMonth: 25,
    aiPerMonth: 100,
    noticesPerMonth: 50,
    storageBytes: 1024 * 1024 * 1024,
  },
  starter: {
    name: "Starter",
    priceMonthly: 9900,
    maxCondominiums: 6,
    maxAssistants: 1,
    ocrPerMonth: 100,
    aiPerMonth: 300,
    noticesPerMonth: 150,
    storageBytes: 5 * 1024 * 1024 * 1024,
  },
  pro: {
    name: "Pro",
    priceMonthly: 19900,
    maxCondominiums: 16,
    maxAssistants: 2,
    ocrPerMonth: 400,
    aiPerMonth: 1200,
    noticesPerMonth: 600,
    storageBytes: 20 * 1024 * 1024 * 1024,
  },
  scale: {
    name: "Scale",
    priceMonthly: null,
    maxCondominiums: 999,
    maxAssistants: 10,
    ocrPerMonth: 5000,
    aiPerMonth: 10000,
    noticesPerMonth: 5000,
    storageBytes: 200 * 1024 * 1024 * 1024,
  },
} as const;

export function planLimits(plan: PlanKey) {
  return PLANS[plan];
}
