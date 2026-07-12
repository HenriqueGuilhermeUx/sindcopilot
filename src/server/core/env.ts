import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  APP_URL: z.string().url().default("http://localhost:5173"),
  CRON_SECRET: z.string().min(16).default("development-cron-secret-change-me"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  SUPABASE_STORAGE_BUCKET: z.string().default("documents"),
  OPENAI_API_KEY: z.string().min(10).optional(),
  OPENAI_MODEL: z.string().default("gpt-5-mini"),
  OPENAI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
  WOOVI_API_URL: z.string().url().default("https://api.woovi.com"),
  WOOVI_APP_ID: z.string().min(10).optional(),
  WOOVI_WEBHOOK_AUTH_TOKEN: z.string().min(16).optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("SindCopilot <onboarding@resend.dev>"),
  CONTACT_EMAIL: z.string().email().default("henriquecampos66@gmail.com"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Variáveis de ambiente inválidas:", parsed.error.flatten().fieldErrors);
  throw new Error("Configuração de ambiente inválida");
}
export const ENV = parsed.data;
