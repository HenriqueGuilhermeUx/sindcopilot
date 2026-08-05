import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./router";
import { createContext } from "./core/context";
import { ENV } from "./core/env";
import { supabaseAdmin } from "./core/supabase";
import { processWooviEvent, verifyWooviWebhook } from "./services/woovi";
import { cancelAccountSubscription } from "./services/account-subscription";
import { runComplianceSweep } from "./services/compliance";
import { fieldVisitsRouter } from "./visits-api";

const app = express();
app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "cross-origin" } }));

function parseWooviPayload(rawBody: Buffer): unknown {
  const firstParse = JSON.parse(rawBody.toString("utf8"));
  if (typeof firstParse === "string") return JSON.parse(firstParse);
  return firstParse;
}

function isWooviRegistrationTest(payload: unknown): payload is {
  data_criacao: string;
  evento: "teste_webhook";
  event: string;
} {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;
  const body = payload as Record<string, unknown>;
  const keys = Object.keys(body).sort();
  return (
    keys.length === 3 &&
    keys[0] === "data_criacao" &&
    keys[1] === "event" &&
    keys[2] === "evento" &&
    typeof body.data_criacao === "string" &&
    body.evento === "teste_webhook" &&
    typeof body.event === "string" &&
    body.event.startsWith("OPENPIX:")
  );
}

app.get("/api/woovi/webhook", (_req, res) => res.status(200).send(""));
app.head("/api/woovi/webhook", (_req, res) => res.status(200).end());

app.post("/api/woovi/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(typeof req.body === "string" ? req.body : JSON.stringify(req.body || {}));

    let payload: unknown;
    try {
      payload = parseWooviPayload(rawBody);
    } catch {
      return res.status(400).send("JSON inválido");
    }

    if (isWooviRegistrationTest(payload)) return res.status(200).send("");

    const signature = req.headers["x-webhook-signature"];
    if (typeof signature !== "string") return res.status(400).send("Assinatura Woovi ausente");
    if (!verifyWooviWebhook(rawBody, signature)) return res.status(401).send("Assinatura Woovi inválida");

    if (ENV.WOOVI_WEBHOOK_AUTH_TOKEN) {
      const authorization = req.headers.authorization || "";
      const accepted =
        authorization === ENV.WOOVI_WEBHOOK_AUTH_TOKEN ||
        authorization === `Bearer ${ENV.WOOVI_WEBHOOK_AUTH_TOKEN}`;
      if (!accepted) return res.status(401).send("Autorização do webhook inválida");
    }

    await processWooviEvent(payload);
    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error("[Woovi webhook]", error);
    return res.status(400).send(error?.message || "Webhook inválido");
  }
});

app.use(express.json({ limit: "28mb" }));
app.use(express.urlencoded({ extended: true, limit: "28mb" }));
app.use("/api", rateLimit({ windowMs: 60_000, limit: 180, standardHeaders: "draft-7", legacyHeaders: false }));
app.use("/api/trpc/ai", rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false }));

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "SindCopilot", version: "1.2.0" }));

app.delete("/api/account", async (req, res) => {
  try {
    const authorization = req.headers.authorization || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!token) return res.status(401).json({ error: "Sessão necessária" });

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData.user) return res.status(401).json({ error: "Sessão inválida" });

    const userId = authData.user.id;
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("account_owner_id,woovi_subscription_id")
      .eq("id", userId)
      .maybeSingle();
    if (profileError) throw profileError;

    const ownerId = profile?.account_owner_id || userId;
    if (ownerId === userId && profile?.woovi_subscription_id) {
      try {
        await cancelAccountSubscription(profile.woovi_subscription_id);
      } catch (error) {
        console.error("[Account deletion subscription cancellation]", error);
        return res.status(502).json({
          error:
            "Não foi possível cancelar sua assinatura antes da exclusão. Tente novamente ou contate o suporte para evitar novas cobranças.",
        });
      }
    }

    if (ownerId === userId) {
      const { data: documents, error: documentsError } = await supabaseAdmin
        .from("documents")
        .select("file_key")
        .eq("user_id", ownerId);
      if (documentsError) throw documentsError;
      const keys = (documents || []).map((row: any) => row.file_key).filter(Boolean);
      for (let index = 0; index < keys.length; index += 100) {
        const { error } = await supabaseAdmin.storage
          .from(ENV.SUPABASE_STORAGE_BUCKET)
          .remove(keys.slice(index, index + 100));
        if (error) console.error("[Account deletion storage]", error);
      }
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("[Account deletion]", error);
    return res.status(500).json({ error: "Não foi possível excluir a conta agora. Contate o suporte." });
  }
});

app.post("/api/cron/compliance", async (req, res) => {
  if (req.headers.authorization !== `Bearer ${ENV.CRON_SECRET}`) return res.status(401).json({ error: "unauthorized" });
  try { return res.json(await runComplianceSweep()); }
  catch (error: any) { console.error(error); return res.status(500).json({ error: error?.message || "cron failed" }); }
});

app.use("/api/field-visits", fieldVisitsRouter);
app.use("/api/trpc", createExpressMiddleware({
  router: appRouter,
  createContext,
  onError({ error, path }) { console.error(`[tRPC] ${path || "unknown"}`, error); },
}));

if (ENV.NODE_ENV === "production") {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const clientDir = path.resolve(__dirname, "../client");
  app.use(express.static(clientDir, { maxAge: "1h", index: false }));
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(clientDir, "index.html"));
  });
}

app.listen(ENV.PORT, "0.0.0.0", () => console.log(`SindCopilot rodando em 0.0.0.0:${ENV.PORT}`));
