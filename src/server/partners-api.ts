import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { resolveContextUser, type ContextUser } from "./core/context";
import {
  applyForPartner,
  approvePartner,
  claimPartnerReferral,
  getPartnerDashboard,
  getPublicPartnerOffer,
  listPartnerApplications,
  markCommissionPaid,
  pausePartner,
  trackPartnerClick,
  updatePartnerPayout,
} from "./services/partners";

type PartnerRequest = Request & { partnerUser?: ContextUser };

const trackSchema = z.object({
  code: z.string().min(2).max(50),
  visitorId: z.string().min(8).max(120),
  referrer: z.string().max(500).optional().nullable(),
});

const claimSchema = z.object({
  code: z.string().min(2).max(50),
});

const applySchema = z.object({
  displayName: z.string().trim().min(2).max(160),
  socialHandle: z.string().trim().max(160).optional().nullable(),
  socialUrl: z.string().trim().url().max(500).optional().nullable().or(z.literal("")),
  audienceSize: z.number().int().min(0).max(100_000_000).optional().nullable(),
});

const payoutSchema = z.object({
  payoutPixKey: z.string().trim().min(3).max(200),
});

async function requireUser(req: PartnerRequest, res: Response, next: NextFunction) {
  try {
    const user = await resolveContextUser(req);
    if (!user) return res.status(401).json({ error: "Entre na sua conta para continuar." });
    req.partnerUser = user;
    return next();
  } catch (error) {
    console.error("[Partners auth]", error);
    return res.status(500).json({ error: "Não foi possível validar sua sessão." });
  }
}

function requireAdmin(req: PartnerRequest, res: Response, next: NextFunction) {
  if (req.partnerUser?.role !== "admin") return res.status(403).json({ error: "Acesso administrativo necessário." });
  return next();
}

function sendError(res: Response, error: unknown) {
  const message = error instanceof Error ? error.message : "Erro inesperado";
  console.error("[Partners]", error);
  return res.status(400).json({ error: message });
}

export const partnersRouter = Router();

partnersRouter.get("/offer/:code", async (req, res) => {
  try {
    const offer = await getPublicPartnerOffer(String(req.params.code || ""));
    if (!offer) return res.status(404).json({ error: "Código de parceiro inválido ou inativo." });
    return res.json(offer);
  } catch (error) {
    return sendError(res, error);
  }
});

partnersRouter.post("/track", async (req, res) => {
  const parsed = trackSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Dados de rastreamento inválidos." });
  try {
    return res.json(await trackPartnerClick(parsed.data));
  } catch (error) {
    return sendError(res, error);
  }
});

partnersRouter.use(requireUser);

partnersRouter.get("/me", async (req: PartnerRequest, res) => {
  try {
    return res.json(await getPartnerDashboard(req.partnerUser!.id));
  } catch (error) {
    return sendError(res, error);
  }
});

partnersRouter.post("/apply", async (req: PartnerRequest, res) => {
  const parsed = applySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Dados da parceria inválidos.", details: parsed.error.flatten() });
  try {
    const data = await applyForPartner(req.partnerUser!.id, {
      ...parsed.data,
      socialUrl: parsed.data.socialUrl || null,
    });
    return res.status(201).json({ profile: data });
  } catch (error) {
    return sendError(res, error);
  }
});

partnersRouter.post("/claim", async (req: PartnerRequest, res) => {
  const parsed = claimSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Código inválido." });
  try {
    return res.json(await claimPartnerReferral(req.partnerUser!.accountOwnerId, parsed.data.code));
  } catch (error) {
    return sendError(res, error);
  }
});

partnersRouter.patch("/payout", async (req: PartnerRequest, res) => {
  const parsed = payoutSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Informe uma chave Pix válida." });
  try {
    return res.json(await updatePartnerPayout(req.partnerUser!.id, parsed.data.payoutPixKey));
  } catch (error) {
    return sendError(res, error);
  }
});

partnersRouter.get("/admin/list", requireAdmin, async (_req: PartnerRequest, res) => {
  try {
    return res.json({ partners: await listPartnerApplications() });
  } catch (error) {
    return sendError(res, error);
  }
});

partnersRouter.post("/admin/:id/approve", requireAdmin, async (req: PartnerRequest, res) => {
  try {
    return res.json(await approvePartner(req.partnerUser!.id, Number(req.params.id)));
  } catch (error) {
    return sendError(res, error);
  }
});

partnersRouter.post("/admin/:id/pause", requireAdmin, async (req: PartnerRequest, res) => {
  try {
    return res.json(await pausePartner(Number(req.params.id)));
  } catch (error) {
    return sendError(res, error);
  }
});

partnersRouter.post("/admin/commissions/:id/paid", requireAdmin, async (req: PartnerRequest, res) => {
  try {
    return res.json(await markCommissionPaid(Number(req.params.id)));
  } catch (error) {
    return sendError(res, error);
  }
});
