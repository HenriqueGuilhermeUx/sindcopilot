import { describe, expect, it } from "vitest";
import { PLANS, planLimits } from "./plans";

describe("plan limits", () => {
  it("keeps paid tiers ordered by capacity", () => {
    expect(PLANS.starter.maxCondominiums).toBeLessThan(PLANS.pro.maxCondominiums);
    expect(PLANS.starter.ocrPerMonth).toBeLessThan(PLANS.pro.ocrPerMonth);
    expect(PLANS.starter.storageBytes).toBeLessThan(PLANS.pro.storageBytes);
  });

  it("provides a usable seven-day trial", () => {
    expect(PLANS.trial.maxCondominiums).toBe(6);
    expect(PLANS.trial.ocrPerMonth).toBeGreaterThan(0);
    expect(planLimits("trial")).toEqual(PLANS.trial);
  });

  it("keeps the free plan safely limited", () => {
    expect(PLANS.free.maxCondominiums).toBe(1);
    expect(PLANS.free.maxAssistants).toBe(0);
    expect(PLANS.free.priceMonthly).toBe(0);
  });
});
