import { Router, type NextFunction, type Request, type Response } from "express";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import * as XLSX from "xlsx";
import { resolveContextUser, type ContextUser } from "./core/context";
import { supabaseAdmin } from "./core/supabase";
import * as db from "./services/data";
import { extractPages, structured } from "./services/openai";

const BUCKET = "finance-statements";
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const importSchema = z.object({
  condominiumId: z.number().int().positive(),
  fileBase64: z.string().min(10),
  fileName: z.string().trim().min(1).max(220),
  mimeType: z.string().trim().max(160).optional().default("application/octet-stream"),
  bankName: z.string().trim().max(160).optional().nullable(),
  accountName: z.string().trim().max(160).optional().nullable(),
});

const balanceSchema = z.object({
  openingBalance: z.number().finite().nullable(),
  bankClosingBalance: z.number().finite().nullable(),
});

const transactionUpdateSchema = z.object({
  category: z.string().trim().min(2).max(120),
  subcategory: z.string().trim().max(120).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  learn: z.boolean().optional().default(true),
});

const closingSchema = z.object({
  condominiumId: z.number().int().positive(),
  month: z.string().regex(MONTH_RE),
  notes: z.string().trim().max(3000).optional().nullable(),
});

type AuthRequest = Request & { financeUser?: ContextUser };
type Direction = "income" | "expense";
type ParsedTransaction = {
  postedAt: string;
  description: string;
  amount: number;
  direction: Direction;
  sourceLine: number;
  externalId?: string | null;
};
type ParsedStatement = {
  transactions: ParsedTransaction[];
  periodStart: string | null;
  periodEnd: string | null;
  openingBalance: number | null;
  closingBalance: number | null;
  metadata: Record<string, unknown>;
};

type Classification = {
  category: string;
  subcategory: string | null;
  confidence: number;
  source: "system" | "rule" | "ai" | "manual";
  needsReview: boolean;
};

function access(user: ContextUser): db.Access { return user as db.Access; }

async function requireUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await resolveContextUser(req);
    if (!user) return res.status(401).json({ error: "Sessão expirada. Entre novamente." });
    req.financeUser = user;
    return next();
  } catch (error) {
    console.error("[Finance auth]", error);
    return res.status(500).json({ error: "Não foi possível validar sua sessão." });
  }
}

function sendError(res: Response, error: unknown) {
  const message = error instanceof Error ? error.message : "Erro inesperado";
  console.error("[Finance]", error);
  const status = /não encontrad/i.test(message) ? 404 : /negado|somente leitura|permiss/i.test(message) ? 403 : /duplicado|já foi importado/i.test(message) ? 409 : 400;
  return res.status(status).json({ error: message });
}

function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(-180) || "extrato";
}

function roundMoney(value: number) { return Math.round((value + Number.EPSILON) * 100) / 100; }

function parseMoney(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? roundMoney(value) : null;
  let text = String(value ?? "").trim();
  if (!text) return null;
  const negativeByParenthesis = /^\(.*\)$/.test(text);
  const debitSuffix = /\bD\s*$/i.test(text);
  text = text.replace(/[R$\s]/g, "").replace(/[DC]$/i, "").replace(/[()]/g, "");
  const comma = text.lastIndexOf(",");
  const dot = text.lastIndexOf(".");
  if (comma >= 0 && dot >= 0) {
    text = comma > dot ? text.replace(/\./g, "").replace(",", ".") : text.replace(/,/g, "");
  } else if (comma >= 0) {
    text = text.replace(/\./g, "").replace(",", ".");
  }
  text = text.replace(/[^0-9+-.]/g, "");
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return null;
  const signed = (negativeByParenthesis || debitSuffix) ? -Math.abs(parsed) : parsed;
  return roundMoney(signed);
}

function parseDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const text = String(value ?? "").trim();
  if (!text) return null;
  const iso = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const br = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (br) {
    const year = br[3].length === 2 ? `20${br[3]}` : br[3];
    return `${year}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
  }
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function splitDelimitedLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === delimiter && !quoted) {
      cells.push(cell.trim()); cell = "";
    } else cell += ch;
  }
  cells.push(cell.trim());
  return cells;
}

function delimitedRows(buffer: Buffer) {
  let text = buffer.toString("utf8");
  if (text.includes("�")) text = buffer.toString("latin1");
  text = text.replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  const sample = lines.slice(0, 8).join("\n");
  const delimiters = [";", ",", "\t"];
  const delimiter = delimiters.map(d => ({ d, n: sample.split(d).length })).sort((a, b) => b.n - a.n)[0]?.d || ";";
  return lines.map(line => splitDelimitedLine(line, delimiter));
}

const DATE_HEADERS = ["data", "date", "dt", "data lancamento", "data movimento", "movimento"];
const DESC_HEADERS = ["descricao", "historico", "memo", "lancamento", "description", "detalhes", "transacao"];
const AMOUNT_HEADERS = ["valor", "amount", "valor lancamento", "movimento valor"];
const DEBIT_HEADERS = ["debito", "debitos", "saida", "saidas", "valor debito"];
const CREDIT_HEADERS = ["credito", "creditos", "entrada", "entradas", "valor credito"];
const BALANCE_HEADERS = ["saldo", "balance", "saldo conta"];

function headerIndex(headers: string[], aliases: string[]) {
  return headers.findIndex(h => aliases.some(alias => h === alias || h.includes(alias)));
}

function rowsToStatement(rows: unknown[][]): ParsedStatement {
  const candidates = rows.slice(0, Math.min(rows.length, 20));
  let best = { index: -1, score: -1, headers: [] as string[] };
  candidates.forEach((row, index) => {
    const headers = row.map(normalize);
    const score = [DATE_HEADERS, DESC_HEADERS, AMOUNT_HEADERS, DEBIT_HEADERS, CREDIT_HEADERS, BALANCE_HEADERS]
      .reduce((sum, aliases) => sum + (headerIndex(headers, aliases) >= 0 ? 1 : 0), 0);
    if (score > best.score) best = { index, score, headers };
  });
  if (best.index < 0 || best.score < 2) throw new Error("Não identifiquei as colunas do extrato. Use CSV/XLSX com data, descrição e valor (ou débito/crédito).");

  const dateCol = headerIndex(best.headers, DATE_HEADERS);
  const descCol = headerIndex(best.headers, DESC_HEADERS);
  const amountCol = headerIndex(best.headers, AMOUNT_HEADERS);
  const debitCol = headerIndex(best.headers, DEBIT_HEADERS);
  const creditCol = headerIndex(best.headers, CREDIT_HEADERS);
  const balanceCol = headerIndex(best.headers, BALANCE_HEADERS);
  if (dateCol < 0 || (amountCol < 0 && debitCol < 0 && creditCol < 0)) throw new Error("O extrato precisa ter data e valor, ou colunas de débito/crédito.");

  const transactions: ParsedTransaction[] = [];
  let openingBalance: number | null = null;
  let closingBalance: number | null = null;

  for (let index = best.index + 1; index < rows.length; index++) {
    const row = rows[index] || [];
    const description = String(row[descCol >= 0 ? descCol : 0] ?? "").trim();
    const descriptionNorm = normalize(description);
    const rowBalance = balanceCol >= 0 ? parseMoney(row[balanceCol]) : null;
    if (/saldo (anterior|inicial|abertura)/.test(descriptionNorm)) {
      if (rowBalance != null) openingBalance = rowBalance;
      else if (amountCol >= 0) openingBalance = parseMoney(row[amountCol]);
      continue;
    }
    if (/saldo (final|atual|disponivel|encerramento)/.test(descriptionNorm)) {
      if (rowBalance != null) closingBalance = rowBalance;
      else if (amountCol >= 0) closingBalance = parseMoney(row[amountCol]);
      continue;
    }
    const postedAt = parseDate(row[dateCol]);
    if (!postedAt) continue;

    let amount: number | null = null;
    if (amountCol >= 0) amount = parseMoney(row[amountCol]);
    if ((amount == null || amount === 0) && (debitCol >= 0 || creditCol >= 0)) {
      const debit = debitCol >= 0 ? parseMoney(row[debitCol]) : null;
      const credit = creditCol >= 0 ? parseMoney(row[creditCol]) : null;
      if (credit != null && credit !== 0) amount = Math.abs(credit);
      else if (debit != null && debit !== 0) amount = -Math.abs(debit);
    }
    if (amount == null || amount === 0) continue;
    const desc = description || `Lançamento ${index + 1}`;
    transactions.push({ postedAt, description: desc, amount, direction: amount > 0 ? "income" : "expense", sourceLine: index + 1 });
    if (rowBalance != null) closingBalance = rowBalance;
  }

  if (!transactions.length) throw new Error("Nenhum lançamento financeiro foi identificado no arquivo.");
  const dates = transactions.map(t => t.postedAt).sort();
  return { transactions, periodStart: dates[0], periodEnd: dates[dates.length - 1], openingBalance, closingBalance, metadata: { headerRow: best.index + 1 } };
}

function parseOfx(buffer: Buffer): ParsedStatement {
  const text = buffer.toString("utf8");
  const transactions: ParsedTransaction[] = [];
  const blocks = text.match(/<STMTTRN>[\s\S]*?(?=<STMTTRN>|<\/BANKTRANLIST>|<\/STMTTRN>)/gi) || [];
  const tag = (block: string, name: string) => block.match(new RegExp(`<${name}>([^<\\r\\n]+)`, "i"))?.[1]?.trim() || null;
  blocks.forEach((block, index) => {
    const dateRaw = tag(block, "DTPOSTED") || "";
    const dateMatch = dateRaw.match(/^(\d{4})(\d{2})(\d{2})/);
    const postedAt = dateMatch ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` : null;
    const amount = parseMoney(tag(block, "TRNAMT"));
    if (!postedAt || amount == null || amount === 0) return;
    const description = tag(block, "MEMO") || tag(block, "NAME") || tag(block, "TRNTYPE") || `Lançamento ${index + 1}`;
    transactions.push({ postedAt, description, amount, direction: amount > 0 ? "income" : "expense", sourceLine: index + 1, externalId: tag(block, "FITID") });
  });
  if (!transactions.length) throw new Error("Nenhum lançamento foi identificado no arquivo OFX.");
  const ledger = text.match(/<LEDGERBAL>[\s\S]*?<BALAMT>([^<\r\n]+)/i);
  const opening = text.match(/<AVAILBAL>[\s\S]*?<BALAMT>([^<\r\n]+)/i);
  const dates = transactions.map(t => t.postedAt).sort();
  return {
    transactions,
    periodStart: dates[0], periodEnd: dates[dates.length - 1],
    openingBalance: null,
    closingBalance: parseMoney(ledger?.[1] ?? opening?.[1]),
    metadata: { bankId: text.match(/<BANKID>([^<\r\n]+)/i)?.[1]?.trim() || null, accountId: text.match(/<ACCTID>([^<\r\n]+)/i)?.[1]?.trim() || null },
  };
}

async function parsePdf(buffer: Buffer, fileName: string): Promise<ParsedStatement> {
  const pages = await extractPages(buffer, fileName, "application/pdf");
  const text = pages.map(p => `PÁGINA ${p.pageNumber}\n${p.text}`).join("\n").slice(0, 120_000);
  const result = await structured<{
    transactions: Array<{ date: string; description: string; amount: number; direction: Direction }>;
    opening_balance: number | null;
    closing_balance: number | null;
  }>({
    system: "Você extrai lançamentos de extratos bancários brasileiros. Não invente lançamentos. Saldo não é transação. Valores de saída devem ser expense e entrada income. Preserve centavos.",
    prompt: `Extraia todos os lançamentos do extrato abaixo. Converta datas para YYYY-MM-DD. amount deve ser sempre positivo; direction informa entrada ou saída. Se o extrato mostrar saldo inicial/final, retorne-os; caso contrário use null.\n\n${text}`,
    schema: {
      name: "bank_statement_extract",
      schema: {
        type: "object",
        properties: {
          transactions: { type: "array", items: { type: "object", properties: { date: { type: "string" }, description: { type: "string" }, amount: { type: "number" }, direction: { type: "string", enum: ["income", "expense"] } }, required: ["date", "description", "amount", "direction"], additionalProperties: false } },
          opening_balance: { type: ["number", "null"] },
          closing_balance: { type: ["number", "null"] },
        },
        required: ["transactions", "opening_balance", "closing_balance"], additionalProperties: false,
      },
    },
  });
  const transactions = result.transactions.map((t, index) => ({
    postedAt: parseDate(t.date) || t.date,
    description: t.description.trim(),
    amount: roundMoney(t.direction === "expense" ? -Math.abs(t.amount) : Math.abs(t.amount)),
    direction: t.direction,
    sourceLine: index + 1,
  })).filter(t => /^\d{4}-\d{2}-\d{2}$/.test(t.postedAt) && t.description && t.amount !== 0);
  if (!transactions.length) throw new Error("O PDF foi lido, mas nenhum lançamento pôde ser identificado. Tente CSV, XLSX ou OFX para maior precisão.");
  const dates = transactions.map(t => t.postedAt).sort();
  return { transactions, periodStart: dates[0], periodEnd: dates[dates.length - 1], openingBalance: result.opening_balance, closingBalance: result.closing_balance, metadata: { pages: pages.length, extraction: "pdf-ai" } };
}

function detectFormat(fileName: string, mimeType: string): "csv" | "xlsx" | "ofx" | "pdf" {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".ofx") || /ofx/.test(mimeType)) return "ofx";
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls") || /spreadsheet|excel/.test(mimeType)) return "xlsx";
  if (lower.endsWith(".pdf") || mimeType === "application/pdf") return "pdf";
  if (lower.endsWith(".csv") || /csv|text\/plain/.test(mimeType)) return "csv";
  throw new Error("Formato não suportado. Envie CSV, XLSX, OFX ou PDF.");
}

async function parseStatement(buffer: Buffer, fileName: string, mimeType: string) {
  const format = detectFormat(fileName, mimeType);
  if (format === "ofx") return { format, parsed: parseOfx(buffer) };
  if (format === "csv") return { format, parsed: rowsToStatement(delimitedRows(buffer)) };
  if (format === "xlsx") {
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new Error("A planilha não possui uma aba legível.");
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: "", dateNF: "yyyy-mm-dd" });
    return { format, parsed: rowsToStatement(rows) };
  }
  return { format, parsed: await parsePdf(buffer, fileName) };
}

const RULES: Array<{ terms: string[]; direction?: Direction; category: string; subcategory?: string; confidence: number }> = [
  { terms: ["elevador", "otis", "thyssen", "atlas schindler"], direction: "expense", category: "Manutenção", subcategory: "Elevadores", confidence: .94 },
  { terms: ["sabesp", "agua e saneamento", "saneamento"], direction: "expense", category: "Água", confidence: .96 },
  { terms: ["enel", "energia eletrica", "eletropaulo"], direction: "expense", category: "Energia", confidence: .96 },
  { terms: ["comgas", "gas natural"], direction: "expense", category: "Gás", confidence: .95 },
  { terms: ["seguro", "porto seguro", "tokio marine", "mapfre"], direction: "expense", category: "Seguros", confidence: .90 },
  { terms: ["limpeza", "faxina", "conservacao"], direction: "expense", category: "Limpeza", confidence: .88 },
  { terms: ["vigilancia", "portaria", "seguranca"], direction: "expense", category: "Segurança", confidence: .88 },
  { terms: ["folha", "salario", "ferias", "rescisao", "adiantamento"], direction: "expense", category: "Pessoal", confidence: .88 },
  { terms: ["fgts", "inss", "gps", "darf", "tributo"], direction: "expense", category: "Encargos e tributos", confidence: .91 },
  { terms: ["tarifa", "cesta", "manutencao conta", "taxa bancaria"], direction: "expense", category: "Tarifas bancárias", confidence: .93 },
  { terms: ["administradora", "honorarios", "honorario"], direction: "expense", category: "Honorários e administração", confidence: .82 },
  { terms: ["obra", "reforma", "impermeabilizacao", "pintura predial"], direction: "expense", category: "Obras", confidence: .84 },
  { terms: ["rendimento", "aplicacao", "resgate cdb", "juros aplicacao"], direction: "income", category: "Rendimentos", confidence: .86 },
  { terms: ["multa", "juros mora"], direction: "income", category: "Multas e juros", confidence: .82 },
  { terms: ["acordo"], direction: "income", category: "Acordos", confidence: .84 },
];

async function learnedRules(user: ContextUser, condominiumId: number) {
  const { data, error } = await supabaseAdmin.from("financial_category_rules")
    .select("id,pattern,direction,category,subcategory")
    .eq("user_id", user.accountOwnerId).eq("active", true)
    .or(`condominium_id.eq.${condominiumId},condominium_id.is.null`)
    .order("uses", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

function classifyOne(tx: ParsedTransaction, rules: any[]): Classification {
  const desc = normalize(tx.description);
  const learned = rules.find(rule => (!rule.direction || rule.direction === tx.direction) && desc.includes(normalize(rule.pattern)));
  if (learned) return { category: learned.category, subcategory: learned.subcategory || null, confidence: .99, source: "rule", needsReview: false };
  const fixed = RULES.find(rule => (!rule.direction || rule.direction === tx.direction) && rule.terms.some(term => desc.includes(term)));
  if (fixed) return { category: fixed.category, subcategory: fixed.subcategory || null, confidence: fixed.confidence, source: "system", needsReview: fixed.confidence < .78 };
  if (tx.direction === "income") return { category: "Outras receitas", subcategory: null, confidence: .45, source: "system", needsReview: true };
  return { category: "Outras despesas", subcategory: null, confidence: .40, source: "system", needsReview: true };
}

function fingerprint(tx: ParsedTransaction, ordinal: number) {
  return createHash("sha256").update(`${tx.postedAt}|${normalize(tx.description)}|${tx.amount.toFixed(2)}|${tx.externalId || ordinal}`).digest("hex");
}

function monthBounds(month: string) {
  if (!MONTH_RE.test(month)) throw new Error("Mês inválido");
  const [year, m] = month.split("-").map(Number);
  const next = m === 12 ? `${year + 1}-01-01` : `${year}-${String(m + 1).padStart(2, "0")}-01`;
  return { start: `${month}-01`, next };
}

async function statementById(user: ContextUser, id: number, write = false) {
  const { data, error } = await supabaseAdmin.from("financial_statements").select("*").eq("id", id).eq("user_id", user.accountOwnerId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Extrato não encontrado");
  await db.assertCondominium(access(user), Number(data.condominium_id), write);
  return data;
}

async function recalculateStatement(statement: any) {
  const { data: txs, error } = await supabaseAdmin.from("financial_transactions").select("amount,needs_review").eq("statement_id", statement.id);
  if (error) throw new Error(error.message);
  const movement = roundMoney((txs || []).reduce((sum, row: any) => sum + Number(row.amount), 0));
  const opening = statement.opening_balance == null ? null : Number(statement.opening_balance);
  const bankClosing = statement.bank_closing_balance == null ? null : Number(statement.bank_closing_balance);
  const calculated = opening == null ? null : roundMoney(opening + movement);
  const difference = calculated == null || bankClosing == null ? null : roundMoney(bankClosing - calculated);
  const reviewCount = (txs || []).filter((row: any) => row.needs_review).length;
  const status = difference != null && Math.abs(difference) < .01 && reviewCount === 0 ? "reconciled" : "review";
  const { error: updateError } = await supabaseAdmin.from("financial_statements").update({ calculated_closing_balance: calculated, reconciliation_difference: difference, transaction_count: txs?.length || 0, status }).eq("id", statement.id);
  if (updateError) throw new Error(updateError.message);
  return { movement, calculated, difference, reviewCount, status };
}

async function aiClassifyRows(rows: any[]) {
  const result = await structured<{ classifications: Array<{ id: number; category: string; subcategory: string | null; confidence: number }> }>({
    system: "Você classifica lançamentos bancários de condomínios no Brasil. Seja conservador. Não invente fatos. Use apenas descrição, direção e valor. Em dúvida, use Outras receitas ou Outras despesas com confiança baixa.",
    prompt: `Classifique os lançamentos. Categorias de despesa preferidas: Pessoal; Encargos e tributos; Água; Energia; Gás; Manutenção; Segurança; Limpeza; Seguros; Honorários e administração; Obras; Tarifas bancárias; Outras despesas. Categorias de receita: Cotas condominiais; Acordos; Multas e juros; Rendimentos; Outras receitas.\n\n${JSON.stringify(rows.map(row => ({ id: Number(row.id), description: row.description, direction: row.direction, amount: Math.abs(Number(row.amount)) })))}`,
    schema: {
      name: "condominium_finance_classification",
      schema: {
        type: "object", properties: { classifications: { type: "array", items: { type: "object", properties: { id: { type: "integer" }, category: { type: "string" }, subcategory: { type: ["string", "null"] }, confidence: { type: "number" } }, required: ["id", "category", "subcategory", "confidence"], additionalProperties: false } } }, required: ["classifications"], additionalProperties: false,
      },
    },
  });
  return result.classifications;
}

export const financeRouter = Router();
financeRouter.use(requireUser);

financeRouter.get("/", async (req: AuthRequest, res) => {
  try {
    const user = req.financeUser!;
    const condominiumId = Number(req.query.condominiumId || 0);
    const month = String(req.query.month || new Date().toISOString().slice(0, 7));
    if (!condominiumId) throw new Error("Selecione um condomínio");
    await db.assertCondominium(access(user), condominiumId, false);
    const { start, next } = monthBounds(month);

    const [{ data: transactions, error: txError }, { data: allStatements, error: stError }, { data: closing, error: clError }] = await Promise.all([
      supabaseAdmin.from("financial_transactions").select("*").eq("user_id", user.accountOwnerId).eq("condominium_id", condominiumId).gte("posted_at", start).lt("posted_at", next).order("posted_at").order("id"),
      supabaseAdmin.from("financial_statements").select("*").eq("user_id", user.accountOwnerId).eq("condominium_id", condominiumId).order("period_start", { ascending: false }).limit(50),
      supabaseAdmin.from("financial_closings").select("*").eq("user_id", user.accountOwnerId).eq("condominium_id", condominiumId).eq("period_month", start).maybeSingle(),
    ]);
    if (txError) throw new Error(txError.message); if (stError) throw new Error(stError.message); if (clError) throw new Error(clError.message);
    const statements = (allStatements || []).filter((row: any) => (!row.period_start || row.period_start < next) && (!row.period_end || row.period_end >= start));
    const txs = transactions || [];
    const income = roundMoney(txs.filter((t: any) => t.direction === "income").reduce((s: number, t: any) => s + Number(t.amount), 0));
    const expenses = roundMoney(Math.abs(txs.filter((t: any) => t.direction === "expense").reduce((s: number, t: any) => s + Number(t.amount), 0)));
    const reviewCount = txs.filter((t: any) => t.needs_review).length;
    const categoryMap = new Map<string, number>();
    txs.forEach((t: any) => categoryMap.set(t.category, roundMoney((categoryMap.get(t.category) || 0) + Math.abs(Number(t.amount)))));
    const categories = [...categoryMap.entries()].map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total);
    return res.json({ month, statements, transactions: txs, closing, summary: { income, expenses, net: roundMoney(income - expenses), reviewCount, transactionCount: txs.length, categories } });
  } catch (error) { return sendError(res, error); }
});

financeRouter.post("/import", async (req: AuthRequest, res) => {
  let uploadedKey: string | null = null;
  try {
    const user = req.financeUser!;
    const input = importSchema.parse(req.body);
    await db.assertCondominium(access(user), input.condominiumId, true);
    const buffer = Buffer.from(input.fileBase64, "base64");
    if (!buffer.length || buffer.length > MAX_FILE_BYTES) throw new Error("O extrato deve ter no máximo 20 MB.");
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    const duplicate = await supabaseAdmin.from("financial_statements").select("id,file_name").eq("user_id", user.accountOwnerId).eq("condominium_id", input.condominiumId).eq("sha256", sha256).maybeSingle();
    if (duplicate.error) throw new Error(duplicate.error.message);
    if (duplicate.data) throw new Error(`Este extrato já foi importado (#${duplicate.data.id}).`);

    const { format, parsed } = await parseStatement(buffer, input.fileName, input.mimeType);
    const rules = await learnedRules(user, input.condominiumId);
    uploadedKey = `${user.accountOwnerId}/${input.condominiumId}/${randomUUID()}-${sanitizeFileName(input.fileName)}`;
    const upload = await supabaseAdmin.storage.from(BUCKET).upload(uploadedKey, buffer, { contentType: input.mimeType || "application/octet-stream", upsert: false });
    if (upload.error) throw new Error(upload.error.message);

    const statementInsert = await supabaseAdmin.from("financial_statements").insert({
      user_id: user.accountOwnerId, condominium_id: input.condominiumId, uploaded_by: user.id,
      file_key: uploadedKey, file_name: input.fileName, mime_type: input.mimeType, size_bytes: buffer.length, sha256, source_format: format,
      bank_name: input.bankName || (parsed.metadata.bankId as string | null) || null,
      account_name: input.accountName || (parsed.metadata.accountId as string | null) || null,
      period_start: parsed.periodStart, period_end: parsed.periodEnd,
      opening_balance: parsed.openingBalance, bank_closing_balance: parsed.closingBalance,
      status: "imported", transaction_count: parsed.transactions.length, raw_metadata: parsed.metadata,
    }).select("*").single();
    if (statementInsert.error) throw new Error(statementInsert.error.message);
    const statement = statementInsert.data;

    const txRows = parsed.transactions.map((tx, index) => {
      const cls = classifyOne(tx, rules);
      return {
        statement_id: statement.id, user_id: user.accountOwnerId, condominium_id: input.condominiumId,
        posted_at: tx.postedAt, description: tx.description, normalized_description: normalize(tx.description), amount: tx.amount,
        direction: tx.direction, category: cls.category, subcategory: cls.subcategory, confidence: cls.confidence,
        classification_source: cls.source, needs_review: cls.needsReview, source_line: tx.sourceLine, external_id: tx.externalId || null,
        fingerprint: fingerprint(tx, index),
      };
    });
    for (let i = 0; i < txRows.length; i += 400) {
      const inserted = await supabaseAdmin.from("financial_transactions").insert(txRows.slice(i, i + 400));
      if (inserted.error) throw new Error(inserted.error.message);
    }
    const reconciliation = await recalculateStatement(statement);
    return res.status(201).json({ id: Number(statement.id), format, imported: txRows.length, reviewCount: reconciliation.reviewCount, periodStart: parsed.periodStart, periodEnd: parsed.periodEnd, reconciliation });
  } catch (error) {
    if (uploadedKey) await supabaseAdmin.storage.from(BUCKET).remove([uploadedKey]).catch(() => undefined);
    return sendError(res, error);
  }
});

financeRouter.patch("/statements/:id/balances", async (req: AuthRequest, res) => {
  try {
    const user = req.financeUser!;
    const id = Number(req.params.id); const input = balanceSchema.parse(req.body);
    const statement = await statementById(user, id, true);
    const { data, error } = await supabaseAdmin.from("financial_statements").update({ opening_balance: input.openingBalance, bank_closing_balance: input.bankClosingBalance }).eq("id", id).select("*").single();
    if (error) throw new Error(error.message);
    const reconciliation = await recalculateStatement(data);
    return res.json({ success: true, reconciliation });
  } catch (error) { return sendError(res, error); }
});

financeRouter.get("/statements/:id/file", async (req: AuthRequest, res) => {
  try {
    const user = req.financeUser!; const statement = await statementById(user, Number(req.params.id), false);
    if (!statement.file_key) throw new Error("Arquivo original não encontrado");
    const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(statement.file_key, 900);
    if (error || !data?.signedUrl) throw new Error(error?.message || "Não foi possível abrir o arquivo");
    return res.json({ url: data.signedUrl, fileName: statement.file_name, sha256: statement.sha256 });
  } catch (error) { return sendError(res, error); }
});

financeRouter.post("/statements/:id/classify", async (req: AuthRequest, res) => {
  try {
    const user = req.financeUser!; const statement = await statementById(user, Number(req.params.id), true);
    const { data: rows, error } = await supabaseAdmin.from("financial_transactions").select("id,description,direction,amount").eq("statement_id", statement.id).eq("needs_review", true).limit(250);
    if (error) throw new Error(error.message);
    if (!rows?.length) return res.json({ updated: 0 });
    let updated = 0;
    for (let i = 0; i < rows.length; i += 40) {
      const result = await aiClassifyRows(rows.slice(i, i + 40));
      for (const cls of result) {
        const confidence = Math.max(0, Math.min(1, Number(cls.confidence) || 0));
        const { error: updateError } = await supabaseAdmin.from("financial_transactions").update({ category: cls.category, subcategory: cls.subcategory, confidence, classification_source: "ai", needs_review: confidence < .78 }).eq("id", cls.id).eq("statement_id", statement.id);
        if (updateError) throw new Error(updateError.message); updated++;
      }
    }
    const reconciliation = await recalculateStatement(statement);
    return res.json({ updated, reviewCount: reconciliation.reviewCount });
  } catch (error) { return sendError(res, error); }
});

financeRouter.patch("/transactions/:id", async (req: AuthRequest, res) => {
  try {
    const user = req.financeUser!; const id = Number(req.params.id); const input = transactionUpdateSchema.parse(req.body);
    const found = await supabaseAdmin.from("financial_transactions").select("*,financial_statements(id)").eq("id", id).eq("user_id", user.accountOwnerId).maybeSingle();
    if (found.error) throw new Error(found.error.message); if (!found.data) throw new Error("Lançamento não encontrado");
    await db.assertCondominium(access(user), Number(found.data.condominium_id), true);
    const { error } = await supabaseAdmin.from("financial_transactions").update({ category: input.category, subcategory: input.subcategory || null, notes: input.notes || null, confidence: 1, classification_source: "manual", needs_review: false }).eq("id", id);
    if (error) throw new Error(error.message);
    if (input.learn) {
      const pattern = normalize(found.data.description).replace(/\b(pix|ted|doc|pagamento|compra|debito|credito)\b/g, " ").replace(/\b\d+\b/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
      if (pattern.length >= 4) {
        await supabaseAdmin.from("financial_category_rules").upsert({ user_id: user.accountOwnerId, condominium_id: found.data.condominium_id, pattern, direction: found.data.direction, category: input.category, subcategory: input.subcategory || null, created_by: user.id, active: true, uses: 1, last_used_at: new Date().toISOString() }, { onConflict: "user_id,condominium_id,pattern,direction" });
      }
    }
    const statement = await statementById(user, Number(found.data.statement_id), false);
    const reconciliation = await recalculateStatement(statement);
    return res.json({ success: true, reconciliation });
  } catch (error) { return sendError(res, error); }
});

financeRouter.post("/closing", async (req: AuthRequest, res) => {
  try {
    const user = req.financeUser!; const input = closingSchema.parse(req.body);
    await db.assertCondominium(access(user), input.condominiumId, true);
    const { start, next } = monthBounds(input.month);
    const [{ data: txs, error: txError }, { data: statements, error: stError }] = await Promise.all([
      supabaseAdmin.from("financial_transactions").select("statement_id,amount,direction,needs_review").eq("user_id", user.accountOwnerId).eq("condominium_id", input.condominiumId).gte("posted_at", start).lt("posted_at", next),
      supabaseAdmin.from("financial_statements").select("id,period_start,opening_balance,bank_closing_balance").eq("user_id", user.accountOwnerId).eq("condominium_id", input.condominiumId).order("period_start", { ascending: true }),
    ]);
    if (txError) throw new Error(txError.message); if (stError) throw new Error(stError.message);
    const monthStatements = (statements || []).filter((s: any) => !s.period_start || s.period_start < next);
    const openingSource = monthStatements.find((s: any) => s.opening_balance != null);
    const closingSource = [...monthStatements].reverse().find((s: any) => s.bank_closing_balance != null);
    const opening = openingSource ? Number(openingSource.opening_balance) : 0;
    const income = roundMoney((txs || []).filter((t: any) => t.direction === "income").reduce((s: number, t: any) => s + Number(t.amount), 0));
    const expenses = roundMoney(Math.abs((txs || []).filter((t: any) => t.direction === "expense").reduce((s: number, t: any) => s + Number(t.amount), 0)));
    const calculated = roundMoney(opening + income - expenses);
    const bankClosing = closingSource ? Number(closingSource.bank_closing_balance) : null;
    const difference = bankClosing == null ? null : roundMoney(bankClosing - calculated);
    const reviewCount = (txs || []).filter((t: any) => t.needs_review).length;
    const status = difference != null && Math.abs(difference) < .01 && reviewCount === 0 ? "reconciled" : "draft";
    const statementIds = [...new Set((txs || []).map((t: any) => Number(t.statement_id)))];
    const payload = { user_id: user.accountOwnerId, condominium_id: input.condominiumId, period_month: start, statement_ids: statementIds, opening_balance: opening, income_total: income, expense_total: expenses, calculated_closing_balance: calculated, bank_closing_balance: bankClosing, reconciliation_difference: difference, status, notes: input.notes || null };
    const { data, error } = await supabaseAdmin.from("financial_closings").upsert(payload, { onConflict: "user_id,condominium_id,period_month" }).select("*").single();
    if (error) throw new Error(error.message);
    return res.json({ closing: data, reviewCount });
  } catch (error) { return sendError(res, error); }
});

financeRouter.post("/closing/:id/close", async (req: AuthRequest, res) => {
  try {
    const user = req.financeUser!; const id = Number(req.params.id);
    const found = await supabaseAdmin.from("financial_closings").select("*").eq("id", id).eq("user_id", user.accountOwnerId).maybeSingle();
    if (found.error) throw new Error(found.error.message); if (!found.data) throw new Error("Fechamento não encontrado");
    await db.assertCondominium(access(user), Number(found.data.condominium_id), true);
    if (found.data.reconciliation_difference == null || Math.abs(Number(found.data.reconciliation_difference)) >= .01) throw new Error("O mês precisa estar conciliado até o centavo antes do fechamento.");
    const bounds = monthBounds(String(found.data.period_month).slice(0, 7));
    const review = await supabaseAdmin.from("financial_transactions").select("id", { count: "exact", head: true }).eq("user_id", user.accountOwnerId).eq("condominium_id", found.data.condominium_id).gte("posted_at", bounds.start).lt("posted_at", bounds.next).eq("needs_review", true);
    if (review.error) throw new Error(review.error.message); if ((review.count || 0) > 0) throw new Error("Ainda existem lançamentos que precisam de revisão.");
    const { data, error } = await supabaseAdmin.from("financial_closings").update({ status: "closed", closed_by: user.id, closed_at: new Date().toISOString() }).eq("id", id).select("*").single();
    if (error) throw new Error(error.message);
    return res.json({ closing: data });
  } catch (error) { return sendError(res, error); }
});
