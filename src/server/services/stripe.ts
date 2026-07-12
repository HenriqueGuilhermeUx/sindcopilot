import Stripe from "stripe";
import { ENV } from "../core/env";
import { supabaseAdmin } from "../core/supabase";
import { PLANS, type PaidPlanKey } from "../../shared/plans";
import { badRequest, serviceUnavailable } from "../core/errors";

let stripeClient: Stripe | null = null;
function stripe() {
  if (!ENV.STRIPE_SECRET_KEY) throw serviceUnavailable("Stripe não configurado");
  stripeClient ||= new Stripe(ENV.STRIPE_SECRET_KEY);
  return stripeClient;
}

export async function createCheckoutSession(userId: string, email: string, name: string | null, planKey: PaidPlanKey) {
  const plan = PLANS[planKey];
  if (!plan.priceMonthly) throw badRequest("Plano inválido");
  const { data: user, error } = await supabaseAdmin.from("users").select("stripe_customer_id").eq("id",userId).single();
  if (error) throw serviceUnavailable(error.message);
  let customerId = user.stripe_customer_id as string | null;
  if (!customerId) {
    const customer = await stripe().customers.create({ email, name: name || undefined, metadata: { user_id: userId } });
    customerId = customer.id;
    await supabaseAdmin.from("users").update({ stripe_customer_id: customerId }).eq("id", userId);
  }
  return stripe().checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    allow_promotion_codes: true,
    client_reference_id: userId,
    metadata: { user_id: userId, plan: planKey },
    subscription_data: { metadata: { user_id: userId, plan: planKey } },
    line_items: [{ price_data: { currency:"brl", product_data:{ name:`SindCopilot ${plan.name}`, description:`Até ${plan.maxCondominiums} condomínios` }, unit_amount:plan.priceMonthly, recurring:{interval:"month"} }, quantity:1 }],
    success_url: `${ENV.APP_URL}/planos?success=true`,
    cancel_url: `${ENV.APP_URL}/planos?cancelled=true`,
  });
}

export async function createPortalSession(customerId: string) {
  return stripe().billingPortal.sessions.create({ customer: customerId, return_url: `${ENV.APP_URL}/planos` });
}

function subscriptionPeriodEnd(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0] as any;
  const seconds = (subscription as any).current_period_end || item?.current_period_end;
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

async function applySubscription(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const metadata = subscription.metadata || {};
  const plan = (metadata.plan || "starter") as PaidPlanKey;
  const active = ["active","trialing"].includes(subscription.status);
  const payload: Record<string, unknown> = {
    stripe_subscription_id: subscription.id,
    stripe_status: subscription.status,
    stripe_current_period_end: subscriptionPeriodEnd(subscription),
  };
  if (active && (plan === "starter" || plan === "pro")) payload.plan = plan;
  if (["canceled","unpaid","incomplete_expired"].includes(subscription.status)) payload.plan = "free";
  const { error } = await supabaseAdmin.from("users").update(payload).eq("stripe_customer_id", customerId);
  if (error) throw serviceUnavailable(error.message);
}

export async function processStripeEvent(event: Stripe.Event) {
  const { data: existing } = await supabaseAdmin.from("stripe_events").select("status").eq("id",event.id).maybeSingle();
  if (existing?.status === "processed") return;
  await supabaseAdmin.from("stripe_events").upsert({ id:event.id,event_type:event.type,payload:event as any,status:"processing" },{onConflict:"id"});
  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.subscription) {
        const sub = await stripe().subscriptions.retrieve(session.subscription as string);
        await applySubscription(sub);
      }
    } else if (["customer.subscription.created","customer.subscription.updated","customer.subscription.deleted"].includes(event.type)) {
      await applySubscription(event.data.object as Stripe.Subscription);
    } else if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = (invoice as any).subscription as string | undefined;
      if (subscriptionId) {
        const subscription = await stripe().subscriptions.retrieve(subscriptionId);
        await applySubscription(subscription);
      } else {
        await supabaseAdmin.from("users").update({ stripe_status: "active" }).eq("stripe_customer_id", invoice.customer as string);
      }
    } else if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      await supabaseAdmin.from("users").update({ stripe_status: "past_due" }).eq("stripe_customer_id", invoice.customer as string);
    }
    await supabaseAdmin.from("stripe_events").update({status:"processed",processed_at:new Date().toISOString(),error_message:null}).eq("id",event.id);
  } catch (error:any) {
    await supabaseAdmin.from("stripe_events").update({status:"failed",error_message:error?.message||"erro"}).eq("id",event.id);
    throw error;
  }
}

export function constructStripeEvent(rawBody: Buffer, signature: string) {
  if (!ENV.STRIPE_WEBHOOK_SECRET) throw serviceUnavailable("STRIPE_WEBHOOK_SECRET não configurado");
  return stripe().webhooks.constructEvent(rawBody, signature, ENV.STRIPE_WEBHOOK_SECRET);
}
