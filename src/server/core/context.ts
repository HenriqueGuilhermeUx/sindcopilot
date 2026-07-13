import type { Request } from "express";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { supabaseAdmin } from "./supabase";

export type AccountRole = "owner" | "assistant" | "viewer";

export type ContextUser = {
  id: string;
  email: string | null;
  name: string | null;
  role: "user" | "admin";
  accountOwnerId: string;
  accountRole: AccountRole;
  allowedCondominiumIds: number[] | null;
};

export type TrpcContext = CreateExpressContextOptions & { user: ContextUser | null };

function bearer(req: Pick<Request, "headers">) {
  const value = req.headers.authorization;
  return value?.startsWith("Bearer ") ? value.slice(7) : null;
}

export async function resolveContextUser(req: Pick<Request, "headers">): Promise<ContextUser | null> {
  const token = bearer(req);
  if (!token) return null;

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user) return null;

  const authUser = authData.user;
  const defaultName =
    (authUser.user_metadata?.name as string | undefined) ||
    authUser.email?.split("@")[0] ||
    null;

  let { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .maybeSingle();

  if (profileError) throw profileError;

  if (!profile) {
    const { data: created, error } = await supabaseAdmin
      .from("users")
      .insert({
        id: authUser.id,
        email: authUser.email ?? null,
        name: defaultName,
        last_signed_in: new Date().toISOString(),
        ...(authUser.user_metadata?.accepted_terms === true
          ? {
              terms_accepted_at: new Date().toISOString(),
              lgpd_consent_at: new Date().toISOString(),
              lgpd_consent_version: String(authUser.user_metadata?.lgpd_version || "1.0"),
            }
          : {}),
      })
      .select("*")
      .single();

    if (error) throw error;
    profile = created;
  } else {
    const { data: updated, error } = await supabaseAdmin
      .from("users")
      .update({
        email: authUser.email ?? profile.email,
        last_signed_in: new Date().toISOString(),
      })
      .eq("id", authUser.id)
      .select("*")
      .single();

    if (error) throw error;
    profile = updated;
  }

  let accountOwnerId = profile.account_owner_id || authUser.id;
  let allowedCondominiumIds: number[] | null = null;
  let accountRole = (profile.account_role || "owner") as AccountRole;

  if (accountOwnerId !== authUser.id) {
    const { data: assistant } = await supabaseAdmin
      .from("assistants")
      .select("role,allowed_condominium_ids,status")
      .eq("owner_id", accountOwnerId)
      .eq("user_id", authUser.id)
      .eq("status", "active")
      .maybeSingle();

    if (!assistant) {
      accountOwnerId = authUser.id;
      accountRole = "owner";
      await supabaseAdmin
        .from("users")
        .update({ account_owner_id: null, account_role: "owner" })
        .eq("id", authUser.id);
    } else {
      accountRole = assistant.role as AccountRole;
      allowedCondominiumIds = Array.isArray(assistant.allowed_condominium_ids)
        ? assistant.allowed_condominium_ids.map(Number)
        : null;
    }
  }

  return {
    id: authUser.id,
    email: authUser.email ?? null,
    name: profile.name ?? defaultName,
    role: (profile.role || "user") as "user" | "admin",
    accountOwnerId,
    accountRole,
    allowedCondominiumIds,
  };
}

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  return { ...opts, user: await resolveContextUser(opts.req) };
}
