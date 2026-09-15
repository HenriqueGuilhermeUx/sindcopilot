import { Router, type Request } from "express";
import { ENV } from "./core/env";
import { supabaseAdmin } from "./core/supabase";
import { mapSindCopilotRole, type NexOfficeMemberRole, type SindCopilotAccountRole } from "./nexoffice-identity";

export const nexofficeRouter = Router();

type AccountProfile = {
  id: string;
  email: string | null;
  name: string | null;
  company: string | null;
  account_owner_id: string | null;
  account_role: SindCopilotAccountRole | null;
};

function bearer(req: Request) {
  const authorization = req.headers.authorization || "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

async function authenticatedAccount(req: Request) {
  const token = bearer(req);
  if (!token) return null;
  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user?.id || !authData.user.email) return null;

  const userId = authData.user.id;
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .select("id,email,name,company,account_owner_id,account_role")
    .eq("id", userId)
    .maybeSingle();
  if (profileError || !profile) throw profileError || new Error("profile_not_found");

  const current = profile as AccountProfile;
  const ownerId = current.account_owner_id || current.id;
  let owner = current;
  if (ownerId !== current.id) {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id,email,name,company,account_owner_id,account_role")
      .eq("id", ownerId)
      .maybeSingle();
    if (error || !data) throw error || new Error("account_owner_not_found");
    owner = data as AccountProfile;
  }

  return {
    authUser: authData.user,
    current,
    owner,
    ownerId,
    memberRole: mapSindCopilotRole(current.account_role, ownerId === current.id),
  };
}

async function nexoffice<T>(path: string, method: "GET" | "POST", body?: unknown): Promise<T> {
  if (!ENV.NEXOFFICE_BASE_URL || !ENV.NEXOFFICE_INTERNAL_KEY) {
    const error = new Error("nexoffice_not_configured");
    (error as any).status = 503;
    throw error;
  }
  const response = await fetch(`${ENV.NEXOFFICE_BASE_URL.replace(/\/$/, "")}${path}`, {
    method,
    headers: {
      accept: "application/json",
      "x-nexoffice-key": ENV.NEXOFFICE_INTERNAL_KEY,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(12_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(String((payload as any)?.message || (payload as any)?.error || `NexOffice HTTP ${response.status}`));
    (error as any).status = response.status;
    (error as any).code = (payload as any)?.error;
    throw error;
  }
  return payload as T;
}

function businessName(owner: AccountProfile) {
  return String(owner.company || owner.name || "Operação SindCopilot").trim().slice(0, 180);
}

function provisionBody(profile: AccountProfile, owner: AccountProfile, ownerId: string, memberRole: NexOfficeMemberRole) {
  if (!profile.email) throw Object.assign(new Error("profile_email_required"), { status: 409 });
  return {
    sourceProduct: "sindcopilot",
    externalWorkspaceRef: ownerId,
    businessName: businessName(owner),
    vertical: "condo",
    ownerEmail: profile.email.toLowerCase(),
    ownerName: String(profile.name || profile.email.split("@")[0] || "Usuário SindCopilot").slice(0, 160),
    memberRole,
    externalUserSubject: profile.id,
    entitlements: ["addon.sindcopilot"],
  };
}

nexofficeRouter.get("/health", async (req, res) => {
  try {
    const account = await authenticatedAccount(req);
    if (!account) return res.status(401).json({ ok: false, error: "unauthorized" });
    const configured = Boolean(ENV.NEXOFFICE_BASE_URL && ENV.NEXOFFICE_INTERNAL_KEY);
    if (!configured) return res.json({ ok: true, configured: false, reachable: false, featureEnabled: process.env.VITE_NEXOFFICE_ENABLED === "true", capabilities: [], externalEffects: false });
    const upstream = await nexoffice<any>("/v1/platform/health", "GET");
    return res.json({
      ok: true,
      configured: true,
      reachable: true,
      featureEnabled: process.env.VITE_NEXOFFICE_ENABLED === "true",
      service: String(upstream?.service || "nexoffice-platform"),
      capabilities: Array.isArray(upstream?.capabilities) ? upstream.capabilities : [],
      externalEffects: upstream?.externalEffects === true,
      workspaceMode: account.ownerId === account.current.id ? "owner" : "shared",
      memberRole: account.memberRole,
    });
  } catch (error: any) {
    console.error("[SindCopilot NexOffice health]", error?.message || error);
    const configured = Boolean(ENV.NEXOFFICE_BASE_URL && ENV.NEXOFFICE_INTERNAL_KEY);
    return res.status(Number(error?.status || 502)).json({ ok: false, configured, reachable: false, error: error?.code || error?.message || "nexoffice_unreachable" });
  }
});

nexofficeRouter.post("/handoff", async (req, res) => {
  try {
    const account = await authenticatedAccount(req);
    if (!account) return res.status(401).json({ ok: false, error: "unauthorized" });
    if (!account.owner.email) return res.status(409).json({ ok: false, error: "account_owner_email_required" });

    // Garante primeiro o titular real da conta. Assim um assistente nunca cria
    // sozinho um workspace compartilhado sem owner.
    await nexoffice("/v1/platform/provision", "POST", provisionBody(account.owner, account.owner, account.ownerId, "owner"));

    if (account.current.id !== account.ownerId) {
      await nexoffice("/v1/platform/provision", "POST", provisionBody(account.current, account.owner, account.ownerId, account.memberRole));
    }

    const handoff = await nexoffice<any>("/v1/platform/handoff", "POST", {
      sourceProduct: "sindcopilot",
      externalWorkspaceRef: account.ownerId,
      externalUserSubject: account.current.id,
      email: String(account.current.email || account.authUser.email).toLowerCase(),
    });
    if (!handoff?.url || !handoff?.expiresAt) return res.status(502).json({ ok: false, error: "invalid_nexoffice_handoff" });

    return res.json({
      ok: true,
      url: handoff.url,
      expiresAt: handoff.expiresAt,
      vertical: "condo",
      sharedWorkspace: account.current.id !== account.ownerId,
      memberRole: account.memberRole,
    });
  } catch (error: any) {
    console.error("[SindCopilot NexOffice handoff]", error?.message || error);
    const status = Number(error?.status || 502);
    return res.status(status >= 400 && status < 600 ? status : 502).json({ ok: false, error: error?.code || error?.message || "nexoffice_unavailable" });
  }
});