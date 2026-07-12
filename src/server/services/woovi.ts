import crypto from "node:crypto";
import { ENV } from "../core/env";
import { supabaseAdmin } from "../core/supabase";
import { PLANS, type PaidPlanKey } from "../../shared/plans";
import { badRequest, serviceUnavailable } from "../core/errors";

const WOOVI_PUBLIC_KEY_BASE64 =
  "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUlHZk1BMEdDU3FHU0liM0RRRUJBUVVBQTRHTkFEQ0JpUUtCZ1FDLytOdElranpldnZxRCtJM01NdjNiTFhEdApwdnhCalk0QnNSclNkY2EzcnRBd01jUllZdnhTbmQ3amFnVkxwY3RNaU94UU84aWVVQ0tMU1dIcHNNQWpPL3paCldNS2Jxb0c4TU5waS91M2ZwNnp6MG1jSENPU3FZc1BVVUcxOWJ1VzhiaXM1WloySVpnQk9iV1NwVHZKMGNuajYKSEtCQUE4MkpsbitsR3dTMU13SURBUUFCCi0tLS0tRU5EIFBVQkxJQyBLRVktLS0tLQo=";

function apiUrl(path: string) {
  return `${ENV.WOOVI_API_URL.replace(/\/$/, "")}${path}`;
}

function appId() {
  if (!ENV.WOOVI_APP_ID) throw serviceUnavailable("WOOVI_APP_ID não configurado");
  return ENV.WOOVI_APP_ID;
}

function onlyDigits(value: string | null | undefined) {
  return (value || "").replace(/\D/g, "");
}

async function wooviRequest<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      Authorization: appId(),
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  let payload: any = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }
  if (!response.ok) {
    const message = payload?.errors?.[0]?.message || payload?.error || payload?.message || `Woovi respondeu ${response.status}`;
    throw serviceUnavailable(message);
  }
  return payload as T;
}

export async function createWooviSubscription(userId: string, planKey: PaidPlanKey) {
  const plan = PLANS[planKey];
  if (!plan.priceMonthly) throw badRequest("Plano inválido");

  const { data: profile, error } = await supabaseAdmin
    .from("users")
    .select("name,email,phone,cpf")
    .eq("id", userId)
    .single();
  if (error) throw serviceUnavailable(error.message);

  const taxID = onlyDigits(profile.cpf);
  const phone = onlyDigits(profile.phone);
  if (!profile.email) throw badRequest("Complete seu e-mail no perfil antes de assinar");
  if (!profile.name) throw badRequest("Complete seu nome no perfil antes de assinar");
  if (taxID.length !== 11 && taxID.length !== 14) throw badRequest("Complete um CPF ou CNPJ válido no perfil antes de assinar");
  if (phone.length < 10) throw badRequest("Complete seu telefone com DDD no perfil antes de assinar");

  const dayGenerateCharge = Math.min(new Date().getDate(), 27);
  const result = await wooviRequest<any>("/api/v1/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      value: plan.priceMonthly,
      dayGenerateCharge,
      customer: {
        name: profile.name,
        email: profile.email,
        phone: phone.startsWith("55") ? phone : `55${phone}`,
        taxID,
        correlationID: userId,
      },
    }),
  });

  const subscription = result?.subscription;
  if (!subscription?.globalID) throw serviceUnavailable("A Woovi não retornou o identificador da assinatura");

  const { error: updateError } = await supabaseAdmin
    .from("users")
    .update({
      plan: planKey,
      woovi_subscription_id: subscription.globalID,
      woovi_status: "pending",
      woovi_current_period_end: null,
    })
    .eq("id", userId);
  if (updateError) throw serviceUnavailable(updateError.message);

  return {
    subscriptionId: subscription.globalID as string,
    status: "pending" as const,
    dayGenerateCharge: subscription.dayGenerateCharge ?? dayGenerateCharge,
    message: "Assinatura criada. A Woovi enviará a cobrança Pix pelos dados cadastrados.",
    paymentLinkUrl:
      result?.charge?.paymentLinkUrl ||
      subscription?.charge?.paymentLinkUrl ||
      result?.paymentLinkUrl ||
      null,
  };
}

export function verifyWooviWebhook(rawBody: Buffer, signature: string) {
  const publicKey = Buffer.from(WOOVI_PUBLIC_KEY_BASE64, "base64").toString("ascii");
  const verify = crypto.createVerify("sha256");
  verify.update(rawBody);
  verify.end();
  return verify.verify(publicKey, signature, "base64");
}

function getCharge(payload: any) {
  return payload?.charge || payload?.pix?.charge || null;
}

function makeEventId(payload: any) {
  const charge = getCharge(payload) || {};
  const identity = charge.globalID || charge.transactionID || charge.identifier || charge.correlationID || crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  return `${payload?.event || "WOOVI:UNKNOWN"}:${identity}`;
}

async function findOwner(payload: any) {
  const charge = getCharge(payload) || {};
  const customer = charge.customer || payload?.pix?.customer || {};
  const correlationID = customer.correlationID;
  if (typeof correlationID === "string" && correlationID.length > 20) {
    const { data } = await supabaseAdmin
      .from("users")
      .select("id,plan,woovi_status,woovi_current_period_end")
      .eq("id", correlationID)
      .maybeSingle();
    if (data) return data;
  }
  const email = customer.email;
  if (typeof email === "string" && email.includes("@")) {
    const { data } = await supabaseAdmin
      .from("users")
      .select("id,plan,woovi_status,woovi_current_period_end")
      .eq("email", email)
      .maybeSingle();
    if (data) return data;
  }
  return null;
}

function nextMonthlyPeriod(currentPeriodEnd: string | null | undefined) {
  const now = new Date();
  const current = currentPeriodEnd ? new Date(currentPeriodEnd) : null;
  const base = current && current > now ? current : now;
  const next = new Date(base);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return next.toISOString();
}

export async function processWooviEvent(payload: any) {
  const eventId = makeEventId(payload);
  const eventType = String(payload?.event || "WOOVI:UNKNOWN");
  const { data: existing } = await supabaseAdmin.from("woovi_events").select("status").eq("id", eventId).maybeSingle();
  if (existing?.status === "processed") return { duplicate: true };

  await supabaseAdmin.from("woovi_events").upsert(
    { id: eventId, event_type: eventType, payload, status: "processing" },
    { onConflict: "id" },
  );

  try {
    const owner = await findOwner(payload);
    const charge = getCharge(payload);

    if (eventType === "OPENPIX:CHARGE_COMPLETED") {
      if (!owner) throw badRequest("Usuário da cobrança não encontrado");
      if (owner.plan !== "starter" && owner.plan !== "pro") throw badRequest("Plano pendente inválido");
      const expectedValue = PLANS[owner.plan as PaidPlanKey].priceMonthly;
      if (Number(charge?.value) !== Number(expectedValue)) throw badRequest("Valor da cobrança não corresponde ao plano");
      const { error } = await supabaseAdmin
        .from("users")
        .update({
          woovi_status: "active",
          woovi_current_period_end: nextMonthlyPeriod(owner.woovi_current_period_end),
        })
        .eq("id", owner.id);
      if (error) throw serviceUnavailable(error.message);
    } else if (eventType === "OPENPIX:CHARGE_EXPIRED" && owner) {
      const periodEnd = owner.woovi_current_period_end ? new Date(owner.woovi_current_period_end) : null;
      if (!periodEnd || periodEnd <= new Date()) {
        const { error } = await supabaseAdmin.from("users").update({ woovi_status: "past_due" }).eq("id", owner.id);
        if (error) throw serviceUnavailable(error.message);
      }
    }

    await supabaseAdmin
      .from("woovi_events")
      .update({ status: "processed", processed_at: new Date().toISOString(), error_message: null })
      .eq("id", eventId);
    return { duplicate: false };
  } catch (error: any) {
    await supabaseAdmin
      .from("woovi_events")
      .update({ status: "failed", error_message: error?.message || "erro" })
      .eq("id", eventId);
    throw error;
  }
}
