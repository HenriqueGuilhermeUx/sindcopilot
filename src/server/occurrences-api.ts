import { Router, type NextFunction, type Request, type Response } from "express";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { resolveContextUser, type ContextUser } from "./core/context";
import { supabaseAdmin } from "./core/supabase";
import * as db from "./services/data";
import { retrieveLegalContext } from "./services/document-ai";
import { structured } from "./services/openai";
import { consume } from "./services/entitlements";

const CATEGORY = z.enum(["barulho", "obra", "pet", "garagem", "area_comum", "convivencia", "seguranca", "dano", "financeiro", "outro"]);
const SEVERITY = z.enum(["low", "medium", "high", "urgent"]);
const STATUS = z.enum(["open", "under_review", "notified", "penalized", "resolved", "archived"]);
const NOTICE_TYPE = z.enum(["notificacao", "advertencia", "multa"]);
const EVIDENCE_KIND = z.enum(["photo", "video", "audio", "document", "testimony", "other"]);

const createSchema = z.object({
  condominiumId: z.number().int().positive(),
  unitId: z.number().int().positive().optional().nullable(),
  title: z.string().trim().min(3).max(240),
  description: z.string().trim().min(3).max(5000),
  category: CATEGORY,
  severity: SEVERITY.default("medium"),
  happenedAt: z.string().datetime().optional(),
  location: z.string().trim().max(240).optional().nullable(),
  reportedBy: z.string().trim().max(200).optional().nullable(),
  reportedChannel: z.enum(["manual", "portaria", "email", "whatsapp", "visit", "other"]).default("manual"),
});

const updateSchema = z.object({
  unitId: z.number().int().positive().optional().nullable(),
  title: z.string().trim().min(3).max(240).optional(),
  description: z.string().trim().min(3).max(5000).optional(),
  category: CATEGORY.optional(),
  severity: SEVERITY.optional(),
  status: STATUS.optional(),
  happenedAt: z.string().datetime().optional(),
  location: z.string().trim().max(240).optional().nullable(),
  reportedBy: z.string().trim().max(200).optional().nullable(),
  reportedChannel: z.enum(["manual", "portaria", "email", "whatsapp", "visit", "other"]).optional(),
  ruleDocumentId: z.number().int().positive().optional().nullable(),
  rulePage: z.number().int().positive().optional().nullable(),
  ruleReference: z.string().trim().max(500).optional().nullable(),
  ruleExcerpt: z.string().trim().max(4000).optional().nullable(),
  resolution: z.string().trim().max(5000).optional().nullable(),
});

const eventSchema = z.object({
  type: z.enum(["note", "defense_received"]),
  title: z.string().trim().min(2).max(240),
  description: z.string().trim().min(2).max(5000),
});

const evidenceSchema = z.object({
  kind: EVIDENCE_KIND,
  description: z.string().trim().max(3000).optional().nullable(),
  witnessName: z.string().trim().max(200).optional().nullable(),
  capturedAt: z.string().datetime().optional().nullable(),
  documentId: z.number().int().positive().optional().nullable(),
  fileBase64: z.string().optional().nullable(),
  fileName: z.string().trim().max(200).optional().nullable(),
  mimeType: z.string().trim().max(120).optional().nullable(),
});

const ALLOWED_EVIDENCE_MIME = new Set([
  "application/pdf",
  "image/jpeg", "image/png", "image/webp",
  "video/mp4", "video/webm",
  "audio/mpeg", "audio/mp4", "audio/webm", "audio/wav", "audio/ogg",
]);
const MAX_EVIDENCE_BYTES = 25 * 1024 * 1024;
const EVIDENCE_BUCKET = "occurrence-evidence";

type AuthRequest = Request & { occurrenceUser?: ContextUser };

function access(user: ContextUser): db.Access {
  return user as db.Access;
}

async function requireUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await resolveContextUser(req);
    if (!user) return res.status(401).json({ error: "Sessão expirada. Entre novamente." });
    req.occurrenceUser = user;
    return next();
  } catch (error) {
    console.error("[Occurrences auth]", error);
    return res.status(500).json({ error: "Não foi possível validar sua sessão." });
  }
}

function sendError(res: Response, error: unknown) {
  const message = error instanceof Error ? error.message : "Erro inesperado";
  console.error("[Occurrences]", error);
  const status = /não encontrad/i.test(message) ? 404 : /negado|somente leitura|permiss/i.test(message) ? 403 : 400;
  return res.status(status).json({ error: message });
}

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(-160) || "evidencia";
}

function rowToOccurrence(row: any) {
  return {
    id: Number(row.id),
    condominiumId: Number(row.condominium_id),
    condominiumName: row.condominiums?.name || "Condomínio",
    condominiumAddress: row.condominiums?.address || null,
    condominiumCity: row.condominiums?.city || null,
    unitId: row.unit_id ? Number(row.unit_id) : null,
    unitNumber: row.units?.number || null,
    unitBlock: row.units?.block || null,
    residentName: row.units?.resident_name || row.units?.owner_name || null,
    createdBy: row.created_by || null,
    title: row.title,
    description: row.description,
    category: row.category,
    severity: row.severity,
    status: row.status,
    happenedAt: row.happened_at,
    location: row.location,
    reportedBy: row.reported_by,
    reportedChannel: row.reported_channel,
    sourceType: row.source_type,
    sourceVisitId: row.source_visit_id ? Number(row.source_visit_id) : null,
    ruleDocumentId: row.rule_document_id ? Number(row.rule_document_id) : null,
    rulePage: row.rule_page ? Number(row.rule_page) : null,
    ruleReference: row.rule_reference,
    ruleExcerpt: row.rule_excerpt,
    resolution: row.resolution,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getOccurrence(user: ContextUser, id: number, write = false) {
  const { data, error } = await supabaseAdmin
    .from("occurrences")
    .select("*,condominiums(name,address,city),units(number,block,resident_name,owner_name)")
    .eq("id", id)
    .eq("user_id", user.accountOwnerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Ocorrência não encontrada");
  await db.assertCondominium(access(user), Number(data.condominium_id), write);
  return { raw: data, occurrence: rowToOccurrence(data) };
}

async function appendEvent(user: ContextUser, occurrenceId: number, input: {
  type: string;
  title: string;
  description?: string | null;
  noticeId?: number | null;
  documentId?: number | null;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await supabaseAdmin.from("occurrence_events").insert({
    occurrence_id: occurrenceId,
    user_id: user.accountOwnerId,
    actor_user_id: user.id,
    type: input.type,
    title: input.title,
    description: input.description || null,
    notice_id: input.noticeId || null,
    document_id: input.documentId || null,
    metadata: input.metadata || {},
  });
  if (error) throw new Error(error.message);
}

async function evidenceWithUrls(rows: any[]) {
  return Promise.all((rows || []).map(async row => {
    let fileUrl: string | null = null;
    if (row.file_key) {
      const { data } = await supabaseAdmin.storage.from(EVIDENCE_BUCKET).createSignedUrl(row.file_key, 900);
      fileUrl = data?.signedUrl || null;
    }
    return {
      id: Number(row.id), occurrenceId: Number(row.occurrence_id), documentId: row.document_id ? Number(row.document_id) : null,
      kind: row.kind, description: row.description, witnessName: row.witness_name, capturedAt: row.captured_at,
      fileName: row.file_name, mimeType: row.mime_type, sizeBytes: Number(row.size_bytes || 0), sha256: row.sha256,
      fileUrl, createdAt: row.created_at,
    };
  }));
}

export async function createOccurrenceFromVisit(user: ContextUser, input: {
  condominiumId: number;
  visitId: number;
  title: string;
  description: string;
  area: string;
  severity: "medium" | "urgent";
  documentId?: number | null;
  happenedAt: string;
}) {
  const existing = await supabaseAdmin
    .from("occurrences")
    .select("id")
    .eq("user_id", user.accountOwnerId)
    .eq("source_type", "visit")
    .eq("source_visit_id", input.visitId)
    .eq("title", input.title)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) return Number(existing.data.id);

  const { data, error } = await supabaseAdmin.from("occurrences").insert({
    user_id: user.accountOwnerId,
    condominium_id: input.condominiumId,
    created_by: user.id,
    title: input.title,
    description: input.description,
    category: "outro",
    severity: input.severity,
    status: "open",
    happened_at: input.happenedAt,
    location: input.area,
    reported_channel: "visit",
    source_type: "visit",
    source_visit_id: input.visitId,
  }).select("id").single();
  if (error) throw new Error(error.message);
  const id = Number(data.id);
  await appendEvent(user, id, { type: "created", title: "Ocorrência criada pelo Modo Visita", description: input.description, metadata: { visitId: input.visitId } });
  if (input.documentId) {
    const { error: evError } = await supabaseAdmin.from("occurrence_evidence").insert({
      occurrence_id: id,
      user_id: user.accountOwnerId,
      document_id: input.documentId,
      kind: "photo",
      description: "Registro fotográfico capturado durante a vistoria.",
      captured_at: input.happenedAt,
      created_by: user.id,
    });
    if (evError) throw new Error(evError.message);
    await appendEvent(user, id, { type: "evidence_added", title: "Foto da vistoria vinculada", documentId: input.documentId });
  }
  return id;
}

export const occurrencesRouter = Router();
occurrencesRouter.use(requireUser);

occurrencesRouter.get("/", async (req: AuthRequest, res) => {
  try {
    const user = req.occurrenceUser!;
    const condominiumId = req.query.condominiumId ? Number(req.query.condominiumId) : null;
    const status = typeof req.query.status === "string" ? req.query.status : null;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    if (condominiumId) await db.assertCondominium(access(user), condominiumId);

    let query = supabaseAdmin
      .from("occurrences")
      .select("*,condominiums(name,address,city),units(number,block,resident_name,owner_name)")
      .eq("user_id", user.accountOwnerId)
      .order("happened_at", { ascending: false })
      .limit(150);
    if (condominiumId) query = query.eq("condominium_id", condominiumId);
    if (status && STATUS.safeParse(status).success) query = query.eq("status", status);
    if (user.allowedCondominiumIds?.length) query = query.in("condominium_id", user.allowedCondominiumIds);
    if (search) query = query.or(`title.ilike.%${search.replace(/[,%()]/g, " ")}%,description.ilike.%${search.replace(/[,%()]/g, " ")}%`);

    const { data, error } = await query;
    if (error) throw error;
    const rows = data || [];
    const ids = rows.map((row: any) => Number(row.id));

    let evidenceRows: any[] = [];
    let noticeRows: any[] = [];
    if (ids.length) {
      const [evidence, notices] = await Promise.all([
        supabaseAdmin.from("occurrence_evidence").select("id,occurrence_id").in("occurrence_id", ids),
        supabaseAdmin.from("notices").select("id,occurrence_id,type,status").in("occurrence_id", ids),
      ]);
      if (evidence.error) throw evidence.error;
      if (notices.error) throw notices.error;
      evidenceRows = evidence.data || [];
      noticeRows = notices.data || [];
    }

    const recurrencePool = await supabaseAdmin
      .from("occurrences")
      .select("id,unit_id,category,happened_at")
      .eq("user_id", user.accountOwnerId)
      .not("unit_id", "is", null)
      .order("happened_at", { ascending: false })
      .limit(1000);
    if (recurrencePool.error) throw recurrencePool.error;

    const occurrences = rows.map((row: any) => {
      const occurrence = rowToOccurrence(row);
      const evidenceCount = evidenceRows.filter((item: any) => Number(item.occurrence_id) === occurrence.id).length;
      const linked = noticeRows.filter((item: any) => Number(item.occurrence_id) === occurrence.id);
      const recurrenceCount = occurrence.unitId
        ? (recurrencePool.data || []).filter((item: any) => Number(item.unit_id) === occurrence.unitId && item.category === occurrence.category && Number(item.id) !== occurrence.id).length
        : 0;
      return { ...occurrence, evidenceCount, noticeCount: linked.length, recurrenceCount };
    });

    const stats = {
      total: occurrences.length,
      open: occurrences.filter(item => ["open", "under_review"].includes(item.status)).length,
      urgent: occurrences.filter(item => item.severity === "urgent" && !["resolved", "archived"].includes(item.status)).length,
      notified: occurrences.filter(item => item.status === "notified").length,
      penalized: occurrences.filter(item => item.status === "penalized").length,
    };
    return res.json({ occurrences, stats });
  } catch (error) {
    return sendError(res, error);
  }
});

occurrencesRouter.post("/", async (req: AuthRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Dados da ocorrência inválidos.", details: parsed.error.flatten() });
  try {
    const user = req.occurrenceUser!;
    const input = parsed.data;
    await db.assertCondominium(access(user), input.condominiumId, true);
    if (input.unitId) {
      const unit: any = await db.getUnit(access(user), input.unitId);
      if (Number(unit.condominiumId) !== input.condominiumId) throw new Error("A unidade não pertence ao condomínio selecionado.");
    }
    const { data, error } = await supabaseAdmin.from("occurrences").insert({
      user_id: user.accountOwnerId,
      condominium_id: input.condominiumId,
      unit_id: input.unitId || null,
      created_by: user.id,
      title: input.title,
      description: input.description,
      category: input.category,
      severity: input.severity,
      status: "open",
      happened_at: input.happenedAt || new Date().toISOString(),
      location: input.location || null,
      reported_by: input.reportedBy || null,
      reported_channel: input.reportedChannel,
      source_type: "manual",
    }).select("id").single();
    if (error) throw error;
    const id = Number(data.id);
    await appendEvent(user, id, { type: "created", title: "Ocorrência registrada", description: input.description });
    await db.createActivity(access(user), { condominiumId: input.condominiumId, type: "occurrence_created", title: `Ocorrência #${id}: ${input.title}` });
    return res.status(201).json({ id });
  } catch (error) {
    return sendError(res, error);
  }
});

occurrencesRouter.get("/:id", async (req: AuthRequest, res) => {
  try {
    const user = req.occurrenceUser!;
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Ocorrência inválida." });
    const { occurrence } = await getOccurrence(user, id);
    const [evidenceQuery, eventsQuery, noticesQuery] = await Promise.all([
      supabaseAdmin.from("occurrence_evidence").select("*").eq("occurrence_id", id).eq("user_id", user.accountOwnerId).order("created_at"),
      supabaseAdmin.from("occurrence_events").select("*").eq("occurrence_id", id).eq("user_id", user.accountOwnerId).order("created_at"),
      supabaseAdmin.from("notices").select("*").eq("occurrence_id", id).eq("user_id", user.accountOwnerId).order("created_at"),
    ]);
    if (evidenceQuery.error) throw evidenceQuery.error;
    if (eventsQuery.error) throw eventsQuery.error;
    if (noticesQuery.error) throw noticesQuery.error;

    const previous = occurrence.unitId
      ? await supabaseAdmin.from("occurrences").select("id,title,severity,status,happened_at,resolution").eq("user_id", user.accountOwnerId).eq("unit_id", occurrence.unitId).eq("category", occurrence.category).neq("id", id).order("happened_at", { ascending: false }).limit(20)
      : { data: [], error: null } as any;
    if (previous.error) throw previous.error;

    return res.json({
      occurrence,
      evidence: await evidenceWithUrls(evidenceQuery.data || []),
      events: (eventsQuery.data || []).map((row: any) => ({
        id: Number(row.id), type: row.type, title: row.title, description: row.description,
        noticeId: row.notice_id ? Number(row.notice_id) : null, documentId: row.document_id ? Number(row.document_id) : null,
        metadata: row.metadata || {}, createdAt: row.created_at,
      })),
      notices: (noticesQuery.data || []).map((row: any) => ({
        id: Number(row.id), type: row.type, subject: row.subject, description: row.description,
        generatedContent: row.generated_content, legalBasis: row.legal_basis, sourceRefs: row.source_refs || [], warning: row.warning,
        status: row.status, sentAt: row.sent_at, createdAt: row.created_at,
      })),
      previousOccurrences: (previous.data || []).map((row: any) => ({
        id: Number(row.id), title: row.title, severity: row.severity, status: row.status, happenedAt: row.happened_at, resolution: row.resolution,
      })),
    });
  } catch (error) {
    return sendError(res, error);
  }
});

occurrencesRouter.patch("/:id", async (req: AuthRequest, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Alterações inválidas.", details: parsed.error.flatten() });
  try {
    const user = req.occurrenceUser!;
    const id = Number(req.params.id);
    const { occurrence } = await getOccurrence(user, id, true);
    const input = parsed.data;
    if (input.unitId) {
      const unit: any = await db.getUnit(access(user), input.unitId);
      if (Number(unit.condominiumId) !== occurrence.condominiumId) throw new Error("A unidade não pertence ao condomínio desta ocorrência.");
    }
    if (input.ruleDocumentId) {
      const document: any = await db.getDocument(access(user), input.ruleDocumentId);
      if (Number(document.condominiumId) !== occurrence.condominiumId) throw new Error("O documento selecionado pertence a outro condomínio.");
    }
    const map: Record<string, string> = {
      unitId: "unit_id", title: "title", description: "description", category: "category", severity: "severity", status: "status",
      happenedAt: "happened_at", location: "location", reportedBy: "reported_by", reportedChannel: "reported_channel",
      ruleDocumentId: "rule_document_id", rulePage: "rule_page", ruleReference: "rule_reference", ruleExcerpt: "rule_excerpt", resolution: "resolution",
    };
    const payload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) if (map[key]) payload[map[key]] = value;
    if (input.status === "resolved") payload.resolved_at = new Date().toISOString();
    if (input.status && input.status !== "resolved") payload.resolved_at = null;
    const { error } = await supabaseAdmin.from("occurrences").update(payload).eq("id", id).eq("user_id", user.accountOwnerId);
    if (error) throw error;
    if (input.status && input.status !== occurrence.status) {
      await appendEvent(user, id, {
        type: input.status === "resolved" ? "resolved" : input.status === "open" && ["resolved", "archived"].includes(occurrence.status) ? "reopened" : "status_changed",
        title: input.status === "resolved" ? "Caso encerrado" : input.status === "open" ? "Caso reaberto" : "Status atualizado",
        description: input.resolution || `${occurrence.status} → ${input.status}`,
      });
    }
    return res.json({ success: true });
  } catch (error) {
    return sendError(res, error);
  }
});

occurrencesRouter.post("/:id/events", async (req: AuthRequest, res) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Registro inválido." });
  try {
    const user = req.occurrenceUser!;
    const id = Number(req.params.id);
    await getOccurrence(user, id, true);
    await appendEvent(user, id, parsed.data);
    if (parsed.data.type === "defense_received") {
      await supabaseAdmin.from("occurrences").update({ status: "under_review" }).eq("id", id).eq("user_id", user.accountOwnerId);
    }
    return res.status(201).json({ success: true });
  } catch (error) {
    return sendError(res, error);
  }
});

occurrencesRouter.post("/:id/evidence", async (req: AuthRequest, res) => {
  const parsed = evidenceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Evidência inválida.", details: parsed.error.flatten() });
  try {
    const user = req.occurrenceUser!;
    const id = Number(req.params.id);
    const { occurrence } = await getOccurrence(user, id, true);
    const input = parsed.data;
    if (input.kind === "testimony" && !input.description) throw new Error("Descreva o relato ou testemunho.");
    if (input.documentId) {
      const document: any = await db.getDocument(access(user), input.documentId);
      if (Number(document.condominiumId) !== occurrence.condominiumId) throw new Error("O documento pertence a outro condomínio.");
    }

    let fileKey: string | null = null;
    let fileName: string | null = null;
    let mimeType: string | null = null;
    let sizeBytes = 0;
    let sha256: string | null = null;
    if (input.fileBase64) {
      if (!input.fileName || !input.mimeType) throw new Error("Nome e formato do arquivo são obrigatórios.");
      if (!ALLOWED_EVIDENCE_MIME.has(input.mimeType)) throw new Error("Formato de evidência não permitido.");
      const buffer = Buffer.from(input.fileBase64, "base64");
      if (!buffer.length) throw new Error("Arquivo vazio.");
      if (buffer.length > MAX_EVIDENCE_BYTES) throw new Error("A evidência deve ter no máximo 25 MB.");
      fileName = sanitizeFileName(input.fileName);
      mimeType = input.mimeType;
      sizeBytes = buffer.length;
      sha256 = createHash("sha256").update(buffer).digest("hex");
      fileKey = `${user.accountOwnerId}/${occurrence.condominiumId}/${id}/${Date.now()}-${randomUUID()}-${fileName}`;
      const { error: uploadError } = await supabaseAdmin.storage.from(EVIDENCE_BUCKET).upload(fileKey, buffer, { contentType: mimeType, upsert: false, cacheControl: "3600" });
      if (uploadError) throw new Error(`Não foi possível armazenar a evidência: ${uploadError.message}`);
    }

    const { data, error } = await supabaseAdmin.from("occurrence_evidence").insert({
      occurrence_id: id,
      user_id: user.accountOwnerId,
      document_id: input.documentId || null,
      kind: input.kind,
      description: input.description || null,
      witness_name: input.witnessName || null,
      captured_at: input.capturedAt || new Date().toISOString(),
      file_key: fileKey,
      file_name: fileName,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      sha256,
      created_by: user.id,
    }).select("id").single();
    if (error) {
      if (fileKey) await supabaseAdmin.storage.from(EVIDENCE_BUCKET).remove([fileKey]).catch(() => undefined);
      throw error;
    }
    const evidenceId = Number(data.id);
    await appendEvent(user, id, {
      type: "evidence_added",
      title: input.kind === "testimony" ? "Relato/testemunho registrado" : "Evidência adicionada",
      description: input.description || fileName || undefined,
      documentId: input.documentId || null,
      metadata: sha256 ? { evidenceId, sha256 } : { evidenceId },
    });
    return res.status(201).json({ id: evidenceId, sha256 });
  } catch (error) {
    return sendError(res, error);
  }
});

occurrencesRouter.delete("/:id/evidence/:evidenceId", async (req: AuthRequest, res) => {
  try {
    const user = req.occurrenceUser!;
    const id = Number(req.params.id);
    const evidenceId = Number(req.params.evidenceId);
    await getOccurrence(user, id, true);
    const { data, error } = await supabaseAdmin.from("occurrence_evidence").select("file_key").eq("id", evidenceId).eq("occurrence_id", id).eq("user_id", user.accountOwnerId).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Evidência não encontrada");
    if (data.file_key) await supabaseAdmin.storage.from(EVIDENCE_BUCKET).remove([data.file_key]);
    const removed = await supabaseAdmin.from("occurrence_evidence").delete().eq("id", evidenceId).eq("occurrence_id", id).eq("user_id", user.accountOwnerId);
    if (removed.error) throw removed.error;
    await appendEvent(user, id, { type: "note", title: "Evidência removida", description: `Evidência #${evidenceId} removida do caso.` });
    return res.json({ success: true });
  } catch (error) {
    return sendError(res, error);
  }
});

occurrencesRouter.get("/:id/rule-suggestions", async (req: AuthRequest, res) => {
  try {
    const user = req.occurrenceUser!;
    const id = Number(req.params.id);
    const { occurrence } = await getOccurrence(user, id);
    const sources = await retrieveLegalContext(access(user), occurrence.condominiumId, `${occurrence.title}\n${occurrence.description}`, 6);
    return res.json({
      suggestions: sources.map((source: any) => ({
        documentId: Number(source.documentId), title: source.title, pageNumber: source.pageNumber ? Number(source.pageNumber) : null,
        excerpt: String(source.content || "").slice(0, 1800), source: source.source,
      })),
    });
  } catch (error) {
    return sendError(res, error);
  }
});

occurrencesRouter.get("/:id/consistency", async (req: AuthRequest, res) => {
  try {
    const user = req.occurrenceUser!;
    const id = Number(req.params.id);
    const plannedAction = NOTICE_TYPE.safeParse(req.query.plannedAction).success ? String(req.query.plannedAction) : "advertencia";
    const { occurrence } = await getOccurrence(user, id);
    const [evidence, events, comparable] = await Promise.all([
      supabaseAdmin.from("occurrence_evidence").select("id").eq("occurrence_id", id).eq("user_id", user.accountOwnerId),
      supabaseAdmin.from("occurrence_events").select("type").eq("occurrence_id", id).eq("user_id", user.accountOwnerId),
      supabaseAdmin.from("occurrences").select("id,unit_id,status,severity,happened_at").eq("user_id", user.accountOwnerId).eq("condominium_id", occurrence.condominiumId).eq("category", occurrence.category).neq("id", id).gte("happened_at", new Date(Date.now() - 365 * 86400000).toISOString()).limit(250),
    ]);
    if (evidence.error) throw evidence.error;
    if (events.error) throw events.error;
    if (comparable.error) throw comparable.error;

    const comparableRows = comparable.data || [];
    const sameUnit = occurrence.unitId ? comparableRows.filter((row: any) => Number(row.unit_id) === occurrence.unitId) : [];
    const otherUnits = occurrence.unitId ? comparableRows.filter((row: any) => row.unit_id && Number(row.unit_id) !== occurrence.unitId) : comparableRows;
    const otherPenalized = otherUnits.filter((row: any) => row.status === "penalized").length;
    const evidenceCount = evidence.data?.length || 0;
    const hasPriorNotice = (events.data || []).some((row: any) => ["notice_sent", "penalty_applied"].includes(row.type));

    const checks: Array<{ key: string; status: "pass" | "warn" | "info"; label: string; detail: string }> = [];
    checks.push(evidenceCount > 0
      ? { key: "evidence", status: "pass", label: "Evidências registradas", detail: `${evidenceCount} evidência(s) vinculada(s) ao caso.` }
      : { key: "evidence", status: "warn", label: "Sem evidência registrada", detail: "Adicione foto, documento, áudio, vídeo ou testemunho antes de uma medida disciplinar." });
    checks.push(occurrence.ruleDocumentId || occurrence.ruleExcerpt
      ? { key: "rule", status: "pass", label: "Regra vinculada", detail: occurrence.ruleReference || "Há regra interna vinculada ao caso." }
      : { key: "rule", status: "warn", label: "Regra ainda não vinculada", detail: "Consulte Convenção/Regimento e associe a fonte aplicável antes de concluir a medida." });
    checks.push(sameUnit.length > 0
      ? { key: "recurrence", status: "pass", label: "Histórico da unidade localizado", detail: `${sameUnit.length} ocorrência(s) anterior(es) da mesma categoria nos últimos 12 meses.` }
      : { key: "recurrence", status: "info", label: "Sem reincidência registrada", detail: "Não encontramos ocorrência anterior desta categoria para a unidade nos últimos 12 meses." });
    checks.push(otherUnits.length > 0
      ? { key: "comparables", status: "info", label: "Casos semelhantes encontrados", detail: `${otherUnits.length} caso(s) semelhante(s) em outras unidades; ${otherPenalized} terminou(aram) com penalidade. Revise os critérios aplicados para manter tratamento consistente.` }
      : { key: "comparables", status: "info", label: "Sem comparáveis recentes", detail: "Não há casos semelhantes em outras unidades nos últimos 12 meses para comparação." });
    if (plannedAction === "multa" && !hasPriorNotice && sameUnit.length === 0) {
      checks.push({ key: "escalation", status: "warn", label: "Escalonamento merece revisão", detail: "Não há advertência/notificação anterior ou reincidência registrada neste caso. Confirme se a regra permite multa direta e revise a proporcionalidade." });
    } else {
      checks.push({ key: "escalation", status: "pass", label: "Histórico processual disponível", detail: hasPriorNotice ? "Há medida anterior registrada na linha do tempo." : "O histórico disponível pode ser revisado antes da decisão." });
    }

    const warningCount = checks.filter(check => check.status === "warn").length;
    const readiness = Math.max(20, 100 - warningCount * 25);
    return res.json({ plannedAction, readiness, checks, disclaimer: "Verificação de processo e consistência. Não substitui análise jurídica nem decide a penalidade." });
  } catch (error) {
    return sendError(res, error);
  }
});

occurrencesRouter.post("/:id/notices", async (req: AuthRequest, res) => {
  const parsed = z.object({ type: NOTICE_TYPE, subject: z.string().trim().max(240).optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Tipo de documento inválido." });
  try {
    const user = req.occurrenceUser!;
    const id = Number(req.params.id);
    const { occurrence } = await getOccurrence(user, id, true);
    await consume(user.accountOwnerId, "notices");
    const sources = await retrieveLegalContext(access(user), occurrence.condominiumId, `${occurrence.title}\n${occurrence.description}`, 8);
    const context = sources.map((source: any) => `[FONTE ${source.source}] Documento: ${source.title}; página: ${source.pageNumber || "não identificada"}\n${source.content}`).join("\n\n");
    const result = await structured<any>({
      system: "Você redige apenas MINUTAS condominiais para revisão humana. Não invente fatos, artigos, cláusulas ou penalidades. Use somente bases presentes nas fontes fornecidas. Diferencie fato registrado de alegação. Evite linguagem acusatória. Se a base for insuficiente, sinalize claramente.",
      prompt: `Caso #${id}\nCondomínio: ${occurrence.condominiumName}\nUnidade: ${occurrence.unitNumber || "não informada"}\nTipo desejado: ${parsed.data.type}\nAssunto: ${parsed.data.subject || occurrence.title}\nFato registrado: ${occurrence.description}\nData do fato: ${occurrence.happenedAt}\nRegra já vinculada: ${occurrence.ruleReference || "não vinculada"}\nTrecho já vinculado: ${occurrence.ruleExcerpt || "não vinculado"}\n\nFONTES INTERNAS:\n${context || "Nenhuma fonte interna encontrada."}`,
      schema: {
        name: "occurrence_notice_draft",
        schema: {
          type: "object",
          properties: {
            titulo: { type: "string" }, conteudo: { type: "string" }, base_legal: { type: ["string", "null"] },
            source_numbers: { type: "array", items: { type: "integer" } }, warning: { type: ["string", "null"] },
          },
          required: ["titulo", "conteudo", "base_legal", "source_numbers", "warning"],
          additionalProperties: false,
        },
      },
    });
    const selected = sources.filter((source: any) => (result.source_numbers || []).includes(source.source));
    const warning = result.warning || (!selected.length ? "Não foi localizada base interna suficiente. Revise a minuta e a regra aplicável antes de utilizar." : null);
    const { data, error } = await supabaseAdmin.from("notices").insert({
      condominium_id: occurrence.condominiumId,
      user_id: user.accountOwnerId,
      unit_id: occurrence.unitId,
      occurrence_id: id,
      type: parsed.data.type,
      subject: result.titulo || parsed.data.subject || occurrence.title,
      description: occurrence.description,
      generated_content: result.conteudo,
      legal_basis: result.base_legal,
      source_refs: selected,
      warning,
      status: "draft",
    }).select("id").single();
    if (error) throw error;
    const noticeId = Number(data.id);
    await appendEvent(user, id, { type: "notice_created", title: `Minuta de ${parsed.data.type} criada`, noticeId, description: result.titulo || occurrence.title });
    await supabaseAdmin.from("occurrences").update({ status: "under_review" }).eq("id", id).eq("user_id", user.accountOwnerId);
    return res.status(201).json({ id: noticeId, content: result.conteudo, legalBasis: result.base_legal, title: result.titulo, warning, sources: selected });
  } catch (error) {
    return sendError(res, error);
  }
});

occurrencesRouter.post("/:id/notices/:noticeId/sent", async (req: AuthRequest, res) => {
  try {
    const user = req.occurrenceUser!;
    const id = Number(req.params.id);
    const noticeId = Number(req.params.noticeId);
    await getOccurrence(user, id, true);
    const { data: notice, error } = await supabaseAdmin.from("notices").select("id,type,status,subject").eq("id", noticeId).eq("occurrence_id", id).eq("user_id", user.accountOwnerId).maybeSingle();
    if (error) throw error;
    if (!notice) throw new Error("Minuta vinculada não encontrada");
    if (notice.status !== "sent") {
      const updated = await supabaseAdmin.from("notices").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", noticeId).eq("user_id", user.accountOwnerId);
      if (updated.error) throw updated.error;
      const isPenalty = notice.type === "multa";
      await appendEvent(user, id, { type: isPenalty ? "penalty_applied" : "notice_sent", title: isPenalty ? "Multa registrada como aplicada" : `${notice.type === "advertencia" ? "Advertência" : "Notificação"} registrada como enviada`, noticeId, description: notice.subject });
      const status = isPenalty ? "penalized" : "notified";
      await supabaseAdmin.from("occurrences").update({ status }).eq("id", id).eq("user_id", user.accountOwnerId);
    }
    return res.json({ success: true });
  } catch (error) {
    return sendError(res, error);
  }
});
