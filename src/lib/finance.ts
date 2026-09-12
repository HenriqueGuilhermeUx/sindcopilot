import { supabase } from "@/lib/supabase";
import { apiUrl } from "@/lib/runtime";

export type FinanceStatement = {
  id: number;
  condominium_id: number;
  file_name: string;
  source_format: "csv" | "xlsx" | "ofx" | "pdf" | "manual";
  bank_name: string | null;
  account_name: string | null;
  period_start: string | null;
  period_end: string | null;
  opening_balance: number | string | null;
  bank_closing_balance: number | string | null;
  calculated_closing_balance: number | string | null;
  reconciliation_difference: number | string | null;
  status: "imported" | "review" | "reconciled" | "closed";
  transaction_count: number;
  created_at: string;
};

export type FinanceTransaction = {
  id: number;
  statement_id: number;
  condominium_id: number;
  posted_at: string;
  description: string;
  amount: number | string;
  direction: "income" | "expense";
  category: string;
  subcategory: string | null;
  confidence: number | string;
  classification_source: "system" | "rule" | "ai" | "manual";
  needs_review: boolean;
  source_line: number | null;
  external_id: string | null;
  notes: string | null;
};

export type FinanceClosing = {
  id: number;
  condominium_id: number;
  period_month: string;
  statement_ids: number[];
  opening_balance: number | string;
  income_total: number | string;
  expense_total: number | string;
  calculated_closing_balance: number | string;
  bank_closing_balance: number | string | null;
  reconciliation_difference: number | string | null;
  status: "draft" | "reconciled" | "closed";
  notes: string | null;
  closed_at: string | null;
};

export type FinanceDashboard = {
  month: string;
  statements: FinanceStatement[];
  transactions: FinanceTransaction[];
  closing: FinanceClosing | null;
  summary: {
    income: number;
    expenses: number;
    net: number;
    reviewCount: number;
    transactionCount: number;
    categories: Array<{ category: string; total: number }>;
  };
};

async function financeApi<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sua sessão expirou. Entre novamente.");
  const response = await fetch(apiUrl(`/api/finance${path}`), {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "Não foi possível concluir a operação financeira.");
  return payload;
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

export function loadFinance(condominiumId: number, month: string) {
  return financeApi<FinanceDashboard>(`/?condominiumId=${condominiumId}&month=${encodeURIComponent(month)}`);
}

export function importStatement(input: { condominiumId: number; fileBase64: string; fileName: string; mimeType: string; bankName?: string | null; accountName?: string | null }) {
  return financeApi<{ id: number; format: string; imported: number; reviewCount: number; periodStart: string | null; periodEnd: string | null; reconciliation: any }>("/import", { method: "POST", body: JSON.stringify(input) });
}

export function updateStatementBalances(id: number, openingBalance: number | null, bankClosingBalance: number | null) {
  return financeApi<{ success: true; reconciliation: any }>(`/statements/${id}/balances`, { method: "PATCH", body: JSON.stringify({ openingBalance, bankClosingBalance }) });
}

export function classifyStatement(id: number) {
  return financeApi<{ updated: number; reviewCount?: number }>(`/statements/${id}/classify`, { method: "POST", body: "{}" });
}

export function updateTransaction(id: number, input: { category: string; subcategory?: string | null; notes?: string | null; learn?: boolean }) {
  return financeApi<{ success: true; reconciliation: any }>(`/transactions/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function createClosing(condominiumId: number, month: string, notes?: string | null) {
  return financeApi<{ closing: FinanceClosing; reviewCount: number }>("/closing", { method: "POST", body: JSON.stringify({ condominiumId, month, notes: notes || null }) });
}

export function closePeriod(id: number) {
  return financeApi<{ closing: FinanceClosing }>(`/closing/${id}/close`, { method: "POST", body: "{}" });
}

export function getStatementFile(id: number) {
  return financeApi<{ url: string; fileName: string; sha256: string | null }>(`/statements/${id}/file`);
}
