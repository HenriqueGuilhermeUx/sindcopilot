import { supabase } from "@/lib/supabase";
import { apiUrl } from "@/lib/runtime";

export type OccurrenceCategory = "barulho" | "obra" | "pet" | "garagem" | "area_comum" | "convivencia" | "seguranca" | "dano" | "financeiro" | "outro";
export type OccurrenceSeverity = "low" | "medium" | "high" | "urgent";
export type OccurrenceStatus = "open" | "under_review" | "notified" | "penalized" | "resolved" | "archived";
export type NoticeType = "notificacao" | "advertencia" | "multa";
export type EvidenceKind = "photo" | "video" | "audio" | "document" | "testimony" | "other";

export type OccurrenceListItem = {
  id: number;
  condominiumId: number;
  condominiumName: string;
  unitId: number | null;
  unitNumber: string | null;
  unitBlock: string | null;
  residentName: string | null;
  title: string;
  description: string;
  category: OccurrenceCategory;
  severity: OccurrenceSeverity;
  status: OccurrenceStatus;
  happenedAt: string;
  location: string | null;
  reportedBy: string | null;
  reportedChannel: string;
  sourceType: string;
  sourceVisitId: number | null;
  ruleDocumentId: number | null;
  rulePage: number | null;
  ruleReference: string | null;
  ruleExcerpt: string | null;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  evidenceCount: number;
  noticeCount: number;
  recurrenceCount: number;
};

export type OccurrenceEvidence = {
  id: number;
  occurrenceId: number;
  documentId: number | null;
  kind: EvidenceKind;
  description: string | null;
  witnessName: string | null;
  capturedAt: string | null;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number;
  sha256: string | null;
  fileUrl: string | null;
  createdAt: string;
};

export type OccurrenceEvent = {
  id: number;
  type: string;
  title: string;
  description: string | null;
  noticeId: number | null;
  documentId: number | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type LinkedNotice = {
  id: number;
  type: NoticeType;
  subject: string;
  description: string | null;
  generatedContent: string | null;
  legalBasis: string | null;
  sourceRefs: any[];
  warning: string | null;
  status: string;
  sentAt: string | null;
  createdAt: string;
};

export type OccurrenceDetail = {
  occurrence: OccurrenceListItem & { condominiumAddress?: string | null; condominiumCity?: string | null };
  evidence: OccurrenceEvidence[];
  events: OccurrenceEvent[];
  notices: LinkedNotice[];
  previousOccurrences: Array<{ id: number; title: string; severity: string; status: string; happenedAt: string; resolution: string | null }>;
};

async function occurrenceApi<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sua sessão expirou. Entre novamente.");
  const response = await fetch(apiUrl(`/api/occurrences${path}`), {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "Não foi possível concluir a operação.");
  return payload;
}

export async function listOccurrences(filters?: { condominiumId?: number | null; status?: string; search?: string }) {
  const params = new URLSearchParams();
  if (filters?.condominiumId) params.set("condominiumId", String(filters.condominiumId));
  if (filters?.status && filters.status !== "all") params.set("status", filters.status);
  if (filters?.search) params.set("search", filters.search);
  return occurrenceApi<{ occurrences: OccurrenceListItem[]; stats: { total: number; open: number; urgent: number; notified: number; penalized: number } }>(`/?${params.toString()}`);
}

export async function getOccurrenceDetail(id: number) {
  return occurrenceApi<OccurrenceDetail>(`/${id}`);
}

export async function createOccurrence(input: {
  condominiumId: number;
  unitId?: number | null;
  title: string;
  description: string;
  category: OccurrenceCategory;
  severity: OccurrenceSeverity;
  happenedAt?: string;
  location?: string | null;
  reportedBy?: string | null;
  reportedChannel?: "manual" | "portaria" | "email" | "whatsapp" | "visit" | "other";
}) {
  return occurrenceApi<{ id: number }>("/", { method: "POST", body: JSON.stringify(input) });
}

export async function updateOccurrence(id: number, input: Record<string, unknown>) {
  return occurrenceApi<{ success: true }>(`/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export async function addOccurrenceEvent(id: number, input: { type: "note" | "defense_received"; title: string; description: string }) {
  return occurrenceApi<{ success: true }>(`/${id}/events`, { method: "POST", body: JSON.stringify(input) });
}

export async function addOccurrenceEvidence(id: number, input: {
  kind: EvidenceKind;
  description?: string | null;
  witnessName?: string | null;
  capturedAt?: string | null;
  documentId?: number | null;
  fileBase64?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
}) {
  return occurrenceApi<{ id: number; sha256: string | null }>(`/${id}/evidence`, { method: "POST", body: JSON.stringify(input) });
}

export async function deleteOccurrenceEvidence(id: number, evidenceId: number) {
  return occurrenceApi<{ success: true }>(`/${id}/evidence/${evidenceId}`, { method: "DELETE" });
}

export async function getRuleSuggestions(id: number) {
  return occurrenceApi<{ suggestions: Array<{ documentId: number; title: string; pageNumber: number | null; excerpt: string; source: number }> }>(`/${id}/rule-suggestions`);
}

export async function checkOccurrenceConsistency(id: number, plannedAction: NoticeType) {
  return occurrenceApi<{
    plannedAction: NoticeType;
    readiness: number;
    checks: Array<{ key: string; status: "pass" | "warn" | "info"; label: string; detail: string }>;
    disclaimer: string;
  }>(`/${id}/consistency?plannedAction=${plannedAction}`);
}

export async function generateOccurrenceNotice(id: number, type: NoticeType, subject?: string) {
  return occurrenceApi<{ id: number; content: string; legalBasis: string | null; title: string; warning: string | null; sources: any[] }>(`/${id}/notices`, {
    method: "POST",
    body: JSON.stringify({ type, subject }),
  });
}

export async function markOccurrenceNoticeSent(id: number, noticeId: number) {
  return occurrenceApi<{ success: true }>(`/${id}/notices/${noticeId}/sent`, { method: "POST", body: "{}" });
}

export async function fileToBase64(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || "");
      resolve(value.includes(",") ? value.split(",")[1] : value);
    };
    reader.onerror = () => reject(reader.error || new Error("Não foi possível preparar o arquivo."));
    reader.readAsDataURL(file);
  });
}
