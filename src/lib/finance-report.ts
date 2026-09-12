import { jsPDF } from "jspdf";
import type { FinanceDashboard } from "@/lib/finance";

function money(value: number | string | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
}

function date(value?: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function monthLabel(month: string) {
  const [year, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, m - 1, 1));
}

export function generateFinanceReport(input: {
  condominium: { name: string; address?: string | null; city?: string | null };
  dashboard: FinanceDashboard;
}) {
  const { condominium, dashboard } = input;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 14;
  const right = pageWidth - 14;
  let y = 16;

  const ensure = (needed = 12) => {
    if (y + needed <= pageHeight - 15) return;
    doc.addPage();
    y = 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`${condominium.name} • Balancete ${monthLabel(dashboard.month)}`, left, 9);
  };

  const rule = () => {
    doc.setDrawColor(210);
    doc.line(left, y, right, y);
    y += 4;
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("SindCopilot", left, y);
  doc.setFontSize(15);
  doc.text("Balancete financeiro", right, y, { align: "right" });
  y += 8;

  doc.setFontSize(12);
  doc.text(condominium.name, left, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(monthLabel(dashboard.month), right, y, { align: "right" });
  y += 5;
  const address = [condominium.address, condominium.city].filter(Boolean).join(" • ");
  if (address) { doc.text(address, left, y); y += 5; }
  rule();

  const closing = dashboard.closing;
  const opening = closing ? Number(closing.opening_balance) : Number(dashboard.statements.find(s => s.opening_balance != null)?.opening_balance || 0);
  const bankClosing = closing?.bank_closing_balance ?? dashboard.statements.slice().reverse().find(s => s.bank_closing_balance != null)?.bank_closing_balance ?? null;
  const calculated = closing ? Number(closing.calculated_closing_balance) : opening + dashboard.summary.net;
  const difference = bankClosing == null ? null : Number(bankClosing) - calculated;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Resumo do mês", left, y);
  y += 6;
  doc.setFontSize(9);
  const summaryRows = [
    ["Saldo inicial", money(opening)],
    ["Receitas", money(dashboard.summary.income)],
    ["Despesas", money(dashboard.summary.expenses)],
    ["Saldo calculado", money(calculated)],
    ["Saldo bancário", bankClosing == null ? "Não informado" : money(bankClosing)],
    ["Diferença de conciliação", difference == null ? "Pendente" : money(difference)],
  ];
  for (const [label, value] of summaryRows) {
    doc.setFont("helvetica", "normal");
    doc.text(label, left, y);
    doc.setFont("helvetica", "bold");
    doc.text(value, right, y, { align: "right" });
    y += 5;
  }
  y += 2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const status = closing?.status === "closed" ? "FECHADO" : difference != null && Math.abs(difference) < 0.01 && dashboard.summary.reviewCount === 0 ? "CONCILIADO" : "EM REVISÃO";
  doc.text(`Status: ${status} • ${dashboard.summary.transactionCount} lançamentos • ${dashboard.summary.reviewCount} pendentes de revisão`, left, y);
  y += 6;
  rule();

  ensure(18);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Receitas e despesas por categoria", left, y);
  y += 6;
  doc.setFontSize(8.5);
  for (const item of dashboard.summary.categories) {
    ensure(6);
    doc.setFont("helvetica", "normal");
    doc.text(item.category, left, y);
    doc.setFont("helvetica", "bold");
    doc.text(money(item.total), right, y, { align: "right" });
    y += 5;
  }
  y += 2;
  rule();

  ensure(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Lançamentos auditáveis", left, y);
  y += 6;
  doc.setFontSize(7.5);
  doc.text("Data", left, y);
  doc.text("Descrição / categoria", left + 23, y);
  doc.text("Valor", right, y, { align: "right" });
  y += 4;
  doc.setDrawColor(220);
  doc.line(left, y, right, y);
  y += 4;

  for (const tx of dashboard.transactions) {
    ensure(13);
    const descriptionLines = doc.splitTextToSize(tx.description, 102).slice(0, 2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(date(tx.posted_at), left, y);
    doc.text(descriptionLines, left + 23, y);
    doc.setFont("helvetica", "bold");
    doc.text(`${tx.direction === "expense" ? "-" : "+"} ${money(Math.abs(Number(tx.amount)))}`, right, y, { align: "right" });
    const descHeight = Math.max(1, descriptionLines.length) * 3.5;
    y += descHeight + 1;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    const audit = `${tx.category}${tx.subcategory ? ` › ${tx.subcategory}` : ""} • origem: extrato #${tx.statement_id}${tx.source_line ? `, linha ${tx.source_line}` : ""} • classificação: ${tx.classification_source}${tx.needs_review ? " • REVISAR" : ""}`;
    doc.text(doc.splitTextToSize(audit, 150)[0], left + 23, y);
    y += 5;
    doc.setDrawColor(235);
    doc.line(left + 23, y, right, y);
    y += 3;
  }

  ensure(22);
  rule();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Rastreabilidade", left, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(doc.splitTextToSize("Este balancete foi gerado pelo SindCopilot a partir dos extratos importados. Cada lançamento permanece vinculado ao arquivo de origem e à linha/transação correspondente. Classificações automáticas devem ser revisadas pelo responsável antes do fechamento definitivo.", right - left), left, y);
  y += 12;
  doc.text(`Gerado em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date())}.`, left, y);

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(`SindCopilot • ${condominium.name}`, left, pageHeight - 8);
    doc.text(`Página ${page} de ${pages}`, right, pageHeight - 8, { align: "right" });
  }

  const safeName = condominium.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  doc.save(`balancete-${safeName}-${dashboard.month}.pdf`);
}
