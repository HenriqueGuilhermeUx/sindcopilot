import { ENV } from "../core/env";
import type { PaidPlanKey } from "../../shared/plans";
import { createWooviSubscription } from "./woovi";

// Adaptador temporário para preservar a assinatura interna do router durante a migração.
// Não há comunicação com Stripe: toda cobrança é criada e confirmada pela Woovi/Pix.
export async function createCheckoutSession(
  userId: string,
  _email: string,
  _name: string | null,
  planKey: PaidPlanKey,
) {
  const result = await createWooviSubscription(userId, planKey);
  return {
    url: result.paymentLinkUrl || `${ENV.APP_URL}/planos?woovi=pending`,
  };
}

export async function createPortalSession(_customerId: string) {
  return {
    url: `${ENV.APP_URL}/planos?woovi=manage`,
  };
}
