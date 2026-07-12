import type { ContextUser } from "../core/context";
import { supabaseAdmin } from "../core/supabase";
import { PLANS, type PlanKey, type UsageMetric } from "../../shared/plans";
import { forbidden, serviceUnavailable } from "../core/errors";

export type Entitlements = {
  effectivePlan: PlanKey;
  storedPlan: "free" | "starter" | "pro" | "scale";
  trialEndsAt: string | null;
  wooviStatus: string | null;
  limits: typeof PLANS[PlanKey];
  usage: { ocrCount: number; aiCount: number; noticesCount: number; storageBytes: number };
};

export async function getEntitlements(ownerId: string): Promise<Entitlements> {
  const { data: user, error } = await supabaseAdmin.from("users").select("plan,trial_ends_at,woovi_status,woovi_current_period_end,storage_bytes").eq("id", ownerId).single();
  if (error) throw serviceUnavailable(error.message);
  const storedPlan = (user.plan || "free") as Entitlements["storedPlan"];
  const paidUntil = user.woovi_current_period_end ? new Date(user.woovi_current_period_end) : null;
  const paidActive = storedPlan !== "free" && user.woovi_status === "active" && !!paidUntil && paidUntil > new Date();
  const trialActive = storedPlan === "free" && user.trial_ends_at && new Date(user.trial_ends_at) > new Date();
  const effectivePlan: PlanKey = paidActive ? storedPlan : trialActive ? "trial" : "free";
  const periodStart = new Date(); periodStart.setUTCDate(1); periodStart.setUTCHours(0,0,0,0);
  const { data: usage } = await supabaseAdmin.from("usage_monthly").select("*").eq("user_id", ownerId).eq("period_start", periodStart.toISOString().slice(0,10)).maybeSingle();
  return {
    effectivePlan, storedPlan, trialEndsAt: user.trial_ends_at || null, wooviStatus: user.woovi_status || null,
    limits: PLANS[effectivePlan],
    usage: { ocrCount: usage?.ocr_count || 0, aiCount: usage?.ai_count || 0, noticesCount: usage?.notices_count || 0, storageBytes: Number(user.storage_bytes || 0) },
  };
}

export async function consume(ownerId: string, metric: UsageMetric, amount = 1) {
  const ent = await getEntitlements(ownerId);
  const limit = metric === "ocr" ? ent.limits.ocrPerMonth : metric === "ai" ? ent.limits.aiPerMonth : ent.limits.noticesPerMonth;
  const { data, error } = await supabaseAdmin.rpc("consume_monthly_usage", { p_user_id: ownerId, p_metric: metric, p_limit: limit, p_amount: amount });
  if (error) throw serviceUnavailable(error.message);
  if (!data) throw forbidden(`Limite mensal de ${metric === "ocr" ? "OCR" : metric === "ai" ? "consultas à IA" : "minutas"} atingido. Faça upgrade do plano.`);
  return ent;
}

export async function reserveStorage(ownerId: string, bytes: number) {
  const ent = await getEntitlements(ownerId);
  const { data, error } = await supabaseAdmin.rpc("reserve_storage", { p_user_id: ownerId, p_limit_bytes: ent.limits.storageBytes, p_amount_bytes: bytes });
  if (error) throw serviceUnavailable(error.message);
  if (!data) throw forbidden("Limite de armazenamento atingido. Remova arquivos ou faça upgrade do plano.");
}

export async function releaseStorage(ownerId: string, bytes: number) {
  const { error } = await supabaseAdmin.rpc("release_storage", { p_user_id: ownerId, p_amount_bytes: Math.max(0, bytes) });
  if (error) console.error("[Storage release]", error);
}

export async function assertCondoLimit(user: ContextUser, current: number) {
  const ent = await getEntitlements(user.accountOwnerId);
  if (current >= ent.limits.maxCondominiums) throw forbidden(`Seu plano permite até ${ent.limits.maxCondominiums} condomínio(s).`);
  return ent;
}

export async function assertAssistantLimit(ownerId: string, current: number) {
  const ent = await getEntitlements(ownerId);
  if (current >= ent.limits.maxAssistants) throw forbidden(`Seu plano permite até ${ent.limits.maxAssistants} ajudante(s).`);
  return ent;
}
