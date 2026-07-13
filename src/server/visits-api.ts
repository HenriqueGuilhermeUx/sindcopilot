import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { resolveContextUser, type ContextUser } from "./core/context";
import { supabaseAdmin } from "./core/supabase";
import * as db from "./services/data";

const itemSchema = z.object({
  clientId: z.string().min(1).max(80),
  area: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(240),
  status: z.enum(["ok", "attention", "urgent", "pending"]),
  notes: z.string().trim().max(3000).optional().nullable(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  documentId: z.number().int().positive().optional().nullable(),
});

const completeVisitSchema = z.object({
  condominiumId: z.number().int().positive(),
  startedAt: z.string().datetime(),
  summary: z.string().trim().max(3000).optional().nullable(),
  items: z.array(itemSchema).min(1).max(80),
});

type AuthRequest = Request & { fieldUser?: ContextUser };

async function requireFieldUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await resolveContextUser(req);
    if (!user) return res.status(401).json({ error: "Sessão expirada. Entre novamente." });
    req.fieldUser = user;
    return next();
  } catch (error) {
    console.error("[Field visits auth]", error);
    return res.status(500).json({ error: "Não foi possível validar a sessão." });
  }
}

function access(user: ContextUser) {
  return user as db.Access;
}

function sendError(res: Response, error: unknown) {
  const message = error instanceof Error ? error.message : "Erro inesperado";
  console.error("[Field visits]", error);
  const status = /não encontrad|negado|somente leitura|permiss/i.test(message) ? 403 : 400;
  return res.status(status).json({ error: message });
}

function visitStats(items: z.infer<typeof itemSchema>[]) {
  return {
    totalItems: items.length,
    okCount: items.filter(item => item.status === "ok").length,
    attentionCount: items.filter(item => item.status === "attention").length,
    urgentCount: items.filter(item => item.status === "urgent").length,
    pendingCount: items.filter(item => item.status === "pending").length,
  };
}

export const fieldVisitsRouter = Router();
fieldVisitsRouter.use(requireFieldUser);

fieldVisitsRouter.get("/", async (req: AuthRequest, res) => {
  try {
    const user = req.fieldUser!;
    let query = supabaseAdmin
      .from("field_visits")
      .select("id,condominium_id,performed_by,started_at,completed_at,summary,total_items,ok_count,attention_count,urgent_count,pending_count,created_at,condominiums(name)")
      .eq("user_id", user.accountOwnerId)
      .order("completed_at", { ascending: false })
      .limit(20);

    if (user.allowedCondominiumIds?.length) {
      query = query.in("condominium_id", user.allowedCondominiumIds);
    }

    const { data, error } = await query;
    if (error) throw error;

    const visits = (data || []).map((row: any) => ({
      id: Number(row.id),
      condominiumId: Number(row.condominium_id),
      condominiumName: row.condominiums?.name || "Condomínio",
      startedAt: row.started_at,
      completedAt: row.completed_at,
      summary: row.summary,
      totalItems: Number(row.total_items || 0),
      okCount: Number(row.ok_count || 0),
      attentionCount: Number(row.attention_count || 0),
      urgentCount: Number(row.urgent_count || 0),
      pendingCount: Number(row.pending_count || 0),
    }));

    return res.json({ visits });
  } catch (error) {
    return sendError(res, error);
  }
});

fieldVisitsRouter.get("/:id", async (req: AuthRequest, res) => {
  try {
    const user = req.fieldUser!;
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Visita inválida." });

    const { data: visit, error } = await supabaseAdmin
      .from("field_visits")
      .select("*,condominiums(name)")
      .eq("id", id)
      .eq("user_id", user.accountOwnerId)
      .maybeSingle();

    if (error) throw error;
    if (!visit) return res.status(404).json({ error: "Visita não encontrada." });

    await db.assertCondominium(access(user), Number(visit.condominium_id));

    const { data: items, error: itemError } = await supabaseAdmin
      .from("field_visit_items")
      .select("id,client_id,area,title,status,notes,due_date,document_id,created_at")
      .eq("visit_id", id)
      .order("id", { ascending: true });

    if (itemError) throw itemError;

    return res.json({
      visit: {
        id: Number(visit.id),
        condominiumId: Number(visit.condominium_id),
        condominiumName: visit.condominiums?.name || "Condomínio",
        startedAt: visit.started_at,
        completedAt: visit.completed_at,
        summary: visit.summary,
        totalItems: Number(visit.total_items || 0),
        okCount: Number(visit.ok_count || 0),
        attentionCount: Number(visit.attention_count || 0),
        urgentCount: Number(visit.urgent_count || 0),
        pendingCount: Number(visit.pending_count || 0),
        items: (items || []).map((item: any) => ({
          id: Number(item.id),
          clientId: item.client_id,
          area: item.area,
          title: item.title,
          status: item.status,
          notes: item.notes,
          dueDate: item.due_date,
          documentId: item.document_id ? Number(item.document_id) : null,
        })),
      },
    });
  } catch (error) {
    return sendError(res, error);
  }
});

fieldVisitsRouter.post("/complete", async (req: AuthRequest, res) => {
  const parsed = completeVisitSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Dados da visita inválidos.", details: parsed.error.flatten() });
  }

  const user = req.fieldUser!;
  const input = parsed.data;
  let visitId: number | null = null;

  try {
    await db.assertCondominium(access(user), input.condominiumId, true);
    const stats = visitStats(input.items);
    const completedAt = new Date().toISOString();

    const { data: visit, error } = await supabaseAdmin
      .from("field_visits")
      .insert({
        user_id: user.accountOwnerId,
        condominium_id: input.condominiumId,
        performed_by: user.id,
        status: "completed",
        started_at: input.startedAt,
        completed_at: completedAt,
        summary: input.summary || null,
        total_items: stats.totalItems,
        ok_count: stats.okCount,
        attention_count: stats.attentionCount,
        urgent_count: stats.urgentCount,
        pending_count: stats.pendingCount,
      })
      .select("id")
      .single();

    if (error) throw error;
    visitId = Number(visit.id);

    const rows = input.items.map(item => ({
      visit_id: visitId,
      client_id: item.clientId,
      area: item.area,
      title: item.title,
      status: item.status,
      notes: item.notes || null,
      due_date: item.dueDate || null,
      document_id: item.documentId || null,
    }));

    const { error: itemsError } = await supabaseAdmin.from("field_visit_items").insert(rows);
    if (itemsError) throw itemsError;

    const generatedObligationIds: number[] = [];
    for (const item of input.items) {
      if (!item.dueDate || !["attention", "urgent"].includes(item.status)) continue;

      const id = await db.createObligation(access(user), {
        condominiumId: input.condominiumId,
        title: `[Visita] ${item.title}`,
        description: `${item.area}${item.notes ? ` — ${item.notes}` : ""}`,
        category: "outro",
        dueDate: new Date(`${item.dueDate}T12:00:00.000Z`),
        alertDaysBefore: item.status === "urgent" ? 0 : 2,
        isRecurring: false,
        notes: `Gerado automaticamente pela visita #${visitId}. Prioridade: ${item.status === "urgent" ? "urgente" : "atenção"}.`,
      });
      generatedObligationIds.push(id);
    }

    await db.createActivity(access(user), {
      condominiumId: input.condominiumId,
      type: "field_visit_completed",
      title: `Visita concluída: ${stats.urgentCount} urgente(s), ${stats.attentionCount} atenção`,
      metadata: { visitId, ...stats },
    });

    return res.status(201).json({
      id: visitId,
      completedAt,
      ...stats,
      generatedObligationIds,
    });
  } catch (error) {
    if (visitId) {
      await supabaseAdmin.from("field_visits").delete().eq("id", visitId).catch(() => undefined);
    }
    return sendError(res, error);
  }
});
