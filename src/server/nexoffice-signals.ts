import { ENV } from "./core/env";
import { supabaseAdmin } from "./core/supabase";
import { buildCondoSignalPayloads, type CondoSignalCounts } from "./nexoffice-signal-payloads";

async function count(table: string, configure: (query: any) => any) {
  let query: any = supabaseAdmin.from(table).select("id", { count: "exact", head: true });
  query = configure(query);
  const { count: total, error } = await query;
  if (error) throw error;
  return Number(total || 0);
}

export async function readCondoSignalCounts(ownerId: string): Promise<CondoSignalCounts> {
  const [
    totalCondominiums, activeCondominiums, activeAssistants,
    pending, upcoming, overdue, completed,
    pendingReview, ocrPending, ocrFailed, indexingPending, indexingFailed,
    drafts, sent, cancelled, totalSuppliers, ratedSuppliers,
  ] = await Promise.all([
    count("condominiums", q => q.eq("user_id", ownerId)),
    count("condominiums", q => q.eq("user_id", ownerId).eq("status", "active")),
    count("assistants", q => q.eq("owner_id", ownerId).eq("status", "active")),
    count("obligations", q => q.eq("user_id", ownerId).eq("status", "pending")),
    count("obligations", q => q.eq("user_id", ownerId).eq("status", "upcoming")),
    count("obligations", q => q.eq("user_id", ownerId).eq("status", "overdue")),
    count("obligations", q => q.eq("user_id", ownerId).eq("status", "completed")),
    count("documents", q => q.eq("user_id", ownerId).eq("status", "pending")),
    count("documents", q => q.eq("user_id", ownerId).in("ocr_status", ["pending", "processing"])),
    count("documents", q => q.eq("user_id", ownerId).eq("ocr_status", "failed")),
    count("documents", q => q.eq("user_id", ownerId).in("indexing_status", ["pending", "processing"])),
    count("documents", q => q.eq("user_id", ownerId).eq("indexing_status", "failed")),
    count("notices", q => q.eq("user_id", ownerId).eq("status", "draft")),
    count("notices", q => q.eq("user_id", ownerId).eq("status", "sent")),
    count("notices", q => q.eq("user_id", ownerId).eq("status", "cancelled")),
    count("suppliers", q => q.eq("user_id", ownerId)),
    count("suppliers", q => q.eq("user_id", ownerId).not("rating", "is", null)),
  ]);

  // compliance_alerts has no owner column; keep this metric conservative until a safe owner-scoped join
  // is guaranteed in all deployed schemas. Never broaden with an unscoped service-role query.
  const alertsFailed = 0;

  return {
    portfolio: { totalCondominiums, activeCondominiums, activeAssistants },
    compliance: { pending, upcoming, overdue, completed, alertsFailed },
    documents: { pendingReview, ocrPending, ocrFailed, indexingPending, indexingFailed },
    notices: { drafts, sent, cancelled },
    suppliers: { total: totalSuppliers, rated: ratedSuppliers },
  };
}

async function push(payload: unknown) {
  if (!ENV.NEXOFFICE_BASE_URL || !ENV.NEXOFFICE_INTERNAL_KEY) throw Object.assign(new Error("nexoffice_not_configured"), { status: 503 });
  const response = await fetch(`${ENV.NEXOFFICE_BASE_URL.replace(/\/$/, "")}/v1/platform/condo-signals`, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json", "x-nexoffice-key": ENV.NEXOFFICE_INTERNAL_KEY },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(12_000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(String((body as any)?.message || (body as any)?.error || `NexOffice HTTP ${response.status}`)), { status: response.status, code: (body as any)?.error });
  return body;
}

export async function syncCondoSignals(ownerId: string) {
  if (!ENV.NEXOFFICE_CONDO_SIGNALS_ENABLED) return { enabled: false, synced: false, privacy: "aggregate_only" as const };
  const counts = await readCondoSignalCounts(ownerId);
  const payloads = buildCondoSignalPayloads(ownerId, counts);
  const results = await Promise.all(payloads.map(push));
  return { enabled: true, synced: true, privacy: "aggregate_only" as const, counts, signals: results.map((result: any) => ({ id: result?.signal?.id || null, signalType: result?.signal?.signal_type || null })) };
}
