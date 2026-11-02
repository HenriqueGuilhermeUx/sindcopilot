import { randomBytes } from "node:crypto";
import { supabaseAdmin } from "../core/supabase";
import { PLANS, type PaidPlanKey } from "../../shared/plans";

const FOUNDERS_CAMPAIGN = "FOUNDERS100";

function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 40);
}

function maskPixKey(value: string | null | undefined) {
  if (!value) return null;
  if (value.length <= 6) return "***";
  return `${value.slice(0, 3)}***${value.slice(-3)}`;
}

function codePrefix(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 10);
  return normalized || "SIND";
}

async function codeRecord(code: string) {
  const normalized = normalizeCode(code);
  if (!normalized) return null;
  const { data: codeRow, error } = await supabaseAdmin
    .from("partner_codes")
    .select("*")
    .eq("code", normalized)
    .eq("active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!codeRow) return null;

  const [{ data: partner, error: partnerError }, { data: campaign, error: campaignError }] = await Promise.all([
    supabaseAdmin.from("partner_profiles").select("*").eq("id", codeRow.partner_id).maybeSingle(),
    codeRow.campaign_key
      ? supabaseAdmin.from("promotion_campaigns").select("*").eq("key", codeRow.campaign_key).maybeSingle()
      : Promise.resolve({ data: null, error: null } as any),
  ]);
  if (partnerError) throw new Error(partnerError.message);
  if (campaignError) throw new Error(campaignError.message);
  if (!partner || partner.status !== "active") return null;
  return { codeRow, partner, campaign };
}

export async function getPublicPartnerOffer(code: string) {
  const record = await codeRecord(code);
  if (!record) return null;
  const { codeRow, partner, campaign } = record;
  const campaignActive = !!campaign
    && campaign.active === true
    && new Date(campaign.starts_at) <= new Date()
    && (!campaign.ends_at || new Date(campaign.ends_at) > new Date());
  const remaining = campaignActive
    ? Math.max(0, Number(campaign.max_redemptions || 0) - Number(campaign.reserved_count || 0))
    : 0;
  return {
    code: codeRow.code,
    partnerName: partner.display_name,
    campaign: campaignActive && campaign ? {
      key: campaign.key,
      name: campaign.name,
      plan: campaign.plan_key,
      promoPriceCents: Number(campaign.promo_price_cents),
      regularPriceCents: Number(campaign.regular_price_cents),
      remaining,
      maxRedemptions: Number(campaign.max_redemptions),
    } : null,
  };
}

export async function trackPartnerClick(input: { code: string; visitorId: string; referrer?: string | null }) {
  const record = await codeRecord(input.code);
  if (!record) return { tracked: false };
  const visitorId = input.visitorId.trim().slice(0, 120);
  if (visitorId.length < 8) return { tracked: false };
  const { error } = await supabaseAdmin.from("partner_clicks").upsert({
    partner_id: record.partner.id,
    code_id: record.codeRow.id,
    visitor_id: visitorId,
    referrer: input.referrer?.slice(0, 500) || null,
  }, { onConflict: "code_id,visitor_id", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
  return { tracked: true };
}

export async function claimPartnerReferral(userId: string, code: string) {
  const record = await codeRecord(code);
  if (!record) return { claimed: false, reason: "invalid_code" as const };
  if (record.partner.user_id === userId) return { claimed: false, reason: "self_referral" as const };

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("partner_referrals")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing) return { claimed: true, existing: true, referralId: Number(existing.id) };

  const { data, error } = await supabaseAdmin.from("partner_referrals").insert({
    partner_id: record.partner.id,
    code_id: record.codeRow.id,
    user_id: userId,
    campaign_key: record.codeRow.campaign_key || null,
    status: "trial",
  }).select("id").single();
  if (error) throw new Error(error.message);
  return { claimed: true, existing: false, referralId: Number(data.id) };
}

export async function resolvePartnerCheckout(userId: string, planKey: PaidPlanKey, referralCode?: string | null) {
  if (referralCode) await claimPartnerReferral(userId, referralCode).catch(() => undefined);

  const { data, error } = await supabaseAdmin.rpc("reserve_partner_offer", {
    p_user_id: userId,
    p_plan_key: planKey,
  });
  if (error) throw new Error(error.message);

  const row = Array.isArray(data) ? data[0] : null;
  const basePrice = Number(PLANS[planKey].priceMonthly);
  if (!row) {
    return { priceCents: basePrice, referralId: null, partnerId: null, promoApplied: false };
  }

  const promoApplied = planKey === "starter" && row.promo_reserved === true && Number(row.promo_price_cents) > 0;
  return {
    priceCents: promoApplied ? Number(row.promo_price_cents) : basePrice,
    referralId: Number(row.referral_id),
    partnerId: Number(row.partner_id),
    promoApplied,
    campaignKey: row.campaign_key || null,
    commissionPercent: Number(row.commission_percent || 30),
    commissionMonths: Number(row.commission_months || 12),
  };
}

export async function recordPartnerPayment(userId: string, wooviEventId: string, paymentValueCents: number) {
  const { data: referral, error } = await supabaseAdmin
    .from("partner_referrals")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!referral) return { recorded: false };

  const { data: partner, error: partnerError } = await supabaseAdmin
    .from("partner_profiles")
    .select("*")
    .eq("id", referral.partner_id)
    .maybeSingle();
  if (partnerError) throw new Error(partnerError.message);
  if (!partner || partner.status !== "active") return { recorded: false };

  const now = new Date();
  const firstPaidAt = referral.first_paid_at ? new Date(referral.first_paid_at) : now;
  const commissionEnd = new Date(firstPaidAt);
  commissionEnd.setUTCMonth(commissionEnd.getUTCMonth() + Number(partner.commission_months || 12));

  await supabaseAdmin.from("partner_referrals").update({
    status: "paid",
    first_paid_at: referral.first_paid_at || now.toISOString(),
    last_paid_at: now.toISOString(),
    ...(referral.promo_reserved && !referral.redeemed_at ? { redeemed_at: now.toISOString() } : {}),
  }).eq("id", referral.id);

  if (referral.promo_reserved && !referral.redeemed_at && referral.campaign_key) {
    const { data: campaign } = await supabaseAdmin
      .from("promotion_campaigns")
      .select("redeemed_count")
      .eq("key", referral.campaign_key)
      .maybeSingle();
    if (campaign) {
      await supabaseAdmin.from("promotion_campaigns").update({
        redeemed_count: Number(campaign.redeemed_count || 0) + 1,
      }).eq("key", referral.campaign_key);
    }
  }

  if (now > commissionEnd) return { recorded: false, expired: true };

  const percent = Number(partner.commission_percent || 30);
  const commissionValue = Math.round(paymentValueCents * percent / 100);
  const { error: commissionError } = await supabaseAdmin.from("partner_commissions").upsert({
    partner_id: partner.id,
    referral_id: referral.id,
    user_id: userId,
    woovi_event_id: wooviEventId,
    payment_value_cents: paymentValueCents,
    commission_percent: percent,
    commission_value_cents: commissionValue,
    status: "pending",
  }, { onConflict: "woovi_event_id", ignoreDuplicates: true });
  if (commissionError) throw new Error(commissionError.message);
  return { recorded: true, commissionValueCents: commissionValue };
}

export async function applyForPartner(userId: string, input: {
  displayName: string;
  socialHandle?: string | null;
  socialUrl?: string | null;
  audienceSize?: number | null;
  acceptedTerms: true;
}) {
  const { data: existing, error } = await supabaseAdmin
    .from("partner_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);

  if (existing) {
    const { data, error: updateError } = await supabaseAdmin.from("partner_profiles").update({
      display_name: input.displayName,
      social_handle: input.socialHandle || null,
      social_url: input.socialUrl || null,
      audience_size: input.audienceSize ?? null,
      terms_accepted_at: new Date().toISOString(),
      terms_version: "1.0",
    }).eq("id", existing.id).select("*").single();
    if (updateError) throw new Error(updateError.message);
    return data;
  }

  const { data, error: insertError } = await supabaseAdmin.from("partner_profiles").insert({
    user_id: userId,
    display_name: input.displayName,
    social_handle: input.socialHandle || null,
    social_url: input.socialUrl || null,
    audience_size: input.audienceSize ?? null,
    terms_accepted_at: new Date().toISOString(),
    terms_version: "1.0",
    status: "pending",
    commission_percent: 30,
    commission_months: 12,
  }).select("*").single();
  if (insertError) throw new Error(insertError.message);
  return data;
}

export async function updatePartnerPayout(userId: string, payoutPixKey: string) {
  const { error } = await supabaseAdmin.from("partner_profiles").update({
    payout_pix_key: payoutPixKey.trim().slice(0, 200),
  }).eq("user_id", userId);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function getPartnerDashboard(userId: string) {
  const { data: profile, error } = await supabaseAdmin
    .from("partner_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!profile) return { profile: null };

  const [codesResult, clicksResult, referralsResult, commissionsResult, campaignResult] = await Promise.all([
    supabaseAdmin.from("partner_codes").select("*").eq("partner_id", profile.id).eq("active", true).order("created_at"),
    supabaseAdmin.from("partner_clicks").select("id", { count: "exact" }).eq("partner_id", profile.id),
    supabaseAdmin.from("partner_referrals").select("id,status,created_at,first_paid_at,last_paid_at,promo_reserved").eq("partner_id", profile.id).order("created_at", { ascending: false }).limit(100),
    supabaseAdmin.from("partner_commissions").select("*").eq("partner_id", profile.id).order("created_at", { ascending: false }).limit(200),
    supabaseAdmin.from("promotion_campaigns").select("*").eq("key", FOUNDERS_CAMPAIGN).maybeSingle(),
  ]);
  if (codesResult.error) throw new Error(codesResult.error.message);
  if (clicksResult.error) throw new Error(clicksResult.error.message);
  if (referralsResult.error) throw new Error(referralsResult.error.message);
  if (commissionsResult.error) throw new Error(commissionsResult.error.message);
  if (campaignResult.error) throw new Error(campaignResult.error.message);

  const referrals = referralsResult.data || [];
  const commissions = commissionsResult.data || [];
  const sum = (status?: string) => commissions
    .filter((row: any) => !status || row.status === status)
    .reduce((total: number, row: any) => total + Number(row.commission_value_cents || 0), 0);
  const gross = commissions.reduce((total: number, row: any) => total + Number(row.payment_value_cents || 0), 0);
  const campaign = campaignResult.data;
  return {
    profile: {
      id: Number(profile.id),
      displayName: profile.display_name,
      socialHandle: profile.social_handle,
      socialUrl: profile.social_url,
      audienceSize: profile.audience_size,
      status: profile.status,
      commissionPercent: Number(profile.commission_percent),
      commissionMonths: Number(profile.commission_months),
      payoutPixKeyMasked: maskPixKey(profile.payout_pix_key),
      payoutConfigured: !!profile.payout_pix_key,
    },
    codes: (codesResult.data || []).map((row: any) => ({
      id: Number(row.id),
      code: row.code,
      campaignKey: row.campaign_key,
      shareUrl: `https://sindcopilot.com/?ref=${encodeURIComponent(row.code)}`,
    })),
    campaign: campaign ? {
      key: campaign.key,
      name: campaign.name,
      promoPriceCents: Number(campaign.promo_price_cents),
      regularPriceCents: Number(campaign.regular_price_cents),
      maxRedemptions: Number(campaign.max_redemptions),
      reservedCount: Number(campaign.reserved_count),
      redeemedCount: Number(campaign.redeemed_count),
      remaining: Math.max(0, Number(campaign.max_redemptions) - Number(campaign.reserved_count)),
      active: campaign.active,
    } : null,
    metrics: {
      clicks: Number(clicksResult.count || 0),
      leads: referrals.length,
      paidCustomers: referrals.filter((row: any) => row.status === "paid").length,
      grossRevenueCents: gross,
      pendingCommissionCents: sum("pending"),
      approvedCommissionCents: sum("approved"),
      paidCommissionCents: sum("paid"),
    },
    referrals: referrals.map((row: any) => ({
      id: Number(row.id),
      status: row.status,
      promoReserved: row.promo_reserved,
      createdAt: row.created_at,
      firstPaidAt: row.first_paid_at,
      lastPaidAt: row.last_paid_at,
    })),
    commissions: commissions.map((row: any) => ({
      id: Number(row.id),
      paymentValueCents: Number(row.payment_value_cents),
      commissionPercent: Number(row.commission_percent),
      commissionValueCents: Number(row.commission_value_cents),
      status: row.status,
      eligibleAt: row.eligible_at,
      paidAt: row.paid_at,
      createdAt: row.created_at,
    })),
  };
}

async function generateUniqueCode(displayName: string) {
  const prefix = codePrefix(displayName);
  for (let attempt = 0; attempt < 8; attempt++) {
    const suffix = randomBytes(3).toString("hex").toUpperCase();
    const code = `${prefix}-${suffix}`;
    const { data } = await supabaseAdmin.from("partner_codes").select("id").eq("code", code).maybeSingle();
    if (!data) return code;
  }
  throw new Error("Não foi possível gerar um código único.");
}

export async function listPartnerApplications() {
  const { data: profiles, error } = await supabaseAdmin
    .from("partner_profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  const userIds = (profiles || []).map((row: any) => row.user_id);
  const { data: users, error: usersError } = userIds.length
    ? await supabaseAdmin.from("users").select("id,name,email").in("id", userIds)
    : { data: [], error: null } as any;
  if (usersError) throw new Error(usersError.message);
  const userMap = new Map<string, { name: string | null; email: string | null }>((users || []).map((row: any) => [String(row.id), { name: row.name ?? null, email: row.email ?? null }]));
  return (profiles || []).map((row: any) => ({
    id: Number(row.id),
    userId: row.user_id,
    name: userMap.get(String(row.user_id))?.name || row.display_name,
    email: userMap.get(String(row.user_id))?.email || null,
    displayName: row.display_name,
    socialHandle: row.social_handle,
    socialUrl: row.social_url,
    audienceSize: row.audience_size,
    status: row.status,
    commissionPercent: Number(row.commission_percent),
    commissionMonths: Number(row.commission_months),
    payoutConfigured: !!row.payout_pix_key,
    createdAt: row.created_at,
  }));
}

export async function approvePartner(adminUserId: string, partnerId: number) {
  const { data: profile, error } = await supabaseAdmin.from("partner_profiles")
    .update({
      status: "active",
      commission_percent: 30,
      commission_months: 12,
      approved_by: adminUserId,
      approved_at: new Date().toISOString(),
    })
    .eq("id", partnerId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  const { data: existingCode, error: codeError } = await supabaseAdmin.from("partner_codes")
    .select("*")
    .eq("partner_id", partnerId)
    .eq("active", true)
    .maybeSingle();
  if (codeError) throw new Error(codeError.message);
  if (existingCode) return { profile, code: existingCode.code };

  const code = await generateUniqueCode(profile.display_name);
  const { error: insertError } = await supabaseAdmin.from("partner_codes").insert({
    partner_id: partnerId,
    campaign_key: FOUNDERS_CAMPAIGN,
    code,
    active: true,
  });
  if (insertError) throw new Error(insertError.message);
  return { profile, code };
}

export async function pausePartner(partnerId: number) {
  const { error } = await supabaseAdmin.from("partner_profiles").update({ status: "paused" }).eq("id", partnerId);
  if (error) throw new Error(error.message);
  await supabaseAdmin.from("partner_codes").update({ active: false }).eq("partner_id", partnerId);
  return { success: true };
}

export async function listAdminCommissions() {
  const { data: commissions, error } = await supabaseAdmin
    .from("partner_commissions")
    .select("id,partner_id,payment_value_cents,commission_percent,commission_value_cents,status,eligible_at,paid_at,created_at")
    .in("status", ["pending", "approved"])
    .order("eligible_at", { ascending: true })
    .limit(300);
  if (error) throw new Error(error.message);

  const partnerIds = [...new Set((commissions || []).map((row: any) => Number(row.partner_id)))];
  const { data: partners, error: partnersError } = partnerIds.length
    ? await supabaseAdmin
        .from("partner_profiles")
        .select("id,display_name,payout_pix_key")
        .in("id", partnerIds)
    : { data: [], error: null } as any;
  if (partnersError) throw new Error(partnersError.message);

  const partnerMap = new Map((partners || []).map((row: any) => [Number(row.id), row]));
  return (commissions || []).map((row: any) => {
    const partner: any = partnerMap.get(Number(row.partner_id));
    return {
      id: Number(row.id),
      partnerId: Number(row.partner_id),
      partnerName: partner?.display_name || "Parceiro",
      payoutPixKey: partner?.payout_pix_key || null,
      paymentValueCents: Number(row.payment_value_cents),
      commissionPercent: Number(row.commission_percent),
      commissionValueCents: Number(row.commission_value_cents),
      status: row.status,
      eligibleAt: row.eligible_at,
      eligibleNow: new Date(row.eligible_at).getTime() <= Date.now(),
      paidAt: row.paid_at,
      createdAt: row.created_at,
    };
  });
}

export async function markCommissionPaid(commissionId: number) {
  const { data: commission, error: lookupError } = await supabaseAdmin
    .from("partner_commissions")
    .select("id,status,eligible_at")
    .eq("id", commissionId)
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (!commission) throw new Error("Comissão não encontrada.");
  if (!["pending", "approved"].includes(commission.status)) throw new Error("Esta comissão não pode ser marcada como paga.");
  if (new Date(commission.eligible_at).getTime() > Date.now()) throw new Error("A comissão ainda está no período de elegibilidade.");

  const { error } = await supabaseAdmin.from("partner_commissions").update({
    status: "paid",
    paid_at: new Date().toISOString(),
  }).eq("id", commissionId);
  if (error) throw new Error(error.message);
  return { success: true };
}
