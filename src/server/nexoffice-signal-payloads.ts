import { createHash } from "node:crypto";

export type CondoSignalCounts = {
  portfolio: { totalCondominiums: number; activeCondominiums: number; activeAssistants: number };
  compliance: { pending: number; upcoming: number; overdue: number; completed: number; alertsFailed: number };
  documents: { pendingReview: number; ocrPending: number; ocrFailed: number; indexingPending: number; indexingFailed: number };
  notices: { drafts: number; sent: number; cancelled: number };
  suppliers: { total: number; rated: number };
};

export function buildCondoSignalPayloads(ownerId: string, counts: CondoSignalCounts, now = new Date()) {
  const periodEnd = now.toISOString();
  const start = new Date(now); start.setUTCHours(0, 0, 0, 0);
  const periodStart = start.toISOString();
  const day = periodEnd.slice(0, 10);
  const scopeHash = createHash("sha256").update(ownerId).digest("hex").slice(0, 12);
  const base = { sourceProduct: "sindcopilot", externalWorkspaceRef: ownerId, periodStart, periodEnd, dimensions: { window: "day", scope: "workspace" } } as const;
  return [
    { ...base, correlationId: `sindcopilot-${day}-${scopeHash}-portfolio`, signalType: "portfolio.summary", metrics: counts.portfolio },
    { ...base, correlationId: `sindcopilot-${day}-${scopeHash}-compliance`, signalType: "compliance.summary", metrics: counts.compliance },
    { ...base, correlationId: `sindcopilot-${day}-${scopeHash}-documents`, signalType: "documents.summary", metrics: counts.documents },
    { ...base, correlationId: `sindcopilot-${day}-${scopeHash}-notices`, signalType: "notices.summary", metrics: counts.notices },
    { ...base, correlationId: `sindcopilot-${day}-${scopeHash}-suppliers`, signalType: "suppliers.summary", metrics: counts.suppliers },
  ];
}
