import { describe, expect, it } from "vitest";
import { buildCondoSignalPayloads, type CondoSignalCounts } from "./nexoffice-signal-payloads";

const counts: CondoSignalCounts = {
  portfolio: { totalCondominiums: 8, activeCondominiums: 7, activeAssistants: 2 },
  compliance: { pending: 6, upcoming: 3, overdue: 2, completed: 12, alertsFailed: 0 },
  documents: { pendingReview: 4, ocrPending: 2, ocrFailed: 1, indexingPending: 3, indexingFailed: 1 },
  notices: { drafts: 5, sent: 14, cancelled: 1 },
  suppliers: { total: 21, rated: 13 },
};

describe("NexOffice Condo Operations payloads", () => {
  it("emits exactly the five aggregate signal families", () => {
    const payloads = buildCondoSignalPayloads("owner-sensitive-uuid", counts, new Date("2026-09-15T18:30:00.000Z"));
    expect(payloads.map(x => x.signalType)).toEqual([
      "portfolio.summary",
      "compliance.summary",
      "documents.summary",
      "notices.summary",
      "suppliers.summary",
    ]);
    expect(payloads).toHaveLength(5);
    expect(payloads.every(x => x.sourceProduct === "sindcopilot")).toBe(true);
    expect(payloads.every(x => x.dimensions.scope === "workspace" && x.dimensions.window === "day")).toBe(true);
  });

  it("contains only aggregate numeric metrics and no condo personal/content data", () => {
    const ownerId = "owner-sensitive-uuid";
    const payloads = buildCondoSignalPayloads(ownerId, counts, new Date("2026-09-15T18:30:00.000Z"));
    for (const payload of payloads) {
      expect(Object.values(payload.metrics).every(value => typeof value === "number" && Number.isInteger(value) && value >= 0)).toBe(true);
      expect(payload.correlationId).not.toContain(ownerId);
    }
    const serialized = JSON.stringify(payloads).toLowerCase();
    for (const forbidden of [
      "residentname", "resident_name", "owner_name", "owner_phone", "owner_email", "cpf", "cnpj",
      "unit", "apartment", "address", "phone", "email", "notice_text", "generated_content", "legal_basis",
      "text_content", "ocr_summary", "file_name", "supplier_name", "document_title", "condominium_name"
    ]) expect(serialized).not.toContain(forbidden);
  });

  it("uses stable same-day correlations for idempotent upserts", () => {
    const first = buildCondoSignalPayloads("owner-sensitive-uuid", counts, new Date("2026-09-15T10:00:00.000Z"));
    const later = buildCondoSignalPayloads("owner-sensitive-uuid", counts, new Date("2026-09-15T22:00:00.000Z"));
    expect(first.map(x => x.correlationId)).toEqual(later.map(x => x.correlationId));
    const nextDay = buildCondoSignalPayloads("owner-sensitive-uuid", counts, new Date("2026-09-16T01:00:00.000Z"));
    expect(first[0].correlationId).not.toBe(nextDay[0].correlationId);
  });
});
