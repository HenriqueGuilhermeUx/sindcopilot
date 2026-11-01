import { ENV } from "../core/env";
import { supabaseAdmin } from "../core/supabase";

type ReviewAccount = { email?: string; password?: string; name: string };

const accounts: ReviewAccount[] = [
  { email: ENV.REVIEW_ACCOUNT_1_EMAIL, password: ENV.REVIEW_ACCOUNT_1_PASSWORD, name: "SindCopilot Review 1" },
  { email: ENV.REVIEW_ACCOUNT_2_EMAIL, password: ENV.REVIEW_ACCOUNT_2_PASSWORD, name: "SindCopilot Review 2" },
  { email: ENV.REVIEW_ACCOUNT_3_EMAIL, password: ENV.REVIEW_ACCOUNT_3_PASSWORD, name: "SindCopilot Review 3" },
];

async function ensureSampleData(userId: string, ordinal: number) {
  const { count, error } = await supabaseAdmin
    .from("condominiums")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw error;
  if ((count || 0) > 0) return;

  const { data: condos, error: condoError } = await supabaseAdmin.from("condominiums").insert([
    {
      user_id: userId,
      name: ordinal === 1 ? "Residencial Horizonte" : `Residencial Demonstração ${ordinal}A`,
      address: "Av. Exemplo, 100",
      city: "Santos",
      state: "SP",
      status: "active",
      notes: "Dados demonstrativos para revisão do aplicativo.",
    },
    {
      user_id: userId,
      name: ordinal === 1 ? "Condomínio Atlântico" : `Residencial Demonstração ${ordinal}B`,
      address: "Rua Modelo, 250",
      city: "Santos",
      state: "SP",
      status: "active",
      notes: "Dados demonstrativos para revisão do aplicativo.",
    },
  ]).select("id,name");
  if (condoError) throw condoError;
  if (!condos?.length) return;

  for (const condo of condos) {
    await supabaseAdmin.from("units").insert([
      { condominium_id: condo.id, number: "101", block: "A", owner_name: "Morador Demonstração" },
      { condominium_id: condo.id, number: "204", block: "B", resident_name: "Residente Demonstração" },
    ]);
    await supabaseAdmin.from("obligations").insert([
      {
        condominium_id: condo.id,
        user_id: userId,
        title: "Renovação do seguro predial",
        description: "Obrigação demonstrativa para revisão.",
        category: "seguro",
        due_date: new Date(Date.now() + 18 * 86400000).toISOString(),
        alert_days_before: 30,
        status: "upcoming",
      },
      {
        condominium_id: condo.id,
        user_id: userId,
        title: "Inspeção de extintores",
        description: "Obrigação demonstrativa para revisão.",
        category: "extintores",
        due_date: new Date(Date.now() + 40 * 86400000).toISOString(),
        alert_days_before: 30,
        status: "pending",
      },
    ]);
    await supabaseAdmin.from("activities").insert({
      user_id: userId,
      condominium_id: condo.id,
      type: "review_seed",
      title: "Ambiente de demonstração preparado",
      description: "Conta de revisão com acesso integral ao SindCopilot.",
    });
  }

  await supabaseAdmin.from("suppliers").insert([
    { user_id: userId, name: "Elevadores Demonstração", category: "Elevadores", rating: 5, notes: "Fornecedor demonstrativo." },
    { user_id: userId, name: "Manutenção Predial Demo", category: "Manutenção", rating: 4, notes: "Fornecedor demonstrativo." },
  ]);
}

async function ensureAccount(account: ReviewAccount, ordinal: number) {
  if (!account.email || !account.password) return null;

  let { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .select("id,email")
    .eq("email", account.email)
    .maybeSingle();
  if (profileError) throw profileError;

  let userId = profile?.id as string | undefined;

  if (!userId) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: {
        name: account.name,
        accepted_terms: true,
        lgpd_version: "2.3",
        review_account: true,
      },
    });
    if (error || !data.user) throw error || new Error("Conta de revisão não criada");
    userId = data.user.id;
  } else {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: account.password,
      email_confirm: true,
      user_metadata: {
        name: account.name,
        accepted_terms: true,
        lgpd_version: "2.3",
        review_account: true,
      },
    });
    if (error) throw error;
  }

  const activeUntil = new Date();
  activeUntil.setUTCFullYear(activeUntil.getUTCFullYear() + 5);

  const { error: updateError } = await supabaseAdmin.from("users").update({
    name: account.name,
    email: account.email,
    plan: "scale",
    woovi_status: "active",
    woovi_current_period_end: activeUntil.toISOString(),
    profile_completed: true,
    terms_accepted_at: new Date().toISOString(),
    lgpd_consent_at: new Date().toISOString(),
    lgpd_consent_version: "2.3",
  }).eq("id", userId);
  if (updateError) throw updateError;

  await ensureSampleData(userId, ordinal);
  return userId;
}

export async function provisionReviewAccounts() {
  const configured = accounts.filter(account => account.email && account.password);
  if (!configured.length) return { configured: 0, provisioned: 0 };

  let provisioned = 0;
  for (let index = 0; index < accounts.length; index++) {
    const id = await ensureAccount(accounts[index], index + 1);
    if (id) provisioned++;
  }
  console.log(`[Review accounts] ${provisioned}/${configured.length} provisionadas`);
  return { configured: configured.length, provisioned };
}
