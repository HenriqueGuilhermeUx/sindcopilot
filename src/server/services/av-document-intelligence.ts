import { ENV } from "../core/env";
import { serviceUnavailable } from "../core/errors";

export type AvDocumentType =
  | "auto" | "invoice" | "receipt" | "bill" | "expense" | "contract"
  | "bank_statement" | "financial_report" | "certificate" | "legal_document"
  | "fiscal_document" | "corporate_document" | "meeting_minutes" | "quotation"
  | "purchase_order" | "proof_of_payment" | "power_of_attorney"
  | "identity_document" | "medical_document" | "warranty" | "other";

export type AvDocumentIntelligenceResult = {
  documentId?: string;
  documentType?: string;
  confidence?: number;
  issuer?: string | null;
  recipient?: string | null;
  documentNumber?: string | null;
  dates?: Array<{ label?: string; value?: string }>;
  parties?: Array<{ role?: string; name?: string }>;
  amounts?: Array<{ currency?: string; raw?: string; value?: number }>;
  items?: Array<Record<string, unknown>>;
  identifiers?: Array<{ type?: string; value?: string }>;
  obligations?: Array<{ index?: number; text?: string }>;
  summary?: string;
  source?: { filename?: string | null; mimeType?: string | null; pages?: number; hash?: string };
  metadata?: Record<string, unknown>;
};

const SIND_TYPE_MAP: Record<string, AvDocumentType> = {
  nota_fiscal: "fiscal_document",
  recibo: "receipt",
  ordem_servico: "purchase_order",
  boleto: "invoice",
  ata: "meeting_minutes",
  convencao: "legal_document",
  regimento: "legal_document",
  contrato: "contract",
  laudo: "legal_document",
  outro: "auto",
};

export function avDocumentIntelligenceConfigured() {
  return Boolean(
    ENV.AV_DOCUMENT_INTELLIGENCE_ENABLED &&
    ENV.AV_DOCUMENT_INTELLIGENCE_KEY &&
    ENV.AV_DOCUMENT_INTELLIGENCE_URL,
  );
}

export function mapSindDocumentType(type?: string): AvDocumentType {
  return type ? (SIND_TYPE_MAP[type] || "auto") : "auto";
}

export async function analyzeWithAvDocumentIntelligence(input: {
  text: string;
  documentType?: AvDocumentType;
  fileName?: string;
  mimeType?: string;
  pages?: number;
}): Promise<AvDocumentIntelligenceResult> {
  if (!avDocumentIntelligenceConfigured()) {
    throw serviceUnavailable("AV Document Intelligence não configurado");
  }

  const text = String(input.text || "").trim();
  if (!text) throw serviceUnavailable("Documento sem texto utilizável para análise compartilhada");

  let response: Response;
  try {
    response = await fetch(ENV.AV_DOCUMENT_INTELLIGENCE_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-av-document-key": ENV.AV_DOCUMENT_INTELLIGENCE_KEY!,
      },
      body: JSON.stringify({
        consumer: "sindcopilot",
        intakeProvider: "auto",
        documentType: input.documentType || "auto",
        text,
        allowExternalProcessing: false,
        includeText: false,
        file: {
          name: input.fileName || "documento",
          mimeType: input.mimeType || "text/plain",
          pages: input.pages || 1,
        },
      }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    console.warn("[AV Document Intake transport]", error);
    throw serviceUnavailable("AV Document Intake temporariamente indisponível");
  }

  const payload = await response.json().catch(() => null) as any;
  if (!response.ok || !payload?.ok || !payload?.result) {
    console.warn("[AV Document Intake]", response.status, payload?.error || "invalid response");
    throw serviceUnavailable("AV Document Intake não retornou uma análise válida");
  }
  return payload.result as AvDocumentIntelligenceResult;
}

export function avResultToFinancialFields(result: AvDocumentIntelligenceResult) {
  const brlAmounts = (result.amounts || [])
    .filter(item => !item.currency || item.currency === "BRL")
    .map(item => Number(item.value))
    .filter(Number.isFinite);
  const total = brlAmounts.length ? Math.max(...brlAmounts) : null;
  const cnpj = (result.identifiers || []).find(item => item.type === "cnpj")?.value || null;
  const date = (result.dates || [])[0]?.value || null;
  const supplier = result.issuer ||
    (result.parties || []).find(item => ["fornecedor", "emitente", "contratada"].includes(String(item.role || "").toLowerCase()))?.name ||
    null;

  return {
    ocrSupplierName: supplier,
    ocrSupplierCnpj: cnpj,
    ocrValueCents: total == null ? null : Math.round(total * 100),
    ocrDate: date,
    ocrCategory: result.documentType || null,
    ocrSummary: result.summary || null,
  };
}
