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
import { processWooviEvent, verifyWooviWebhook } from "./services/woovi";
import { runComplianceSweep } from "./services/compliance";

const app = express();
app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "cross-origin" } }));

app.post("/api/woovi/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const rawBody = req.body as Buffer;
    const signature = req.headers["x-webhook-signature"];
    if (typeof signature !== "string") return res.status(400).send("Assinatura Woovi ausente");
    if (!verifyWooviWebhook(rawBody, signature)) return res.status(401).send("Assinatura Woovi inválida");
    if (ENV.WOOVI_WEBHOOK_AUTH_TOKEN) {
      const authorization = req.headers.authorization || "";
      const accepted = authorization === ENV.WOOVI_WEBHOOK_AUTH_TOKEN || authorization === `Bearer ${ENV.WOOVI_WEBHOOK_AUTH_TOKEN}`;
      if (!accepted) return res.status(401).send("Autorização do webhook inválida");
    }
    const payload = JSON.parse(rawBody.toString("utf8"));
    await processWooviEvent(payload);
    return res.json({ received: true });
  } catch (error: any) {
    console.error("[Woovi webhook]", error);
    return res.status(400).send(error?.message || "Webhook inválido");
  }
});

app.use(express.json({ limit: "28mb" }));
app.use(express.urlencoded({ extended: true, limit: "28mb" }));
app.use("/api", rateLimit({ windowMs: 60_000, limit: 180, standardHeaders: "draft-7", legacyHeaders: false }));
app.use("/api/trpc/ai", rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false }));

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "SindCopilot", version: "1.0.0" }));
app.post("/api/cron/compliance", async (req, res) => {
  if (req.headers.authorization !== `Bearer ${ENV.CRON_SECRET}`) return res.status(401).json({ error: "unauthorized" });
  try { return res.json(await runComplianceSweep()); }
  catch (error: any) { console.error(error); return res.status(500).json({ error: error?.message || "cron failed" }); }
});

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
